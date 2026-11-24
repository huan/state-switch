/**
 * Type interface compliance tests for StateSwitch and BusyIndicator.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type {
  StateSwitchInterface,
  BusyIndicatorInterface,
}                         from './interfaces.ts'
import { StateSwitch }    from './state-switch.ts'
import { BusyIndicator }  from './busy-indicator.ts'

test('StateSwitchInterface compliance', () => {
  const ss: StateSwitchInterface = new StateSwitch()
  assert.equal(typeof ss, 'object', 'should instantiate StateSwitchInterface')
})

test('BusyIndicatorInterface compliance', () => {
  const bi: BusyIndicatorInterface = new BusyIndicator()
  assert.equal(typeof bi, 'object', 'should instantiate BusyIndicatorInterface')
})
