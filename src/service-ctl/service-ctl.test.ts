/**
 * Unit tests for ServiceCtl and serviceCtlMixin: start, stop, and reset lifecycles.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'
import type * as TypedEventEmitter from 'typed-emitter'
import { log } from 'brolog'

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
