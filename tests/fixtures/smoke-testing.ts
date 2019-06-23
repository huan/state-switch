import Default, {
  StateSwitch,
  VERSION,
}               from 'state-switch'

if (VERSION === '0.0.0') {
  throw new Error('version should be set before publishing')
}

const ss = new StateSwitch()
ss.on(true)
console.info(`StateSwitch v${ss.version()}`)

if (Default !== StateSwitch) {
  throw new Error('default export does not match the exported module!')
}

console.info('Smoke Testing PASSED!')
