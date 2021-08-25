import Default, {
  StateSwitch,
  VERSION,
}               from 'state-switch'

const ss = new StateSwitch()
console.info(`StateSwitch v${ss.version()}`)

ss.on('pending')
ss.on(true)
ss.off('pending')
ss.on(true)

if (Default !== StateSwitch) {
  throw new Error('default export does not match the exported module!')
}

if (VERSION === '0.0.0') {
  throw new Error('version should be set before publishing')
}

console.info('Smoke Testing PASSED!')
