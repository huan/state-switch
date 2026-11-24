#!/usr/bin/env bash
#
# Sets publishConfig.tag from the package version before `npm publish`.
# A production release (no prerelease) is tagged "latest"; anything else is "next".
# Production installs (`npm install state-switch`) follow "latest".
#
set -euo pipefail

node <<'JS'
const fs = require('fs')

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const version = pkg.version
const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version)

if (!match) {
  console.error(`unsupported version: ${version}`)
  process.exit(1)
}

const tag = match[4] ? 'next' : 'latest'
pkg.publishConfig = { ...pkg.publishConfig, tag }
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log(`publishConfig.tag set to ${tag} for version ${version}.`)
JS
