/**
 * Behavior tests for XState service invocation cancellation and transitions.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createMachine,
  interpret,
}                   from 'xstate'

const sleep = (milliseconds = 0) => new Promise(resolve => setTimeout(resolve, milliseconds))

test('state exit before the invoked promise settles', async () => {
  const config = {
    id: 'test',
    initial: 'start',
    states: {
      rejected: {},
      resolved: {},
      start: {
        invoke: {
          onDone  : 'resolved',
          onError : 'rejected',
          src: async () => {
            await sleep(20)
          },
        },
        on: {
          STOP: 'stop',
        },
      },
      stop: {},
    },
  } as const

  const machine = createMachine(config)

  /**
   * 1. Wait Promise to settle
   */
  const stateList1: [event: string, state: string][] = []
  const service1 = interpret(machine)
  service1.onTransition(state => {
    stateList1.push([
      state.event.type,
      String(state.value),
    ])
  })

  service1.start()
  await sleep(40)
  service1.send('STOP')
  await sleep(10)

  const PROMISE_STATE_LIST = [
    ['xstate.init', 'start'],
    ['done.invoke.test.start:invocation[0]', 'resolved'],
    ['STOP', 'resolved'],
  ]
  assert.deepEqual(stateList1, PROMISE_STATE_LIST, 'should wait for the promise to resolve')
  service1.stop()

  /**
   * 2. STOP before promise settles
   */
  const stateList2: [event: string, state: string][] = []
  const service2 = interpret(machine)
  service2.onTransition(state => {
    stateList2.push([
      state.event.type,
      String(state.value),
    ])
  })

  service2.start()
  await sleep(2)
  service2.send('STOP')
  await sleep(40)

  const STOP_STATE_LIST = [
    ['xstate.init', 'start'],
    ['STOP', 'stop'],
  ]
  assert.deepEqual(stateList2, STOP_STATE_LIST, 'should skip the resolved promise transition when STOP was sent early')
  service2.stop()
})
