// Cloudflare Pages: depo kökü build'siz yayınlandığı için iç dosyalar (veritabanı şeması, sunucu fonksiyonu
// kaynakları, testler, betikler, Claude notları) de herkese açık oluyordu. Bu ara katman yalnızca o yollara
// 404 döner, diğer her isteği olduğu gibi geçirir. Hangi isteklerde çalıştığını _routes.json ve site/_routes.json
// sınırlar (diğer istekler bu koda hiç uğramaz). Yeni bir iç klasör eklersen üç dosyaya da yaz.
const HIDDEN = /^\/(supabase|tests|scripts|functions)(\/|$)|^\/(claude|readme[^/]*)\.md$/i;

export async function onRequest({ request, next }) {
  if (!HIDDEN.test(new URL(request.url).pathname)) return next();
  return new Response("Bulunamadı", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}
