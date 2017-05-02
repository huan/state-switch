#!/usr/bin/env ts-node

import { test } from 'tap'

import StateSwitch from './state-switch'

test('StateSwitch target/current & stable', t => {
  const CLIENT_NAME = 'StateSwitchTest'
  const sm = new StateSwitch<'A', 'B'>(CLIENT_NAME, 'A')

  t.is(sm.current(), 'A', 'current should be A')
  t.is(sm.target(), 'A', 'target should be A')
  t.true(sm.stable(), 'should be stable')

  t.throws(() => {
    sm.current('B')
  }, Error, 'should throw if current not match target')
  t.throws(() => {
    sm.current('B', false)
  }, Error, 'should throw if current not match target 2')
  t.is(sm.current(), 'A', 'current should still be A')
  t.is(sm.target(), 'A', 'target should still be A')
  t.true(sm.stable(), 'should be stable')

  sm.target('B')
  sm.current('B')
  t.is(sm.target(), 'B', 'target should still be B')
  t.is(sm.current(), 'B', 'current should be B')
  t.true(sm.stable(), 'should be stable')

  sm.target('A')
  sm.current('A', false)
  t.is(sm.target(), 'A', 'target should still be A')
  t.is(sm.current(), 'A', 'current should be A')
  t.false(sm.stable(), 'should not be stable')

  t.end()
})

test('StateSwitch client & stable/inprocess', t => {
  const CLIENT_NAME = 'StateSwitchTest'
  const sm = new StateSwitch<'A', 'B'>(CLIENT_NAME, 'A')

  t.is(sm.client(), CLIENT_NAME, 'should get the same client name as init')

  sm.target('B')
  sm.current('B')
  t.true(sm.stable(), 'should be stable')
  t.false(sm.inprocess(), 'should be not inprocess')

  sm.current('B', false)
  t.false(sm.stable(), 'should not be stable')
  t.true(sm.inprocess(), 'should be inprocess')

  sm.current('B', true)
  t.true(sm.stable(), 'should be stable')
  t.false(sm.inprocess(), 'should be not inprocess')

  t.end()
})

test('current() strict check with target', t => {
  const CLIENT_NAME = 'StateSwitchTest'
  const sm = new StateSwitch<'A', 'B'>(CLIENT_NAME, 'A')

  t.throws(() => {
    sm.current('B')
  }, Error, 'should thorw for unmatch current & target')

  sm.target('B')
  t.doesNotThrow(() => sm.current('B'), 'should not throws for matched current & target')

  t.end()
})
