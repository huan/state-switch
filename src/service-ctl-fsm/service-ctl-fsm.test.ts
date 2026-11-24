/**
 * Unit tests for ServiceCtlFsm: Finite State Machine based service lifecycle control.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EventEmitter } from 'node:events'

import {
  ServiceCtlFsm,
  serviceCtlFsmMixin,
}                     from './service-ctl-fsm.ts'

test('ServiceCtlFsm smoke testing', async () => {
  let onStartCalls = 0
  let onStopCalls = 0

  class ServiceCtlFsmImpl extends ServiceCtlFsm {
    async onStart () { onStartCalls++ }
    async onStop ()  { onStopCalls++ }
  }

  const ctl = new ServiceCtlFsmImpl()

  await ctl.start()
  assert.equal(onStartCalls, 1, 'should call onStart()')
  assert.equal(onStopCalls, 0, 'should not call onStop()')

  await ctl.stop()
  assert.equal(onStopCalls, 1, 'should call onStop()')

  assert.throws(() => ctl.reset(), 'should reject when calling reset() with an inactive service')

  await ctl.start()
  onStartCalls = 0
  onStopCalls = 0
  await assert.doesNotReject(() => ctl.reset(), 'should be able to reset with an active service')
  assert.equal(onStartCalls, 1, 'should call onStart() via reset()')
  assert.equal(onStopCalls, 1, 'should call onStop() via reset()')
})

test('serviceCtlFsmMixin()', async () => {
  let childOnStartCalls = 0
  let childOnStopCalls = 0
  let parentStartCalls = 0
  let parentStopCalls = 0

  class ServiceableBase extends EventEmitter {
    start () { parentStartCalls++ }
    stop ()  { parentStopCalls++ }
  }

  const mixinBase = serviceCtlFsmMixin()(ServiceableBase)

  class ServiceCtlFsmImpl extends mixinBase {
    async onStart () { childOnStartCalls++ }
    async onStop ()  { childOnStopCalls++ }
  }

  const ctl = new ServiceCtlFsmImpl()

  await ctl.start()
  assert.equal(childOnStartCalls, 1, 'should call onStart()')
  assert.equal(parentStartCalls, 1, 'should call parent start()')
  assert.equal(childOnStopCalls, 0, 'should not call onStop()')

  await ctl.stop()
  assert.equal(childOnStopCalls, 1, 'should call onStop()')
  assert.equal(parentStopCalls, 1, 'should call parent stop()')

  assert.throws(() => ctl.reset(), 'should reject when calling reset() with an inactive service')

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
