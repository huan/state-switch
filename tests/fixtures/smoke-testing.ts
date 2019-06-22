import {
  StateSwitch,
  VERSION,
}               from 'state-switch'

if (VERSION === '0.0.0') {
  throw new Error('version should be set before publishing')
}

const ss = new StateSwitch()
ss.on(true)
console.info(`StateSwitch v${ss.version()}`)

console.info('Smoke Testing PASSED!')
