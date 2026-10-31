#!/bin/sh
# Her yayından önce çalıştır: tarayıcı önbelleği yüzünden eski dosyaların görünmesini engeller.
V=$(date +%Y%m%d%H%M)
# Sürüm değeri sayı olmayabilir (ör. ?v=20261029-coach1); tırnağa kadar her şey değiştirilir. Tüm yerel .js ve .css dosyaları.
sed -i -E "s#(src=\"js/[a-z-]+\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g; s#(href=\"[a-z-]+\.css)(\?v=[^\"]*)?\"#\1?v=$V\"#g" "$(dirname "$0")/../index.html" "$(dirname "$0")/../veli.html"
