Sen kıdemli bir full-stack SaaS geliştiricisi, ürün mimarı ve güvenlik odaklı yazılım mühendisisin.

Görevin, sıfırdan çalışan ve ticari ürüne dönüştürülebilecek bir **HTML to PDF SaaS web uygulaması** geliştirmektir.

Projenin geçici adı:

# HTML2PDF Pro

Amaç:

Kullanıcıların HTML kodunu, bir web sayfası URL’sini veya hazır şablonları profesyonel PDF dosyalarına dönüştürebildiği, ücretsiz ve ücretli üyelikleri bulunan, API üzerinden de kullanılabilen gelir üretebilir bir SaaS ürünü oluşturmak.

Bu proje yalnızca demo olmayacak. Çalışan, test edilebilir, güvenli, dağıtıma hazır bir MVP geliştirilecek.

---

# 1. Ürün kapsamı

Uygulama aşağıdaki dönüşüm yöntemlerini desteklemeli:

1. HTML kodu yapıştırarak PDF oluşturma
2. Herkese açık bir web sayfası URL’sini PDF’e dönüştürme
3. HTML dosyası yükleyerek PDF oluşturma
4. Hazır belge şablonlarından PDF oluşturma
5. API üzerinden HTML veya URL göndererek PDF oluşturma

Başlangıçtaki hazır şablonlar:

* Fatura
* Teklif formu
* Özgeçmiş
* Sertifika
* Rapor
* Sipariş özeti
* E-ticaret faturası
* Etkinlik bileti

---

# 2. Teknoloji yığını

Güncel, yaygın ve sürdürülebilir teknolojiler kullan.

Tercih edilen yapı:

## Frontend ve ana uygulama

* Next.js
* TypeScript
* App Router
* Tailwind CSS
* shadcn/ui
* React Hook Form
* Zod

## Backend

* Next.js Route Handlers veya ayrı servis gerekirse Node.js
* PostgreSQL
* Prisma ORM
* Redis tabanlı kuyruk sistemi
* BullMQ veya uygun bir job queue
* PDF üretimi için Playwright veya Puppeteer

## Kimlik doğrulama

* Auth.js veya güvenilir eşdeğer
* E-posta ve şifre ile üyelik
* Google ile giriş
* E-posta doğrulama
* Şifre sıfırlama

## Dosya depolama

* Geliştirme ortamında local storage
* Production ortamında S3 uyumlu storage
* Cloudflare R2, AWS S3 veya MinIO uyumlu yapı

## Ödeme

Ödeme sistemini soyutlanmış provider mimarisiyle kur.

İlk entegrasyon:

* Stripe

Ancak Türkiye pazarı için ileride aşağıdaki sağlayıcılardan biri kolayca eklenebilmeli:

* iyzico
* PayTR
* Paddle
* Lemon Squeezy

Ödeme sağlayıcısını doğrudan uygulamanın her yerine bağlama. PaymentProvider interface oluştur.

## Dağıtım

* Docker
* Docker Compose
* Production Dockerfile
* PostgreSQL
* Redis
* PDF worker servisi
* Web uygulaması

---

# 3. Ana kullanıcı akışı

Kullanıcı:

1. Ana sayfaya gelir.
2. HTML kodunu editöre yapıştırır veya URL girer.
3. Sağ tarafta canlı önizleme görür.
4. PDF ayarlarını seçer.
5. “PDF Oluştur” butonuna basar.
6. İşlem kuyruk sistemine alınır.
7. Kullanıcı işlem durumunu görür.
8. PDF tamamlandığında indirir.
9. İşlem geçmişi hesabına kaydedilir.
10. Kullanım kotasından bir hak düşülür.

Üye olmayan kullanıcıya sınırlı deneme hakkı ver.

Örnek:

* Üyeliksiz: günde 2 dönüşüm
* Ücretsiz üyelik: ayda 10 dönüşüm
* Pro: ayda 500 dönüşüm
* Business: ayda 5.000 dönüşüm
* Kurumsal: özel limit

