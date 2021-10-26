#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import {
  createMachine,
  interpret,
}                   from 'xstate'

test('sinon.clock.tick', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  let resolved = false
  new Promise<void>(resolve => setTimeout(resolve, 10))
    .then(() => { resolved = true; return resolved })
    .catch(e => t.fail(e))

  t.equal(resolved, false, 'should not resolved initialy')

  await sandbox.clock.tickAsync(9)
  t.equal(resolved, false, 'should not resolved after tick(9)')

  await sandbox.clock.tickAsync(100)
  t.equal(resolved, true, 'should be resolved after tick(100)')

  sandbox.restore()
})

/**
 * XState - Invoking Services
 * @see https://xstate.js.org/docs/guides/communication.html#invoking-promises
 *
 *  If the state where the invoked promise is active is exited before the promise settles,
 *  the result of the promise is discarded.
 */
test('state exit before the invoked promise settle', async t => {
  const sandbox = sinon.createSandbox({
    useFakeTimers: true,
  })

  const sleep = (milliseconds = 0) => new Promise(resolve => setTimeout(resolve, milliseconds))

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
            // console.info('before sleep')
            await sleep(10)
            // console.info('after sleep')
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
   * Wait Promise to settle
   */
  const service1 = interpret(machine)
  service1
    .onTransition(state => {
      stateList.push([
        state.event.type,
        String(state.value),
      ])
    })

  const stateList: [event: string, state: string][] = []

  service1.start()
  await sandbox.clock.tickAsync(100)
  service1.send('STOP')
  await sandbox.clock.tickAsync(100)

  const PROMISE_STATE_LIST = [
    ['xstate.init', 'start'],
    ['done.invoke.test.start:invocation[0]', 'resolved'],
    ['STOP', 'resolved'],
  ] as const
  t.same(stateList, PROMISE_STATE_LIST, 'should wait the promise resolved')

  service1.stop()

  /**
   * STOP before promise settle
   */
  const service2 = interpret(machine)
  service2
    .onTransition(state => {
      stateList.push([
        state.event.type,
        String(state.value),
      ])
    })

  stateList.length = 0

  service2.start()
  await sandbox.clock.tickAsync(1)

  service2.send('STOP')
  await sandbox.clock.tickAsync(100)

  const STOP_STATE_LIST = [
    ['xstate.init', 'start'],
    // ['done.invoke.test.start:invocation[0]', 'resolved'],
    ['STOP', 'stop'],
  ] as const
  t.same(stateList, STOP_STATE_LIST, 'should skip the promise resolved')

  service2.stop()

  sandbox.restore()
})
