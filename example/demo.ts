import { StateSwitch } from '../'

function doSlowConnect() {
  console.log('> doSlowConnect() started')
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('> doSlowConnect() done')
      resolve()
    }, 1000)
  })
}

function doSlowDisconnect() {
  console.log('> doSlowDisconnect() started')
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('> doSlowDisconnect() done')
      resolve()
    }, 1000)
  })
}

class MyConnection {
  private state = new StateSwitch<'open', 'close'>('MyConnection', 'close')

  constructor() {
    /* */
  }

  public connect() {
    /**
     * This is the only 1 Right State
     */
    if (this.state.target() === 'close' && this.state.stable()) {
      this.state.target('open')
      this.state.current('open', false)

      doSlowConnect().then(() => {
        this.state.current('open', true)
        console.log(`> I'm now opened`)
      })

      console.log(`> I'm opening`)
      return
    }

    /**
     * These are the other 3 Error States
     */
    if (this.state.target() === 'close' && this.state.inprocess()) {
      console.error(`> I'm closing, please wait`)
    } else if (this.state.target() === 'open' && this.state.stable()) {
      console.error(`> I'm already open. no need to connect again`)
    } else if (this.state.target() === 'open' && this.state.inprocess()) {
      console.error(`> I'm opening, please wait`)
    }
  }

  public disconnect() {
    /**
     * This is the only one Right State
     */
    if (this.state.target() === 'open' && this.state.stable()) {
      this.state.target('close')
      this.state.current('close', false)

      doSlowDisconnect().then(() => {
        this.state.current('close', true)
        console.log(`> I'm closed.`)
      })

      console.log(`> I'm closing`)
      return
    }

    /**
     * These are the other 3 Error States
     */
    if (this.state.target() === 'open' && this.state.inprocess()) {
      console.error(`> I'm opening, please wait`)
    } else if (this.state.target() === 'close' && this.state.stable()) {
      console.error(`> I'm already close. no need to disconnect again`)
    } else if (this.state.target() === 'close' && this.state.inprocess()) {
      console.error(`> I'm closing, please wait`)
    }
  }
}

const conn = new MyConnection()

console.log('CALL: conn.connect(): should start to opening')
conn.connect()

console.log('CALL: conn.connect(): should not connect again while opening')
conn.connect()

console.log('CALL: conn.disconnect(): can not disconnect while opening')
conn.disconnect()

setTimeout(() => {
  console.log('... 2 seconds later, should be already open  ...')

  console.log('CALL: conn.connect(): should not connect again if we are open')
  conn.connect()

  console.log('CALL: conn.disconnect(): should start to closing')
  conn.disconnect()

  console.log('CALL: conn.disconnect(): should not disconnect again while we are closing')
  conn.disconnect()

  console.log('CALL: conn.connect(): can not do connect while we are closing')
  conn.connect()

  setTimeout(() => {
    console.log('... 2 seconds later, should be already closed ...')

    console.log('CALL: conn.disconnect(): should not disconnect again if we are close')
    conn.disconnect()
  }, 2000)

}, 2000)
