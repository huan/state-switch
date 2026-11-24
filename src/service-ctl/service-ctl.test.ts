/**
 * Unit tests for ServiceCtl and serviceCtlMixin: start, stop, and reset lifecycles.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import type * as TypedEventEmitter from 'typed-emitter'
import { log } from 'brolog'

import { ServiceableAbstract } from '../interfaces.ts'
import {
  ServiceCtl,
  serviceCtlMixin,
}                     from './service-ctl.ts'

test('ServiceCtl smoke testing', async () => {
  let onStartCalls = 0
  let onStopCalls = 0

  class ServiceCtlImpl extends ServiceCtl {
    async onStart () { onStartCalls++ }
    async onStop ()  { onStopCalls++ }
  }

  const ctl = new ServiceCtlImpl()

  await ctl.start()
  assert.equal(onStartCalls, 1, 'should call onStart()')
  assert.equal(onStopCalls, 0, 'should not call onStop()')

  await ctl.stop()
  assert.equal(onStopCalls, 1, 'should call onStop()')

  await assert.doesNotReject(() => ctl.reset(), 'should not reject when calling reset() with an inactive service')

  await ctl.start()
  onStartCalls = 0
  onStopCalls = 0
  await assert.doesNotReject(() => ctl.reset(), 'should be able to reset with an active service')
  assert.equal(onStartCalls, 1, 'should call onStart() via reset()')
  assert.equal(onStopCalls, 1, 'should call onStop() via reset()')
})

test('ServiceCtlMixin smoke testing', async () => {
  let childOnStartCalls = 0
  let childOnStopCalls = 0
  let parentStartCalls = 0
  let parentStopCalls = 0

  type TestListener = (data: string | number) => void

  const MyEventEmitter = EventEmitter as unknown as new () => TypedEventEmitter.default<{
    test: TestListener
  }>

  class MyServiceBase extends MyEventEmitter {
    start ()  { parentStartCalls++ }
    stop ()   { parentStopCalls++ }
  }

  const mixinBase = serviceCtlMixin('MixinTest', { log })(MyServiceBase)

  class ServiceCtlImpl extends mixinBase {
    async onStart () {
      childOnStartCalls++
      this.emit('test', 42)
    }

    async onStop () {
      childOnStopCalls++
      this.emit('test', 'on-stop')
    }
  }

  const ctl = new ServiceCtlImpl()

  ctl.on('test', (data: string | number) => {
    assert.ok(data !== undefined, 'test event should emit payload')
  })

  await ctl.start()
  assert.equal(childOnStartCalls, 1, 'should call onStart()')
  assert.equal(parentStartCalls, 1, 'should call parent start()')
  assert.equal(childOnStopCalls, 0, 'should not call onStop()')
  assert.equal(parentStopCalls, 0, 'should not call parent stop()')

  await ctl.stop()
  assert.equal(childOnStopCalls, 1, 'should call onStop()')
  assert.equal(parentStopCalls, 1, 'should call parent stop()')

  await assert.doesNotReject(() => ctl.reset(), 'should not reject when calling reset() with an inactive service')

  await ctl.start()
  childOnStartCalls = 0
  childOnStopCalls = 0
  parentStartCalls = 0
  parentStopCalls = 0

  await assert.doesNotReject(() => ctl.reset(), 'should be able to reset with an active service')
  assert.equal(childOnStartCalls, 1, 'should call onStart() via reset()')
  assert.equal(childOnStopCalls, 1, 'should call onStop() via reset()')
  assert.equal(parentStartCalls, 1, 'should call parent start() via reset()')
  assert.equal(parentStopCalls, 1, 'should call parent stop() via reset()')
})

test('start waits out an in-flight stop, and stop waits out an in-flight start', async () => {
  let releaseStart: () => void = () => {}
  let releaseStop: () => void = () => {}
  let blockStart = false
  let blockStop = false
  let startGate = Promise.resolve()
  let stopGate = Promise.resolve()
  const calls: string[] = []

  class ServiceCtlImpl extends ServiceCtl {
    async onStart () {
      calls.push('onStart')
      if (blockStart) {
        blockStart = false
        await startGate
      }
    }

    async onStop () {
      calls.push('onStop')
      if (blockStop) {
        blockStop = false
        await stopGate
      }
    }
  }

  const ctl = new ServiceCtlImpl()

  await ctl.start()
  blockStop = true
  stopGate = new Promise<void>(resolve => { releaseStop = resolve })
  const stopping = ctl.stop()
  const restarting = ctl.start()
  assert.deepEqual(calls, [ 'onStart', 'onStop' ], 'start requested while stopping does not run yet')

  releaseStop()
  await stopping
  await restarting
  assert.deepEqual(calls, [ 'onStart', 'onStop', 'onStart' ], 'start runs after the stop settles')
  assert.equal(ctl.state.active(), true)

  await ctl.stop()
  blockStart = true
  startGate = new Promise<void>(resolve => { releaseStart = resolve })
  const starting = ctl.start()
  await new Promise(resolve => setImmediate(resolve))
  const stoppingAgain = ctl.stop()
  assert.deepEqual(
    calls,
    [ 'onStart', 'onStop', 'onStart', 'onStop', 'onStart' ],
    'stop requested while starting does not run yet',
  )

  releaseStart()
  await starting
  await stoppingAgain
  assert.equal(calls.at(-1), 'onStop')
  assert.equal(ctl.state.inactive(), true)
  assert.equal(ctl.state.active(), false)
})

test('failed start cleans up the parent and the child before going inactive', async () => {
  const calls: string[] = []

  class Parent extends ServiceableAbstract {
    override async start () { calls.push('super.start') }
    override async stop ()  { calls.push('super.stop') }
  }

  const Mixed = serviceCtlMixin('FailStart')(Parent)

  class ServiceCtlImpl extends Mixed {
    override async onStart () {
      calls.push('onStart')
      throw new Error('start failed')
    }

    override async onStop () {
      calls.push('onStop')
      throw new Error('onStop failed')
    }
  }

  const ctl = new ServiceCtlImpl()
  const errors: unknown[] = []
  ctl.emit = (event: string, error?: unknown) => {
    if (event === 'error') {
      errors.push(error)
    }
  }

  await assert.rejects(() => ctl.start(), /start failed/)
  assert.deepEqual(calls, [ 'super.start', 'onStart', 'onStop', 'super.stop' ])
  assert.equal(ctl.state.inactive(), true)
  assert.equal(ctl.state.active(), false)
  assert.equal(errors.length, 2, 'reports the start failure and the cleanup failure')

  calls.length = 0
  await ctl.stop()
  assert.deepEqual(calls, [], 'a later stop does not run again once inactive')
})

test('failed onStop still runs the parent stop', async () => {
  const calls: string[] = []

  class Parent extends ServiceableAbstract {
    override async stop () { calls.push('super.stop') }
  }

  const Mixed = serviceCtlMixin('FailStop')(Parent)

  class ServiceCtlImpl extends Mixed {
    override async onStart () { calls.push('onStart') }
    override async onStop () {
      calls.push('onStop')
      throw new Error('stop failed')
    }
  }

  const ctl = new ServiceCtlImpl()

  await ctl.start()
  await ctl.stop()
  assert.deepEqual(calls, [ 'onStart', 'onStop', 'super.stop' ])
  assert.equal(ctl.state.inactive(), true)
  assert.equal(ctl.state.active(), false)
})

test('mixin stop emits the child error and still stops the parent', async () => {
  const calls: string[] = []
  const errors: unknown[] = []

  class Parent extends EventEmitter {
    stop () { calls.push('super.stop') }
  }

  const Mixed = serviceCtlMixin('MixinFailStop')(Parent)

  class ServiceCtlImpl extends Mixed {
    async onStart () { calls.push('onStart') }
    async onStop () {
      calls.push('onStop')
      throw new Error('stop failed')
    }
  }

  const ctl = new ServiceCtlImpl()
  ctl.on('error', (error: unknown) => { errors.push(error) })

  await ctl.start()
  await ctl.stop()
  assert.deepEqual(calls, [ 'onStart', 'onStop', 'super.stop' ])
  assert.equal(errors.length, 1)
  assert.equal((errors[0] as Error).message, 'stop failed')
  assert.equal(ctl.state.inactive(), true)
  assert.equal(ctl.state.active(), false)
})

test('a reset that times out waiting for the in-flight reset rejects', async (t) => {
  t.mock.timers.enable({ apis: [ 'setTimeout' ] })

  let releaseStop: (() => void) | undefined
  const calls: string[] = []

  class ServiceCtlImpl extends ServiceCtl {
    override async onStart () { calls.push('onStart') }
    override async onStop () {
      calls.push('onStop')
      await new Promise<void>(resolve => { releaseStop = resolve })
    }
  }

  const ctl = new ServiceCtlImpl()

  await ctl.start()
  const resetting = ctl.reset()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(calls, [ 'onStart', 'onStop' ], 'reset is inside the child stop hook')

  const overlapped = ctl.reset()
  t.mock.timers.tick(15_000)
  await assert.rejects(overlapped, /Timeout after 15000 ms/)

  releaseStop?.()
  await resetting
  assert.equal(ctl.state.active(), true)
  assert.deepEqual(calls, [ 'onStart', 'onStop', 'onStart' ])
})
