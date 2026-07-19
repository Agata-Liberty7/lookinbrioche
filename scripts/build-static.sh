#!/usr/bin/env bash
set -euo pipefail

rm -rf dist
mkdir -p dist

cp index.html login.html shop.html admin.html core.js firebase.js i18n.js analytics.js style.css sw.js manifest.json robots.txt sitemap.xml dist/

if [ -d icons ]; then
  cp -R icons dist/icons
fi

if [ -d assets ]; then
  cp -R assets dist/assets
fi
