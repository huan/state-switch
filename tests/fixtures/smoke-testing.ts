import {
  StateSwitch,
  VERSION,
}               from 'state-switch'

const ss = new StateSwitch()
console.info(`StateSwitch v${ss.version()}`)

ss.active('pending')
ss.active(true)
ss.inactive('pending')
ss.inactive(true)

if (VERSION === '0.0.0') {
  throw new Error('version should be set before publishing')
}

console.info('Smoke Testing PASSED!')
