#!/usr/bin/env bash
set -e

npm run dist
npm pack

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
mv *-*.*.*.tgz "$TMPDIR"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

cd $TMPDIR

npm init -y
# https://stackoverflow.com/a/59203952/1123955
echo "`jq '.type="module"' package.json`" > package.json

npm install *-*.*.*.tgz \
  @types/node \
  typescript@latest

./node_modules/.bin/tsc \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  --target es2020 \
  --module es2020 \
  --moduleResolution node \
  smoke-testing.ts

node --experimental-specifier-resolution=node smoke-testing.js
