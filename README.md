# state-switch

State Switch is a Monitor/Guard for Managing Your Async Operations.

[![Build Status](https://travis-ci.org/zixia/state-switch.svg?branch=master)](https://travis-ci.org/zixia/state-switch) [![npm version](https://badge.fury.io/js/state-switch.svg)](https://badge.fury.io/js/state-switch) [![TypeScript definitions on DefinitelyTyped](http://definitelytyped.org/badges/standard-flat.svg)](http://definitelytyped.org)

[![State Switch Logo](https://raw.githubusercontent.com/zixia/state-switch/master/state-switch.gif)](https://github.com/zixia/state-switch)

## Example

Talk is cheap, show me the code!

### Code
```ts
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

```

### Run

```shell
$ npm run demo

> state-switch@0.1.3 demo /home/zixia/git/state-switch
> ts-node example/demo

CALL: conn.connect(): should start to opening
> doSlowConnect() started
> I'm opening
CALL: conn.connect(): should not connect again while opening
> I'm opening, please wait
CALL: conn.disconnect(): can not disconnect while opening
> I'm opening, please wait
> doSlowConnect() done
> I'm now opened
... 2 seconds later, should be already open  ...
CALL: conn.connect(): should not connect again if we are open
> I'm already open. no need to connect again
CALL: conn.disconnect(): should start to closing
> doSlowDisconnect() started
> I'm closing
CALL: conn.disconnect(): should not disconnect again while we are closing
> I'm closing, please wait
CALL: conn.connect(): can not do connect while we are closing
> I'm closing, please wait
> doSlowDisconnect() done
> I'm closed.
... 2 seconds later, should be already closed ...
CALL: conn.disconnect(): should not disconnect again if we are close
> I'm already close. no need to disconnect again

```

That's the idea: **we should always be able to know the state of our async operation**.

## API Reference

Class StateSwitch<A, B>

### constructor(clientName: string, initState: A | B)

In order to create a new StateSwitch instance, you need to define:

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

Set target `state` to `newState`

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
