/**
 * Unit tests for StateSwitch: active/inactive state transitions, pending 3VL,
 * stable() promise resolution, and active/inactive event emission.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { StateSwitch } from './state-switch.ts'

function createSpy () {
  const calls: any[][] = []
  const fn = (...args: any[]) => { calls.push(args) }
  return {
    fn,
    args: calls,
    get callCount () { return calls.length },
    get calledOnce () { return calls.length === 1 },
    get calledTwice () { return calls.length === 2 },
    get notCalled () { return calls.length === 0 },
    resetHistory () { calls.length = 0 },
  }
}

test('active() state transitions', () => {
  const ss = new StateSwitch()

  assert.ok(ss.inactive(), 'default is not active')

  ss.active('pending')
  assert.equal(ss.active(), 'pending', 'should be state pending')

  ss.active(true)
  assert.equal(ss.active(), true, 'should be active `true`')
  assert.ok(!ss.inactive(), 'should not be inactive')

  ss.inactive(true)
  assert.ok(!ss.active(), 'should not be active after call inactive(true)')
})

test('inactive() state transitions', () => {
  const ss = new StateSwitch()

  assert.ok(ss.inactive(), 'default is inactive')
  assert.equal(ss.inactive(), true, 'should in state true')

  ss.inactive('pending')
  assert.equal(ss.inactive(), 'pending', 'should be state pending')

  ss.inactive(true)
  assert.equal(ss.inactive(), true, 'should in state true')
  assert.ok(!ss.active(), 'should not be active')

  ss.active(true)
  assert.ok(!ss.inactive(), 'should not be inactive after called active()')
})

test('pending state behavior', () => {
  const ss = new StateSwitch()

  assert.ok(!ss.pending(), 'default is not pending')

  ss.active('pending')
  assert.ok(ss.pending(), 'should in pending state')

  ss.active(true)
  assert.ok(!ss.pending(), 'should not in pending state')

  ss.inactive('pending')
  assert.ok(ss.pending(), 'should in pending state')
})

test('name() client name', () => {
  const CLIENT_NAME = 'StateSwitchTest'
  const ss = new StateSwitch(CLIENT_NAME)

  assert.equal(ss.name(), CLIENT_NAME, 'should get the same client name as init')
})

test('version() string', () => {
  const ss = new StateSwitch()
  assert.ok(ss.version(), 'should get version')
})

test('stable() resolution and noCross rejection', async () => {
  const spy = createSpy()
  const ss = new StateSwitch()

  ss.stable('inactive').then(() => spy.fn('inactive')).catch(assert.fail)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(spy.callCount, 1, 'should be stable for inactive at the initial state')

  spy.resetHistory()
  await assert.rejects(() => ss.stable('active', true), 'should catch the exception when noCross=true')

  spy.resetHistory()
  const future = assert.doesNotReject(() => ss.stable('active'), 'should stable(active)')
  ss.active(true)
  await future

  spy.resetHistory()
  await assert.doesNotReject(() => ss.stable('active'), 'should stable(active) when already on')

  spy.resetHistory()
  ss.stable('inactive').then(() => spy.fn('inactive')).catch(assert.fail)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(spy.callCount, 0, 'should not stable(inactive) when its on')

  ss.inactive(true)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(spy.callCount, 1, 'should stable(inactive) after call inactive(true)')
})

test('stable() without default arg for waiting current state', async () => {
  const spy = createSpy()
  const ss = new StateSwitch()

  ss.inactive('pending')
  ss.stable().then(() => spy.fn('inactive')).catch(assert.fail)
  ss.inactive(true)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(spy.callCount, 1, 'should be stable() for inactive(true)')

  spy.resetHistory()

  ss.active('pending')
  ss.stable().then(() => spy.fn('active')).catch(assert.fail)
  ss.active(true)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(spy.callCount, 1, 'should be stable() for active(true)')
})

test('pending getters keep the transition direction', () => {
  const ss = new StateSwitch()

  ss.active('pending')
  assert.equal(ss.active(), 'pending', 'turning on is pending on the active side')
  assert.equal(ss.inactive(), false, 'turning on is not pending on the inactive side')

  ss.active(true)
  ss.inactive('pending')
  assert.equal(ss.inactive(), 'pending', 'turning off is pending on the inactive side')
  assert.equal(ss.active(), false, 'turning off is not pending on the active side')
})

test('stable() reuses the outstanding promise and rearms the opposite side', async () => {
  const ss = new StateSwitch()

  let activeResolved = false
  const ready = ss.stable('active').then(() => { activeResolved = true })
  ss.active('pending')
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(activeResolved, false, 'waiter registered before pending stays pending')
  ss.active(true)
  await ready

  let inactiveResolved = false
  const gone = ss.stable('inactive').then(() => { inactiveResolved = true })
  ss.active(true)
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(inactiveResolved, false, 'a repeated active(true) must not replace the inactive waiter')

  ss.active('pending')
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(inactiveResolved, false, 'stable(inactive) waits while activation is still pending')

  ss.inactive('pending')
  let activeAgain = false
  const back = ss.stable('active').then(() => { activeAgain = true })
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(activeAgain, false, 'stable(active) waits after leaving the stable active state')

  ss.inactive(true)
  await gone
  await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(activeAgain, false, 'the rearmed active promise is not the one that already resolved')
  ss.active(true)
  await back
})

test('noCross allows the transition already underway', async () => {
  const ss = new StateSwitch()

  ss.active('pending')
  const ready = ss.stable('active', true)
  await assert.rejects(
    () => ss.stable('inactive', true),
    /state is active/,
    'noCross rejects a wait for the opposite side',
  )
  ss.active(true)
  await ready

  ss.inactive('pending')
  const stopped = ss.stable('inactive', true)
  await assert.rejects(() => ss.stable('active', true))
  ss.inactive(true)
  await stopped
})

test('active/inactive events emitting', async () => {
  const spyActive   = createSpy()
  const spyInactive = createSpy()

  const ss = new StateSwitch()

  ss.addListener('active',  spyActive.fn)
  ss.addListener('inactive', spyInactive.fn)

  assert.ok(spyActive.notCalled, 'spyActive is not called')
  assert.ok(spyInactive.notCalled, 'spyInactive is not called')

  ss.active('pending')
  assert.ok(spyActive.calledOnce, 'spyActive is called once after on(pending)')
  assert.deepEqual(spyActive.args[0], ['pending'], 'spyActive should be called with `pending` arg')
  assert.ok(spyInactive.notCalled, 'spyInactive is not called')

  ss.active(true)
  assert.ok(spyActive.calledTwice, 'spyActive is called once after active(pending)')
  assert.deepEqual(spyActive.args[1], [true], 'spyActive should be called with `true` arg')
  assert.ok(spyInactive.notCalled, 'spyInactive is not called')

  ss.inactive('pending')
  await Promise.resolve()
  assert.ok(spyInactive.calledOnce, 'spyInactive is called once after inactive(pending)')
  assert.deepEqual(spyInactive.args[0], ['pending'], 'spyInactive should be called with `pending` arg')

  ss.inactive(true)
  assert.ok(spyInactive.calledTwice, 'spyInactive is called twice after inactive(true)')
  assert.deepEqual(spyInactive.args[1], [true], 'spyInactive should be called with `true` arg')

  assert.ok(spyActive.calledTwice, 'spyActive called twice at last')
})
