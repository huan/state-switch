/**
 * Unit tests for BusyIndicator: initial state and idle() synchronization.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BusyIndicator } from './busy-indicator.ts'

test('BusyIndicator init state', async () => {
  const indicator = new BusyIndicator()

  assert.equal(indicator.busy(), false, 'should not be busy after init')
  await assert.doesNotReject(() => indicator.idle(), 'should be idle after init')
})

test('BusyIndicator set busy', async () => {
  let callCount = 0
  const spy = () => { callCount++ }

  const indicator = new BusyIndicator()

  indicator.busy(true)
  assert.equal(indicator.busy(), true, 'should be busy after set busy')

  indicator.idle().then(spy).catch(assert.fail)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 0, 'should not resolve idle() when busy')

  indicator.busy(true)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 0, 'a repeated busy(true) must not drop the idle() waiter')

  indicator.busy(false)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 1, 'idle() resolves once the indicator is idle')
})
