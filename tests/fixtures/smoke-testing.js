const { StateSwitch } = require('state-switch')

const ss = new StateSwitch()
ss.on(true)
console.log(`StateSwitch v${ss.version()}`)

console.log('Smoke Testing PASSED!')
