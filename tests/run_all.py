# Tüm Python tarayıcı testlerini sırayla çalıştırır ve sonucu tek yerde toplar (GitHub Actions ve yerel kullanım).
#   python3 tests/run_all.py              # hepsi (herhangi bir klasörden)
#   python3 tests/run_all.py test_nav.py  # yalnızca verilenler
# Testlerin çoğu başarısız denetimde de 0 ile çıkar; bu yüzden sonuç çıktıdan okunur:
# "FAIL ..." satırı, boş olmayan "JS hataları:" / "Sayfa hataları:" satırı ya da sıfırdan farklı çıkış kodu = başarısız.
import datetime, glob, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
TIMEOUT = 420

# Bilinen, kod hatası olmayan dalgalanmalar (CLAUDE.md'de açıklanan). Yalnızca uyarı olarak raporlanır.
def known_flaky(test, line):
    if test == "test_p2.py" and "Geçen hafta bu haftaya kopyalandı" in line:
        wd = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=3)).weekday()
        return wd in (0, 1)  # Pazartesi/Salı: sahte dünkü görevler de sayılır
    return False

def judge(test, out, code):
    fails, flaky = [], []
    for line in out.splitlines():
        s = line.strip()
        if re.match(r"^FAIL\s", s) and not s.startswith("FAIL sayısı"):
            (flaky if known_flaky(test, s) else fails).append(s)
        m = re.match(r"^(JS|Sayfa) hataları:\s*(.*)$", s)
        if m and m.group(2) not in ("yok", "[]"):
            fails.append(s[:300])
    if code != 0 and not fails:
        fails.append(f"çıkış kodu {code}")
    return fails, flaky

tests = sys.argv[1:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, "test_*.py")))
rows, bad = [], 0
for t in tests:
    start = time.time()
    try:
        r = subprocess.run([sys.executable, t], cwd=HERE, capture_output=True, text=True, timeout=TIMEOUT, encoding="utf-8", errors="replace")
        out, code = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired as e:
        raw = e.stdout or ""
        out, code = raw.decode("utf-8", "replace") if isinstance(raw, bytes) else raw, -1
        out += f"\nZAMAN AŞIMI ({TIMEOUT} sn)"
    fails, flaky = judge(t, out, code)
    oks = sum(1 for l in out.splitlines() if l.strip().startswith("OK"))
    secs = round(time.time() - start)
    bad += bool(fails)
    rows.append((t, fails, flaky, oks, secs))
    print(f"\n===== {t} ({secs} sn) =====\n{out.strip()}")
    print(f"--> {'BAŞARISIZ' if fails else 'GEÇTİ'}")

lines = ["## İşlev testleri (sahte Supabase ile)", "", "| Test | Sonuç | Geçen denetim | Süre |", "|---|---|---|---|"]
for t, fails, flaky, oks, secs in rows:
    res = "❌ " + str(len(fails)) + " hata" if fails else ("⚠️ bilinen dalgalanma" if flaky else "✅")
    lines.append(f"| `{t}` | {res} | {oks} | {secs} sn |")
details = [(t, f, fl) for t, f, fl, _, _ in rows if f or fl]
if details:
    lines += ["", "### Ayrıntı"]
    for t, f, fl in details:
        lines += [f"**{t}**"] + [f"- ❌ `{x}`" for x in f] + [f"- ⚠️ `{x}` (bilinen, Pazartesi/Salı)" for x in fl]
summary = "\n".join(lines)
print("\n" + summary)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
        f.write(summary + "\n")
sys.exit(1 if bad else 0)