Bu limitler kod içine gömülmemeli. Veritabanından veya plan konfigürasyonundan yönetilmeli.

---

# 4. PDF ayarları

Kullanıcı aşağıdaki ayarları değiştirebilmeli:

* Sayfa boyutu:

  * A4
  * A3
  * A5
  * Letter
  * Legal
  * Özel ölçü

* Sayfa yönü:

  * Dikey
  * Yatay

* Kenar boşlukları

* Üst bilgi

* Alt bilgi

* Sayfa numarası

* Arka plan grafikleri

* CSS media type:

  * screen
  * print

* Ölçek

* PDF dosya adı

* Bekleme süresi

* Sayfa tamamen yüklendi kriteri

* Font yükleme bekleme

* JavaScript çalıştırma izni

* Görsel kalite ayarları

Gelişmiş kullanıcılara özel:

* Custom CSS
* Header HTML
* Footer HTML
* Özel viewport
* Cookie tanımlama
* HTTP header tanımlama
* Basic authentication
* Print CSS kullanımı

Güvenlik nedeniyle bu gelişmiş seçeneklerin tamamı kontrollü ve doğrulanmış olmalı.

---

# 5. HTML editörü ve önizleme

HTML editörü için Monaco Editor veya CodeMirror kullan.

Desteklenecek özellikler:

* HTML syntax highlighting
* CSS syntax highlighting
* Kod formatlama
* Hata gösterimi
* Örnek HTML yükleme
* Editörü temizleme
* HTML şablonu kaydetme
* Canlı önizleme
* Masaüstü ve mobil önizleme
* Dark mode
* Kullanıcı kodunun ana uygulamadan izole edilmesi

Canlı önizleme sandbox edilmiş iframe içinde çalışmalı.

Kullanıcının HTML veya JavaScript kodu ana uygulamanın cookie, localStorage, session veya DOM alanına erişememeli.

---

# 6. URL’den PDF üretme

Kullanıcı herkese açık bir URL girebilmeli.

Ancak SSRF saldırılarına karşı güçlü koruma uygula.

Kesinlikle engellenmesi gereken hedefler:

* localhost
* 127.0.0.1
* 0.0.0.0
* ::1
* Özel ağ IP’leri
* 10.0.0.0/8
* 172.16.0.0/12
* 192.168.0.0/16
* Link-local adresler
* Cloud metadata servisleri
* file://
* ftp://
* data:
* javascript:
* Dahili container servis adları
* DNS rebinding saldırıları

URL yalnızca HTTP ve HTTPS olmalı.

DNS çözümlemesinden sonra IP tekrar doğrulanmalı.

Redirect zincirindeki her URL yeniden kontrol edilmeli.

Maksimum redirect sayısı belirlenmeli.

İstek timeout’u ve maksimum içerik boyutu bulunmalı.

---

# 7. PDF üretim mimarisi

PDF üretimini web request’i içinde senkron çalıştırma.

Aşağıdaki yapıyı kur:

1. Web uygulaması dönüşüm talebini alır.
2. Kullanım hakkını kontrol eder.
3. Veritabanında conversion job oluşturur.
4. Job Redis kuyruğuna eklenir.
5. Ayrı PDF worker işi alır.
6. İzole Chromium sürecinde PDF oluşturur.
7. Dosyayı storage’a yükler.
8. Job durumunu completed veya failed yapar.
9. Kullanıcıya indirme bağlantısı sunulur.
10. Gerekirse webhook gönderilir.

Job durumları:

* pending
* queued
* processing
* completed
* failed
* expired
* cancelled

Her iş için şunları tut:

* Kullanıcı
* Kaynak tipi
* Dosya adı
* PDF ayarları
* Başlangıç zamanı
* Bitiş zamanı
* İşlem süresi
* Dosya boyutu
* Hata kodu
* Hata mesajı
* Kullanılan kredi
* IP adresi
* API veya web üzerinden oluşturuldu bilgisi

---

# 8. Güvenlik

Bu bölüm kritik önemdedir.

