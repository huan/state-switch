# state-switch

State Switch is a Monitor/Guard for Managing Your Async Operations.

[![Build Status](https://travis-ci.org/zixia/state-switch.svg?branch=master)](https://travis-ci.org/zixia/state-switch) [![npm version](https://badge.fury.io/js/state-switch.svg)](https://badge.fury.io/js/state-switch) [![TypeScript definitions on DefinitelyTyped](http://definitelytyped.org/badges/standard-flat.svg)](http://definitelytyped.org)

[![State Switch Logo](https://raw.githubusercontent.com/zixia/state-switch/master/image/state-switch.gif)](https://github.com/zixia/state-switch)

## Example

Talk is cheap, show me the code!

### Code
```ts
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

```

### Run

```shell
$ npm run demo

> state-switch@0.1.3 demo /home/zixia/git/state-switch
> ts-node example/demo

CALL: conn.connect()
doSlowConnect() start connecting
I'm connecting now
CALL: conn.connect()
I'm connecting, please wait
CALL: conn.disconnect()
I'm connecting, please wait
doSlowConnect() connected
I have just connected.
CALL: conn.connect()
I'm already connected. no need to connect again
CALL: conn.disconnect()
doSlowDisconnect() start disconnecting
I'm disconnecting now
CALL: conn.disconnect()
I'm disconnecting, please wait
CALL: conn.connect()
I'm disconnecting, please wait
doSlowDisconnect() disconnected
I have just disconnected.
CALL: conn.disconnect()
I'm already disconnected. no need to disconnect again

```

That's the idea: we have to know the state of our async operation.


## API Reference

Class StateSwitch<A, B>

### constructor(clientName: string, initState: A | B)

Inorder to create a new StateSwitch instance, you need to define:

1. name of state A, ie: `open`
1. name of state B, ie: `close`
1. who is under management: clientName, ie: `MyConn`
1. the initial state, ie: 'close'

```ts
private state = new StateSwitch<'open', 'close'>('MyConn', 'close')
```

### target(): A | B

Get target `state`

### target(newState): A | B

Set target `state` `newState`

### current(): A | B

Get current `state`

### current(newState: A|B, stable: boolean = true): A | B

Set current `state` to newState

if `stable` set to true, which is the default, that means there's no async operations on the fly.
if `stable` set to false, means we are waiting some async operations.

### stable(): boolean

Check if the state is `stable`.

`true` means no async on fly.
`false` means there's some async operations we need to wait.

### inprocess(): boolean

Check for the opposite side of `stable()`.

Return `!stable()`

### client(): string

Get the `client` name.

### setLog(log: Brolog | Npmlog)

Enable log by set log to a Npmlog compatible instance.

Personaly I use Brolog, which is writen by my self, the same API with Npmlog but can also run inside Browser with Angular supported.

```ts
const log = Brolog.instance()
StateSwitch.setLog(log)
```

## History

### v0.1.0 (May 2017)

Rename to `StateSwitch` because the name StateMonitor on npmjs.com is taken.

1. Make it a solo NPM Module. ([#466](https://github.com/Chatie/wechaty/issues/466))

### v0.0.0 (Oct 2016)

Orignal name is `StateMonitor`

1. Part of the [Wechaty](https://github.com/Chatie/wechaty) project

Author
------
Huan LI <zixia@zixia.net> (http://linkedin.com/in/zixia)

<a href="http://stackoverflow.com/users/1123955/zixia">
  <img src="http://stackoverflow.com/users/flair/1123955.png" width="208" height="58" alt="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers" title="profile for zixia at Stack Overflow, Q&amp;A for professional and enthusiast programmers">
</a>

Copyright & License
-------------------
* Code & Docs 2016-2017© zixia
* Code released under the Apache-2.0 license
* Docs released under Creative Commons
