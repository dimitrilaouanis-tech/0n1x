#!/bin/sh
# FREE image recreator for AI News heroes — Pollinations.ai (no key, ~65KB, 16:9).
#   sh gen_hero_free.sh <outfile.png> "<prompt>"
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$2")
curl -s -L "https://image.pollinations.ai/prompt/${ENC}?width=1280&height=720&nologo=true&model=flux" -o "img/$1" --max-time 60
echo "saved img/$1 ($(wc -c < img/$1) bytes)"
