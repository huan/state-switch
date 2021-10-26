#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import { ServiceCtlFsm } from './service-ctl-fsm.js'

test('ServiceCtlFsm smoke testing', async t => {
  const sandbox = sinon.createSandbox()
  const onStartSpy = sandbox.spy()
  const onStopSpy = sandbox.spy()

  class ServiceCtlFsmImpl extends ServiceCtlFsm {

    async onStart () {
      onStartSpy()
    }

    async onStop () {
      onStopSpy()
    }

  }

  const ctl = new ServiceCtlFsmImpl()

  await ctl.start()
  t.ok(onStartSpy.calledOnce, 'should call onStart()')
  t.ok(onStopSpy.notCalled, 'should not call onStop()')

  await ctl.stop()
  t.ok(onStopSpy.calledOnce, 'should call onStop()')

  t.throws(() => ctl.reset(), 'should reject when calling reset() with an inactive service')

  await ctl.start()
  sandbox.resetHistory()
  await t.resolves(() => ctl.reset(), 'should be able to reset with an active service')
  t.ok(onStartSpy.calledOnce, 'should call onStart() via reset()')
  t.ok(onStopSpy.calledOnce, 'should call onStop() via reset()')
})