Aşağıdaki önlemleri uygula:

* SSRF koruması
* XSS koruması
* CSRF koruması
* Rate limiting
* Input validation
* Dosya tipi doğrulama
* Dosya boyutu limiti
* HTML boyutu limiti
* URL uzunluğu limiti
* API key hashing
* Şifre hashing
* Signed download URL
* Kısa süreli dosya erişimi
* Kullanıcılar arası veri izolasyonu
* Sandbox edilmiş Chromium
* Worker resource limitleri
* CPU timeout
* Memory timeout
* Browser process cleanup
* Maksimum sayfa sayısı
* Maksimum PDF boyutu
* Audit log
* Hassas bilgilerin loglanmaması
* Environment variable doğrulama
* Production güvenlik header’ları
* Content Security Policy
* Secure cookie ayarları

Kullanıcı HTML’sini doğrudan uygulama sunucusunda render etme.

PDF worker mümkün olduğunca izole çalışmalı.

Chromium süreçleri işler tamamlandıktan sonra kesinlikle kapatılmalı.

Kullanıcının sonsuz döngü, ağır JavaScript, aşırı DOM veya devasa görsellerle sistemi kilitlemesini önle.

---

# 9. Kullanıcı paneli

Kullanıcı panelinde şu sayfalar olmalı:

## Dashboard

* Bu ay kullanılan dönüşüm sayısı
* Kalan kredi
* Toplam PDF
* Son dönüşümler
* Başarılı dönüşüm oranı
* Ortalama işlem süresi

## Yeni PDF oluştur

* HTML
* URL
* Dosya yükleme
* Şablondan oluşturma

## Geçmiş

* Tarih
* Dosya adı
* Kaynak tipi
* Durum
* Boyut
* İşlem süresi
* İndir
* Yeniden oluştur
* Sil

## Şablonlarım

* Yeni şablon oluştur
* Düzenle
* Kopyala
* Sil
* Varsayılan değişkenleri tanımla

## API anahtarları

* API key oluştur
* İsim ver
* Son kullanım zamanı
* Yetki kapsamı
* İptal et
* Key yalnızca oluşturulduğu anda tam gösterilsin

## Webhook ayarları

* Webhook URL
* Secret
* Aktif/pasif
* Başarılı işlem
* Başarısız işlem
* Test webhook gönder

## Faturalandırma

* Mevcut plan
* Kullanım
* Plan yükseltme
* Faturalar
* Abonelik iptali

## Hesap

* Profil
* Şifre
* Oturumlar
* Hesabı sil

---

# 10. API ürünü

Uygulama ticari bir API sunmalı.

Endpoint örnekleri:

* POST /api/v1/conversions
* GET /api/v1/conversions/:id
* GET /api/v1/conversions
* DELETE /api/v1/conversions/:id
* GET /api/v1/files/:id
* POST /api/v1/webhooks/test

POST /api/v1/conversions isteği şu tipleri desteklesin:

* html
* url
* template

Örnek payload:

{
"sourceType": "html",
"html": "<html>...</html>",
"options": {
"format": "A4",
"landscape": false,
"printBackground": true,
"margin": {
"top": "20mm",
"right": "15mm",
"bottom": "20mm",
"left": "15mm"
}
},
"fileName": "invoice.pdf",
"webhookUrl": "https://example.com/webhook"
}

API cevapları standartlaştırılmalı.

Başarılı cevap örneği:

{
"success": true,
"data": {
"id": "conversion_id",
"status": "queued"
}
}

Hata cevabı:

{
"success": false,
"error": {
"code": "LIMIT_EXCEEDED",
"message": "Monthly conversion limit exceeded."
}
}

API için:

* API key authentication
* Per-key rate limit
* Per-plan limit
* Idempotency key
* Request logging
* API usage metrikleri
* Açıklayıcı hata kodları
* OpenAPI dokümantasyonu
* Swagger veya API docs sayfası

hazırla.

---

# 11. Şablon sistemi

Şablonlar değişken desteklemeli.

Örnek:

