import NOP from 'nop'

const nopLogger = () => ({
  error   : NOP,
  info    : NOP,
  silly   : NOP,
  verbose : NOP,
  warn    : NOP,
})

export { nopLogger }
