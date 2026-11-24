/**
 * Typing and runtime test for RxJS fromEvent compatibility with StateSwitch.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  type Observable,
  fromEvent as rxFromEvent,
  firstValueFrom,
}                             from 'rxjs'
import type {
  FromEvent,
}                             from 'typed-emitter/rxjs/index.js'
import {
  StateSwitch,
  type StateSwitchInterface,
}                         from '../src/mod.ts'
import type { Pending }   from '../src/events.ts'

const fromEvent: FromEvent = rxFromEvent

test('RxJS: fromEvent type inference', async () => {
  const state = new StateSwitch()
  const event$: Observable<true | 'pending'> = fromEvent(state, 'active')

  const future = firstValueFrom(event$)
  state.active('pending')

  const result: true | 'pending' = await future
  assert.equal(result, 'pending', 'should get "pending" result')
})

test('RxJS: fromEvent stream for the second value', async () => {
  const state = new StateSwitch()
  const event$ = fromEvent(state, 'inactive')
  state.inactive('pending')

  const future = firstValueFrom(event$)
  state.inactive(true)

  const result = await future
  assert.equal(result, true, 'should get "true" result')
})

test('RxJS: fromEvent with StateSwitchInterface', async () => {
  const state: StateSwitchInterface = new StateSwitch()
  const event$ = fromEvent<true | Pending>(state as any, 'active')
  state.active('pending')

  const future = firstValueFrom(event$)
  state.active(true)

  const result = await future
  assert.equal(result, true, 'should get "true" result')
})
