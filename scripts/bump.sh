#!/bin/sh
# Her yayından önce çalıştır: tarayıcı önbelleği yüzünden eski dosyaların görünmesini engeller.
V=$(date +%Y%m%d%H%M)
sed -i -E "s#(src=\"js/[^\"?]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g; s#(href=\"styles\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#g" "$(dirname "$0")/../index.html"
