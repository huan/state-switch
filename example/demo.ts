import { StateSwitch } from '../'

function doSlowConnect() {
  console.log('doSlowConnect() start connecting')
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('doSlowConnect() connected')
      resolve()
    }, 1000)
  })
}

function doSlowDisconnect() {
  console.log('doSlowDisconnect() start disconnecting')
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('doSlowDisconnect() disconnected')
      resolve()
    }, 1000)
  })
}

class MyConnection {
  private state = new StateSwitch<'connected', 'disconnected'>('MyConnection', 'disconnected')

  constructor() {
    /* */
  }

  public connect() {
    /**
     * This is the right state
     */
    if (this.state.target() === 'disconnected' && this.state.stable()) {
      this.state.target('connected')
      this.state.current('connected', false)

      doSlowConnect().then(() => {
        this.state.current('connected', true)
        console.log(`I have just connected.`)
      })

      console.log(`I'm connecting now`)
      return
    }

    /**
     * Error state
     */
    if (this.state.target() === 'disconnected' && this.state.inprocess()) {
      console.error(`I'm disconnecting, please wait`)
    } else if (this.state.target() === 'connected' && this.state.stable()) {
      console.error(`I'm already connected. no need to connect again`)
    } else if (this.state.target() === 'connected' && this.state.inprocess()) {
      console.error(`I'm connecting, please wait`)
    }
  }

  public disconnect() {
    /**
     * This is the right state
     */
    if (this.state.target() === 'connected' && this.state.stable()) {
      this.state.target('disconnected')
      this.state.current('disconnected', false)

      doSlowDisconnect().then(() => {
        this.state.current('disconnected', true)
        console.log(`I have just disconnected.`)
      })

      console.log(`I'm disconnecting now`)
      return
    }

    /**
     * Error state
     */
    if (this.state.target() === 'connected' && this.state.inprocess()) {
      console.error(`I'm connecting, please wait`)
    } else if (this.state.target() === 'disconnected' && this.state.stable()) {
      console.error(`I'm already disconnected. no need to disconnect again`)
    } else if (this.state.target() === 'disconnected' && this.state.inprocess()) {
      console.error(`I'm disconnecting, please wait`)
    }
  }
}

const conn = new MyConnection()

console.log('CALL: conn.connect()')
conn.connect()

console.log('CALL: conn.connect()')
conn.connect()

console.log('CALL: conn.disconnect()')
conn.disconnect()

setTimeout(() => {
  console.log('CALL: conn.connect()')
  conn.connect()

  console.log('CALL: conn.disconnect()')
  conn.disconnect()

  console.log('CALL: conn.disconnect()')
  conn.disconnect()

  console.log('CALL: conn.connect()')
  conn.connect()

  setTimeout(() => {
    console.log('CALL: conn.disconnect()')
    conn.disconnect()
  }, 2000)

}, 2000)