{{customer.name}}
{{invoice.number}}
{{invoice.date}}
{{items}}
{{total}}

Güvenli bir template engine kullan.

Kullanıcılar:

* Kendi HTML şablonlarını oluşturabilmeli
* JSON veri göndererek PDF üretebilmeli
* Şablon önizlemesi yapabilmeli
* Şablon versiyonlarını saklayabilmeli

Template injection risklerine karşı önlem al.

İlk sürümde karmaşık kod çalıştırmaya izin verme.

---

# 12. Abonelik ve gelir modeli

Planları konfigürasyon tabanlı oluştur:

## Free

* Ayda 10 PDF
* Maksimum 2 MB HTML
* Maksimum 5 MB PDF
* Filigran
* Düşük öncelikli kuyruk
* API erişimi yok
* Dosyalar 24 saat saklanır

## Pro

* Ayda 500 PDF
* Filigran yok
* API erişimi
* Öncelikli kuyruk
* 30 gün dosya saklama
* Özel CSS
* Header ve footer
* Webhook

## Business

* Ayda 5.000 PDF
* Birden fazla API key
* Ekip üyeleri
* Daha yüksek rate limit
* 90 gün dosya saklama
* Özel şablonlar
* Marka kaldırma
* Kullanım analitiği

## Enterprise

* Özel fiyat
* Yüksek hacim
* Dedicated worker
* SLA
* On-premise seçeneği
* Özel saklama politikası

Ek gelir modeli:

* Ek PDF kredi paketi
* Yüksek öncelikli işlem paketi
* Uzun süreli dosya saklama
* White-label kullanım
* Özel domain
* Takım üyeliği
* Hazır premium şablon satışı

Plan özelliklerini kod içine dağınık şekilde yazma.

Plan ve entitlement sistemi oluştur.

---

# 13. Filigran sistemi

Free planda oluşturulan PDF’lere küçük ve profesyonel bir filigran ekle:

“Generated with HTML2PDF Pro”

Filigran:

* Sayfa altına yerleştirilmeli
* İçeriği kapatmamalı
* Tüm sayfalarda görünmeli
* Ücretli planlarda olmamalı

---

# 14. Admin paneli

Sadece admin rolü erişebilmeli.

Admin panelinde:

* Kullanıcı listesi
* Planlar
* Abonelikler
* Dönüşüm sayıları
* Başarısız işler
* Worker durumu
* Kuyruk uzunluğu
* Sistem hataları
* API kullanımı
* Gelir metrikleri
* Kullanıcı engelleme
* Kullanıcı limitini manuel değiştirme
* Kupon tanımlama
* Plan oluşturma ve düzenleme
* Hazır şablon yönetimi
* Sistem duyuruları

bulunsun.

Admin aksiyonları audit log’a kaydedilmeli.

---

# 15. Landing page

Modern, güven veren ve sade bir SaaS landing page tasarla.

Bölümler:

1. Hero
2. Hızlı HTML to PDF demo alanı
3. Kullanım alanları
4. Özellikler
5. API örneği
6. Şablonlar
7. Güvenlik
8. Fiyatlandırma
9. Sık sorulan sorular
10. CTA
11. Footer

Ana mesaj örneği:

“HTML, URL ve şablonlarınızı saniyeler içinde profesyonel PDF dosyalarına dönüştürün.”

Hedef kullanıcılar:

* Yazılım geliştiriciler
* E-ticaret işletmeleri
* Muhasebe yazılımları
* ERP ve CRM geliştiricileri
* Ajanslar
* Freelancerlar
* İnsan kaynakları ekipleri
* Otomatik raporlama sistemi geliştiren şirketler

Landing page yalnızca güzel görünmemeli. Dönüşüm odaklı olmalı.

CTA’lar:

* Ücretsiz Dene
* API’yi İncele
* İlk PDF’ini Oluştur
* Şablonları Gör

---

# 16. SEO

Aşağıdaki sayfaları oluştur:

