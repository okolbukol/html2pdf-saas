# Project Instructions

* docs/PRODUCT_SPEC.md bu projenin bağlayıcı ürün ve teknik spesifikasyonudur.
* Her görevden önce PRODUCT_SPEC.md içindeki görevle ilgili bölümler okunmalıdır.
* Kullanıcının mevcut görev mesajı, PRODUCT_SPEC.md ile çelişmediği sürece uygulanacak aktif kapsamı belirler.
* MVP dışındaki özellikler açıkça istenmedikçe uygulanmamalıdır.
* Mevcut çalışan yapı, gerekçe olmadan yeniden yazılmamalıdır.
* Güvenlik kontrolleri yalnızca frontend tarafında bırakılmamalıdır.
* URL’den PDF üretiminde SSRF koruması zorunludur.
* PDF üretimi web request’i içinde senkron çalıştırılmamalı; ayrı worker ve queue mimarisi kullanılmalıdır.
* Ödeme, kullanım kotası, API key ve yetkilendirme kontrolleri backend tarafında doğrulanmalıdır.
* Secret değerleri repository’ye yazılmamalıdır.
* Tamamlanmamış, mock veya placeholder özellikler tamamlanmış gibi raporlanmamalıdır.
* TypeScript strict mode kullanılmalı ve gerekçesiz any kullanımından kaçınılmalıdır.
* Her görev sonunda:

  * değiştirilen dosyalar,
  * çalıştırılan komutlar,
  * test sonuçları,
  * bilinen eksikler,
  * güvenlik veya mimari riskler,
  * önerilen sonraki aşama
    açıkça raporlanmalıdır.
* Küçük uygulama kararları için sürekli kullanıcı onayı istenmemeli; güvenli ve makul varsayımlarla ilerlenmelidir.
* Ancak veri kaybı, geri döndürülemez işlem, gerçek ödeme veya production deployment gerektiren işlemler açık talimat olmadan yapılmamalıdır.
