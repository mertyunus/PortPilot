# PortPilot 🚦

Projeler üzerinde çalışırken `npm run dev` dersin, başka bir terminalde API'yi ayağa kaldırırsın, sonra bir bakmışsın hangi portu neyin kullandığı belli değil. PortPilot tam olarak bu küçük ama sinir bozucu problemi çözmek için ortaya çıktı.

Bilgisayarında dinlemede olan TCP portlarını tek ekranda gösterir. Portun hangi sürece ait olduğunu görebilir, PID veya uygulama adına göre arama yapabilir ve artık ihtiyacın olmayan süreci tek tıkla kapatabilirsin.

Her şey kendi bilgisayarında çalışır; herhangi bir uzak sunucuya veri göndermez.

## Neler yapabiliyor?

- Aktif TCP portlarını listeler
- Portu kullanan uygulamanın adını, PID'sini ve dosya yolunu gösterir
- Port, PID veya process adına göre arama yapar
- Seçtiğin süreci ve ona bağlı alt süreçleri durdurur
- Bir süreci kapatmadan önce port–PID eşleşmesini yeniden kontrol eder
- Kendi sürecini ve kritik Windows sistem süreçlerini yanlışlıkla kapatmanı engeller
- Ek bir npm paketi veya veritabanı gerektirmez

## Başlarken

Bilgisayarında **Node.js 18 veya üzeri** kurulu olması yeterli.

```powershell
git clone https://github.com/mertyunus/PortPilot.git
cd PortPilot
npm start
```

Terminalde aşağıdaki mesajı gördüğünde uygulama hazırdır:

```text
PortPilot hazır: http://127.0.0.1:47821
```

Bu adresi tarayıcıda açıp kullanmaya başlayabilirsin. Uygulamayı kapatmak için çalıştığı terminalde `Ctrl+C` tuşlarına basman yeterli.

## Farklı bir portta çalıştırmak

PortPilot varsayılan olarak `47821` portunu kullanır. O port zaten doluysa çalıştırmadan önce başka bir port seçebilirsin:

```powershell
$env:PORTPILOT_PORT=47822
npm start
```

## Nasıl çalışıyor?

PortPilot, Windows'un `Get-NetTCPConnection` komutundan aldığı dinleme bilgilerini process detaylarıyla birleştirir. Arayüz ise bağımlılık kullanmayan küçük bir Node.js HTTP sunucusu üzerinden servis edilir.

```text
PortPilot/
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── server.js
└── package.json
```

## Güvenlikle ilgili birkaç not

PortPilot yalnızca `127.0.0.1` adresinde dinler, yani yerel ağındaki diğer cihazlara açılmaz. Bir süreci durdurma isteği geldiğinde PID'nin hâlâ seçilen portu kullandığını tekrar doğrular. PortPilot'ın kendi süreci ve Windows'un kritik sistem PID'leri de arayüzden kapatılamaz.

Bazı yönetici veya sistem süreçlerini durdurmak için terminali **Yönetici olarak çalıştırman** gerekebilir. Tanımadığın bir süreci kapatmadan önce ne işe yaradığını kontrol etmek her zaman iyi fikir.

## Katkıda bulunmak istersen

Bir hata bulduysan issue açabilir, aklında güzel bir geliştirme varsa pull request gönderebilirsin. Küçük fikirler de gayet kıymetli — sonuçta bu proje de unutulan birkaç localhost süreci yüzünden başladı. 🙂

## Lisans

Bu proje [MIT lisansı](LICENSE) ile sunulmaktadır.
