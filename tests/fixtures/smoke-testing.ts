import {
  StateSwitch,
  VERSION,
}               from 'state-switch'

const ss = new StateSwitch()
console.info(`StateSwitch v${ss.version()}`)

ss.on('pending')
ss.on(true)
ss.off('pending')
ss.on(true)

if (VERSION === '0.0.0') {
  throw new Error('version should be set before publishing')
}

console.info('Smoke Testing PASSED!')
