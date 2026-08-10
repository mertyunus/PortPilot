'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const HOST = '127.0.0.1';
const APP_PORT = Number(process.env.PORTPILOT_PORT || 47821);
const PUBLIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function runPowerShell(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 10000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => error ? reject(new Error(stderr.trim() || error.message)) : resolve(stdout.trim()));
  });
}

async function getPorts() {
  const script = `
    $ErrorActionPreference = 'Stop'
    $items = Get-NetTCPConnection -State Listen | ForEach-Object {
      $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
      [PSCustomObject]@{
        port = $_.LocalPort
        address = $_.LocalAddress
        pid = $_.OwningProcess
        process = if ($p) { $p.ProcessName } else { 'Bilinmiyor' }
        path = if ($p) { try { $p.Path } catch { $null } } else { $null }
        startedAt = if ($p) { try { $p.StartTime.ToString('o') } catch { $null } } else { $null }
      }
    }
    @($items | Sort-Object port, pid -Unique) | ConvertTo-Json -Compress
  `;
  const output = await runPowerShell(script);
  if (!output) return [];
  const parsed = JSON.parse(output);
  return (Array.isArray(parsed) ? parsed : [parsed]).map(item => ({
    ...item,
    isPortPilot: Number(item.pid) === process.pid || Number(item.port) === APP_PORT
  }));
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/ports') {
    try {
      return json(res, 200, { ports: await getPorts(), scannedAt: new Date().toISOString() });
    } catch (error) {
      return json(res, 500, { error: 'Portlar okunamadı.', detail: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/api/stop') {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 2048) req.destroy();
    });
    req.on('end', async () => {
      try {
        const { pid, port } = JSON.parse(raw || '{}');
        const numericPid = Number(pid);
        const numericPort = Number(port);
        if (!Number.isInteger(numericPid) || numericPid <= 4 || !Number.isInteger(numericPort)) {
          return json(res, 400, { error: 'Geçersiz PID veya port.' });
        }
        if (numericPid === process.pid || numericPort === APP_PORT) {
          return json(res, 400, { error: 'PortPilot kendi sürecini durduramaz.' });
        }

        const current = await getPorts();
        if (!current.some(item => Number(item.pid) === numericPid && Number(item.port) === numericPort)) {
          return json(res, 409, { error: 'Bu PID artık belirtilen portu dinlemiyor. Listeyi yenileyin.' });
        }

        await new Promise((resolve, reject) => {
          execFile('taskkill.exe', ['/PID', String(numericPid), '/T', '/F'], { windowsHide: true, timeout: 10000 },
            (error, stdout, stderr) => error ? reject(new Error(stderr.trim() || stdout.trim() || error.message)) : resolve());
        });
        return json(res, 200, { ok: true, message: `PID ${numericPid} durduruldu.` });
      } catch (error) {
        return json(res, 500, { error: 'Süreç durdurulamadı.', detail: error.message });
      }
    });
    return;
  }

  json(res, 404, { error: 'Bulunamadı.' });
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.resolve(PUBLIC_DIR, `.${requestPath}`);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  serveStatic(req, res);
});

server.listen(APP_PORT, HOST, () => {
  console.log(`\n  PortPilot hazır: http://${HOST}:${APP_PORT}\n  Kapatmak için Ctrl+C\n`);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${APP_PORT} kullanımda. PORTPILOT_PORT ortam değişkeniyle farklı bir port seçin.`);
  else console.error(error.message);
  process.exit(1);
});
