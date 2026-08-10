const state = { ports: [], selected: null };
const rows = document.querySelector('#rows');
const empty = document.querySelector('#empty');
const errorBox = document.querySelector('#error');
const refreshButton = document.querySelector('#refresh');
const search = document.querySelector('#search');
const dialog = document.querySelector('#confirm');
const approve = document.querySelector('#approve');

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
}

function render() {
  const query = search.value.trim().toLowerCase();
  const filtered = state.ports.filter(item => [item.port, item.pid, item.process, item.address, item.path].some(v => String(v ?? '').toLowerCase().includes(query)));
  rows.innerHTML = filtered.map(item => `
    <tr>
      <td><span class="port">:${escapeHtml(item.port)}</span></td>
      <td><div class="process"><span class="process-icon">${escapeHtml(item.process.charAt(0).toUpperCase())}</span><div><strong>${escapeHtml(item.process)}</strong><small title="${escapeHtml(item.path || '')}">${escapeHtml(item.path || 'Sistem süreci')}</small></div></div></td>
      <td><code>${escapeHtml(item.pid)}</code></td>
      <td><span class="address">${item.address === '::' || item.address === '0.0.0.0' ? 'Tüm arayüzler' : escapeHtml(item.address)}</span></td>
      <td><span class="listening"><i></i> Dinliyor</span></td>
      <td><button class="stop" ${item.isPortPilot ? 'disabled title="PortPilot kendi sürecini kapatamaz"' : ''} data-pid="${item.pid}" data-port="${item.port}">Durdur</button></td>
    </tr>`).join('');
  empty.classList.toggle('hidden', filtered.length > 0);
  document.querySelector('#summary').textContent = `${state.ports.length} dinlenen TCP portu bulundu`;
}

async function loadPorts() {
  refreshButton.disabled = true;
  refreshButton.classList.add('spinning');
  errorBox.classList.add('hidden');
  try {
    const response = await fetch('/api/ports');
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error);
    state.ports = data.ports;
    document.querySelector('#updated').textContent = `Son tarama: ${new Date(data.scannedAt).toLocaleTimeString('tr-TR')}`;
    render();
  } catch (error) {
    errorBox.textContent = `Portlar okunamadı: ${error.message}`;
    errorBox.classList.remove('hidden');
  } finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove('spinning');
  }
}

function toast(message, failed = false) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.className = `toast show ${failed ? 'failed' : ''}`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

rows.addEventListener('click', event => {
  const button = event.target.closest('.stop');
  if (!button || button.disabled) return;
  state.selected = state.ports.find(item => String(item.pid) === button.dataset.pid && String(item.port) === button.dataset.port);
  document.querySelector('#confirmText').textContent = `${state.selected.process} (PID ${state.selected.pid}) süreci ve alt süreçleri kapatılacak. :${state.selected.port} portu serbest bırakılacak.`;
  dialog.showModal();
});

approve.addEventListener('click', async event => {
  event.preventDefault();
  approve.disabled = true;
  approve.textContent = 'Durduruluyor…';
  try {
    const response = await fetch('/api/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid: state.selected.pid, port: state.selected.port }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error);
    dialog.close();
    toast(data.message);
    await loadPorts();
  } catch (error) {
    toast(error.message, true);
  } finally {
    approve.disabled = false;
    approve.textContent = 'Evet, durdur';
  }
});

search.addEventListener('input', render);
refreshButton.addEventListener('click', loadPorts);
loadPorts();
