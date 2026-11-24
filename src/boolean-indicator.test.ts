/**
 * Unit tests for BooleanIndicator: initial state and ready() synchronization.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { BooleanIndicator } from './boolean-indicator.ts'

test('BooleanIndicator init state', async () => {
  const indicator = new BooleanIndicator()

  assert.equal(indicator.value(), false, 'should not be true after init')
  await assert.doesNotReject(() => indicator.ready(false), 'should be ready(false) after init')
})

test('BooleanIndicator set true', async () => {
  let callCount = 0
  const spy = () => { callCount++ }

  const indicator = new BooleanIndicator()

  indicator.value(true)
  assert.equal(indicator.value(), true, 'should be true after set true')

  indicator.ready(false).then(spy).catch(assert.fail)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 0, 'should not resolve ready(false) when true')

  indicator.value(true)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 0, 'a repeated value(true) must not drop the ready(false) waiter')

  indicator.value(false)
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(callCount, 1, 'ready(false) resolves once the value is false')
})
