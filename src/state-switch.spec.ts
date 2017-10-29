#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import * as test  from 'blue-tape'

import StateSwitch from './state-switch'

test('on()', async t => {
  const ss = new StateSwitch()

  t.notOk(ss.on(), 'default is not on')

  ss.on('pending')
  t.equal(ss.on(), 'pending', 'should be state pending')

  ss.on(true)
  t.equal(ss.on(), true, 'should be state true')
  t.notOk(ss.off(), 'should not off')

  ss.off(true)
  t.notOk(ss.on(), 'should not ON after off()')
})

test('off()', async t => {
  const ss = new StateSwitch()

  t.ok(ss.off(), 'default is off')
  t.equal(ss.off(), true, 'should in state true')

  ss.off('pending')
  t.equal(ss.off(), 'pending', 'should be state pending')

  ss.off(true)
  t.equal(ss.off(), true, 'should be state true')
  t.notOk(ss.on(), 'should not on')

  ss.on(true)
  t.notOk(ss.off(), 'should not OFF after on()')
})

test('pending()', async t => {
  const ss = new StateSwitch()

  t.notOk(ss.pending(), 'default is not pending')

  ss.on('pending')
  t.ok(ss.pending(), 'should in pending state')

  ss.on(true)
  t.notOk(ss.pending(), 'should not in pending state')

  ss.off('pending')
  t.ok(ss.pending(), 'should in pending state')
})

test('name', async t => {
  const CLIENT_NAME = 'StateSwitchTest'
  const ss = new StateSwitch(CLIENT_NAME)

  t.is(ss.name(), CLIENT_NAME, 'should get the same client name as init')
})

test('version()', t => {
  const ss = new StateSwitch()
  t.ok(ss.version(), 'should get version')
  t.end()
})