* /html-to-pdf
* /url-to-pdf
* /html-to-pdf-api
* /invoice-to-pdf
* /webpage-to-pdf
* /pdf-templates
* /pricing
* /docs

SEO özellikleri:

* Metadata
* Open Graph
* Twitter cards
* Sitemap
* robots.txt
* Canonical URL
* Schema.org structured data
* FAQ schema
* SoftwareApplication schema
* Hızlı sayfa yükleme
* Semantik HTML

Başlangıç içerik dili Türkçe olsun.

Altyapıyı çoklu dil desteğine hazırla.

İkinci dil İngilizce olacak.

---

# 17. E-posta sistemi

Aşağıdaki e-postalar için şablonlar oluştur:

* Hoş geldiniz
* E-posta doğrulama
* Şifre sıfırlama
* PDF işlemi tamamlandı
* PDF işlemi başarısız
* Kullanım limitinin yüzde 80’i doldu
* Kullanım limiti doldu
* Ödeme başarılı
* Ödeme başarısız
* Abonelik iptal edildi
* Deneme süresi bitiyor

E-posta sağlayıcısını soyutla.

Resend, Postmark veya SMTP uyumlu olmalı.

---

# 18. Veritabanı modeli

En az aşağıdaki modelleri tasarla:

* User
* Account
* Session
* VerificationToken
* Organization
* OrganizationMember
* Subscription
* Plan
* PlanFeature
* UsageRecord
* Conversion
* ConversionFile
* Template
* TemplateVersion
* ApiKey
* WebhookEndpoint
* WebhookDelivery
* Payment
* Invoice
* AuditLog
* AdminAction
* Coupon

Prisma schema oluştur.

Gerekli index, unique constraint ve foreign key yapılarını ekle.

Soft delete gereken tablolarda deletedAt kullan.

---

# 19. Kullanım ölçümü

Kullanım sistemi yarış koşullarına karşı güvenli olmalı.

Aynı anda birden fazla istek geldiğinde kullanıcı limitinin aşılması engellenmeli.

Transaction veya atomic increment yaklaşımı kullan.

Kullanım ölçümleri:

* Dönüşüm sayısı
* İşlenen HTML boyutu
* Oluşturulan PDF boyutu
* Worker süresi
* API istek sayısı
* Storage kullanımı
* Başarısız dönüşümler

---

# 20. Dosya saklama politikası

Planlara göre dosyaların ne kadar süre saklanacağını belirle.

Cron veya scheduled job ile süresi dolan dosyaları:

* Storage’dan sil
* Veritabanında expired yap
* Signed download URL’lerini geçersiz kıl

Kullanıcı dosyasını manuel olarak da silebilmeli.

Gizlilik açısından ham HTML içeriği mümkün olduğunca uzun süre saklanmamalı.

Varsayılan olarak kaynak HTML iş tamamlandıktan sonra silinebilmeli veya şifreli saklanmalı.

---

# 21. Testler

Aşağıdaki testleri yaz:

## Unit test

* Plan limitleri
* Entitlement kontrolü
* URL validation
* SSRF koruması
* API key doğrulama
* Dosya adı temizleme
* PDF options validation
* Template rendering
* Webhook signature

## Integration test

* Conversion oluşturma
* Kuyruğa iş gönderme
* Worker sonucu
* Kullanım kotası düşme
* Başarısız işlerin geri alınması
* Dosya indirme yetkisi
* Payment webhook

## End-to-end test

* Kayıt
* Giriş
* HTML’den PDF oluşturma
* URL’den PDF oluşturma
* Geçmişten PDF indirme
* Plan yükseltme
* API key oluşturma

Test araçları:

* Vitest veya Jest
* Playwright

---

# 22. Gözlemlenebilirlik

Aşağıdaki yapıları hazırla:

* Structured logging
* Request ID
* Job ID
* Error tracking
* Health check endpoint
* Readiness endpoint
* Worker health
* Queue metrics
* Başarısız job retry
* Dead-letter queue
* Kritik hata logları

Endpoint örnekleri:

* /api/health
* /api/ready
* /api/metrics

