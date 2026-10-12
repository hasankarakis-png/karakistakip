// Kullanım (kendi bilgisayarınızda, Node.js 18+):
//   npm i @supabase/supabase-js
//   export SUPABASE_URL="https://PROJE-KODU.supabase.co"
//   export SECRET_KEY="sb_secret_... anahtarı"   # ASLA index.html'e veya internete koymayın
//   node scripts/create-users.mjs koc hasan "GucluBirSifre123" "Hasan Karakış"
//   node scripts/create-users.mjs ogrenciler ogrenciler.txt      # her satırda bir "Ad Soyad"
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { randomInt } from "crypto";

const url = process.env.SUPABASE_URL, key = process.env.SECRET_KEY || process.env.SERVICE_ROLE_KEY;
if (!url || !key) { console.error("SUPABASE_URL ve SECRET_KEY gerekli"); process.exit(1); }
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const DOMAIN = "@takip.karakis.app";
const slug = s => s.toLocaleLowerCase("tr").replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u").replace(/[^a-z0-9]/g,"");

async function create(username, password, name, role) {
  const { data, error } = await admin.auth.admin.createUser({ email: username + DOMAIN, password, email_confirm: true });
  if (error) throw new Error(username + ": " + error.message);
  const { error: e2 } = await admin.from("profiles").insert({ id: data.user.id, name, role });
  if (e2) throw new Error(username + " profil: " + e2.message);
}

const [mode, a, b, c] = process.argv.slice(2);
if (mode === "koc") {
  if (!b || b.length < 8) { console.error("Koç şifresi en az 8 karakter olmalı"); process.exit(1); }
  await create(a, b, c || a, "coach");
  console.log("Koç hesabı oluşturuldu:", a);
} else if (mode === "ogrenciler") {
  const names = fs.readFileSync(a, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
  const used = new Set(), rows = ["kullanici_adi,pin,ad"];
  for (const name of names) {
    const parts = name.split(/\s+/), base = slug(parts[0]) + slug((parts[parts.length - 1] || "")[0] || "");
    let u = base, i = 2; while (used.has(u)) u = base + i++;
    used.add(u);
    const pin = String(randomInt(100000, 1000000));
    await create(u, pin, name, "student");
    rows.push([u, pin, name].join(","));
    console.log("oluşturuldu:", u);
  }
  fs.writeFileSync("giris-bilgileri.csv", rows.join("\n"));
  console.log("giris-bilgileri.csv yazıldı. Bilgileri öğrencilere iletin, sonra dosyayı güvenle saklayın veya silin.");
} else {
  console.error("Kullanım: koc <kullanici> <sifre> <ad>  |  ogrenciler <dosya.txt>");
}
