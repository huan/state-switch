import { StateSwitch } from '../src/state-switch'

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
  private state = new StateSwitch('MyConnection')

  constructor() {
    /* */
  }

  public connect() {
    /**
     * This is the only 1 Right State
     */
    if (this.state.off() === true) {
      this.state.on('pending')

      doSlowConnect().then(() => {
        this.state.on(true)
        console.log(`> I'm now opened`)
      })

      console.log(`> I'm opening`)
      return
    }

    /**
     * These are the other 3 Error States
     */
    if (this.state.off() === 'pending') {
      console.error(`> I'm closing, please wait`)
    } else if (this.state.on() === true) {
      console.error(`> I'm already open. no need to connect again`)
    } else if (this.state.on() === 'pending') {
      console.error(`> I'm opening, please wait`)
    }
  }

  public disconnect() {
    /**
     * This is the only one Right State
     */
    if (this.state.on() === true) {
      this.state.off('pending')

      doSlowDisconnect().then(() => {
        this.state.off(true)
        console.log(`> I'm closed.`)
      })

      console.log(`> I'm closing`)
      return
    }

    /**
     * These are the other 3 Error States
     */
    if (this.state.on() === 'pending') {
      console.error(`> I'm opening, please wait`)
    } else if (this.state.off() === true) {
      console.error(`> I'm already close. no need to disconnect again`)
    } else if (this.state.off() === 'pending') {
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