Hassas kullanıcı verilerini loglama.

---

# 23. Hata yönetimi

Kullanıcıya teknik stack trace gösterme.

Anlaşılır hata mesajları oluştur.

Örnek hata kodları:

* INVALID_HTML
* INVALID_URL
* PRIVATE_NETWORK_URL
* PAGE_LOAD_TIMEOUT
* PDF_GENERATION_FAILED
* FILE_TOO_LARGE
* USAGE_LIMIT_EXCEEDED
* RATE_LIMIT_EXCEEDED
* INVALID_API_KEY
* PAYMENT_REQUIRED
* STORAGE_ERROR
* WORKER_UNAVAILABLE

Her hatanın:

* Kullanıcı mesajı
* Internal mesajı
* HTTP status code’u
* Retry edilebilir olup olmadığı

tanımlı olsun.

---

# 24. Tasarım

Tasarım:

* Profesyonel
* Minimal
* Modern
* Güvenilir
* Mobil uyumlu
* B2B SaaS görünümünde
* Abartılı animasyondan uzak
* Erişilebilir

Destek:

* Light mode
* Dark mode
* Klavye erişimi
* WCAG uyumlu kontrast
* Loading skeleton
* Empty state
* Error state
* Success state
* Toast bildirimleri

---

# 25. Proje klasör yapısı

Temiz ve ölçeklenebilir klasör yapısı oluştur.

Örnek:

apps/
web/
worker/

packages/
database/
pdf-engine/
queue/
storage/
payments/
auth/
email/
shared/
config/

docker/
docs/

Monorepo yaklaşımı uygunsa Turborepo kullan.

Ancak gereksiz karmaşıklık üretme.

İlk sürüm tek repository içinde rahat geliştirilebilir ve dağıtılabilir olmalı.

---

# 26. Geliştirme aşamaları

Projeyi tek seferde kontrolsüz biçimde üretme.

Aşağıdaki aşamalarla ilerle:

## Aşama 1 — Analiz ve mimari

Önce:

* Ürün gereksinimlerini özetle
* Teknik kararları açıkla
* Güvenlik risklerini listele
* Klasör yapısını öner
* Veritabanı modelini çıkar
* Uygulama akışını çiz
* MVP sınırlarını netleştir

Ardından repository’yi incele.

Repository boşsa başlangıç yapısını oluştur.

## Aşama 2 — Temel altyapı

* Next.js
* TypeScript
* Tailwind
* Database
* Authentication
* Docker
* Environment variables
* Lint
* Format
* Test setup

## Aşama 3 — PDF motoru

* HTML input
* PDF worker
* Queue
* Playwright/Puppeteer
* Storage
* Job status

## Aşama 4 — Kullanıcı paneli

* Dashboard
* Conversion ekranı
* History
* Download

## Aşama 5 — API

* API key
* Conversion endpoints
* Rate limit
* API docs

## Aşama 6 — Monetizasyon

* Planlar
* Limitler
* Stripe
* Checkout
* Subscription
* Billing portal

## Aşama 7 — Admin ve üretim hazırlığı

* Admin panel
* Audit log
* Monitoring
* Testler
* Security hardening
* Deployment docs

Her aşamadan sonra:

* Değiştirilen dosyaları listele
* Uygulanan kararları özetle
* Test sonuçlarını ver
* Bilinen eksikleri belirt
* Bir sonraki aşamayı yaz

Ancak benden her küçük dosya için onay isteme.

Makul kararları kendin ver ve ilerle.

---

# 27. MVP öncelikleri

İlk çalışan sürümde mutlaka bulunması gerekenler:

1. Kullanıcı kaydı ve girişi
2. HTML yapıştırarak PDF oluşturma
3. URL’den PDF oluşturma
4. PDF ayarları
5. Kuyruk ve ayrı worker
6. Conversion history
7. PDF indirme
8. Ücretsiz kullanım limiti
9. Pro plan
10. Stripe test mode
11. API key
12. API üzerinden PDF oluşturma
13. SSRF koruması
14. Rate limiting
15. Docker Compose
16. README
17. Temel testler

