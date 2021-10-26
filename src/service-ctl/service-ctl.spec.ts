#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import { ServiceCtl } from './service-ctl.js'

test('ServiceCtl smoke testing', async t => {
  const sandbox = sinon.createSandbox()
  const onStartSpy = sandbox.spy()
  const onStopSpy = sandbox.spy()

  class ServiceCtlImpl extends ServiceCtl {

    async onStart () {
      onStartSpy()
    }

    async onStop () {
      onStopSpy()
    }

  }

  const ctl = new ServiceCtlImpl()

  await ctl.start()
  t.ok(onStartSpy.calledOnce, 'should call onStart()')
  t.ok(onStopSpy.notCalled, 'should not call onStop()')

  await ctl.stop()
  t.ok(onStopSpy.calledOnce, 'should call onStop()')

  await t.resolves(() => ctl.reset(), 'should not reject when calling reset() with an inactive service')

  await ctl.start()
  sandbox.resetHistory()
  await t.resolves(() => ctl.reset(), 'should be able to reset with an active service')
  t.ok(onStartSpy.calledOnce, 'should call onStart() via reset()')
  t.ok(onStopSpy.calledOnce, 'should call onStop() via reset()')
})
