#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import {
  expectType,
}                   from 'tsd'

import {
  Observable,
  fromEvent as rxFromEvent,
  firstValueFrom,
}                             from 'rxjs'
import type {
  FromEvent,
}                             from 'typed-emitter/rxjs'
import {
  StateSwitch,
  StateSwitchInterface,
}                         from '../src/mod.js'
import type { Pending }   from '../src/events.js'

const fromEvent: FromEvent = rxFromEvent

test('RxJS: fromEvent type inference', async t => {
  const state = new StateSwitch()
  const event$ = fromEvent(state, 'active')
  expectType<Observable<true | 'pending'>>(event$)

  const future = firstValueFrom(event$)
  state.active('pending')

  const result = await future
  expectType<true | 'pending'>(result)

  t.pass('RxJS typing ok')
  t.equal(result, 'pending', 'should get "pending" result')
})

test('RxJS: fromEvent stream for the second value', async (t) => {
  const state = new StateSwitch()
  const event$ = fromEvent(state, 'inactive')
  state.inactive('pending')

  const future = firstValueFrom(event$)
  state.inactive(true)

  const result = await future
  t.equal(result, true, 'should get "true" result')
})

test('RxJS: fromEvent with StateSwitchInterface', async (t) => {
  const state: StateSwitchInterface = new StateSwitch()
  const event$ = fromEvent<true | Pending>(state as any, 'active')
  state.active('pending')

  const future = firstValueFrom(event$)
  state.active(true)

  const result = await future
  t.equal(result, true, 'should get "true" result')
})