İlk sürümde ertelenebilecekler:

* Takım üyeleri
* White-label
* Premium template marketplace
* Enterprise panel
* Çok gelişmiş analitik
* On-premise kurulum
* Birden fazla ödeme sağlayıcısı

Bu ertelenen maddeler için mimari hazırlık yap ancak MVP’yi gereksiz yere büyütme.

---

# 28. Kod kalitesi kuralları

* TypeScript strict mode
* any kullanma
* Magic number kullanma
* Input’ları Zod ile doğrula
* Business logic’i UI bileşenlerine gömme
* Tekrarlı kod yazma
* Büyük dosyaları böl
* Servis katmanı kullan
* Environment variable’ları merkezi doğrula
* Database işlemlerinde uygun transaction kullan
* Güvenlik kontrollerini yalnızca frontend’e bırakma
* Error handling’i merkezi hale getir
* Fonksiyon ve sınıf isimlerini açık seç
* Gereksiz yorum yazma
* Kritik güvenlik kararlarını açıklayan kısa yorumlar ekle

---

# 29. README

README aşağıdakileri içermeli:

* Proje açıklaması
* Özellikler
* Mimari
* Gereksinimler
* Local kurulum
* Environment variables
* Docker ile çalıştırma
* Database migration
* Seed
* Test çalıştırma
* Worker çalıştırma
* Stripe test kurulumu
* API kullanımı
* Production deployment
* Güvenlik notları
* Bilinen sınırlamalar
* Yol haritası

.env.example oluştur.

Gerçek secret değerlerini repository’ye yazma.

---

# 30. Başarı kriterleri

Proje ancak aşağıdaki şartlarda tamamlanmış kabul edilir:

* Kullanıcı kayıt olabilir.
* Giriş yapabilir.
* HTML’den PDF oluşturabilir.
* URL’den PDF oluşturabilir.
* PDF ayrı worker tarafından üretilir.
* İşlem durumu takip edilir.
* Oluşturulan PDF indirilebilir.
* Dönüşüm geçmişi görüntülenebilir.
* Kullanım limiti çalışır.
* Ücretsiz plan filigran ekler.
* Stripe test ödeme akışı çalışır.
* Pro plana geçiş kullanım limitini değiştirir.
* API key oluşturulabilir.
* API üzerinden dönüşüm başlatılabilir.
* SSRF testleri geçer.
* Rate limiting çalışır.
* Docker Compose ile sistem ayağa kalkar.
* Temel unit, integration ve E2E testleri geçer.
* README ile başka bir geliştirici projeyi çalıştırabilir.

---

# 31. Çalışma yöntemi

Önce mevcut repository’yi ayrıntılı biçimde incele.

Mevcut dosyaları, package manager’ı, framework’ü ve konfigürasyonu tespit et.

Var olan çalışan yapıyı sebepsiz yere bozma.

Eksik veya hatalı mimari varsa düzelt.

Önce analiz raporu ve uygulama planı oluştur.

Ardından doğrudan kodlamaya başla.

Sadece tavsiye verme; gerekli dosyaları gerçekten oluştur ve değiştir.

Terminal komutlarını çalıştır.

Bağımlılıkları kur.

Migration’ları oluştur.

Testleri çalıştır.

Hataları çöz.

Mock veya placeholder bırakılan yerleri açıkça belirt.

Gerçekte tamamlanmamış özelliği tamamlanmış gibi gösterme.

Özellikle ödeme, güvenlik, URL doğrulama ve worker izolasyonu konularında sahte veya yüzeysel uygulama yapma.

Başlangıçta ücretsiz veya düşük maliyetli şekilde çalışabilecek bir yapı kur.

Ancak mimari, kullanıcı ve işlem hacmi arttığında ölçeklenebilir olsun.

Şimdi önce repository analizi, risk analizi, MVP kapsamı, teknik mimari ve uygulanacak dosya planıyla başla. Ardından ilk çalışan sürümü geliştirmeye geç.
