#!/bin/sh
# Makes assets/js/motion.js, the animation library behind the Travel and Scale Models pages
# (Motion, https://motion.dev): only the parts assets/js/gallery.js uses (animate, inView
# and stagger), in one small file that sets window.Motion, with Motion's license on top.
#
# Needs Node.js (npx). To update Motion, change VERSION and run it from the top of the
# repository:
#
#     sh scripts/motion.sh

set -e

VERSION=14.2.0

[ -f _config.yml ] || { echo "Run it from the top of the repository." >&2; exit 1; }
OUT="$PWD/assets/js/motion.js"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cd "$WORK"
npm init -y > /dev/null
npm install --silent --no-audit --no-fund "motion@$VERSION" esbuild@0.25.0
echo "export { animate, inView, stagger } from 'motion';" > entry.js
{
  echo "/*! Motion $VERSION (https://motion.dev): animate, inView and stagger only, made by"
  echo "    scripts/motion.sh. It sets window.Motion for assets/js/gallery.js."
  echo
  sed 's/^/    /' node_modules/motion/LICENSE.md
  echo "*/"
  npx esbuild entry.js --bundle --minify --format=iife --global-name=Motion --log-level=error
} > "$OUT"
echo "Wrote $OUT ($(wc -c < "$OUT" | tr -d ' ') bytes)"
