#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import { test }  from 'tstest'
import {
  expectType,
  expectAssignable,
}                   from 'tsd'

import {
  Observable,
  fromEvent,
  firstValueFrom,
}                 from 'rxjs'
import { HasEventTargetAddRemove } from 'rxjs/internal/observable/fromEvent.js'

import { StateSwitch } from '../src/state-switch.js'

test('StateSwitch satisfy DOM EventTarget: HasEventTargetAddRemove', async t => {
  const state = new StateSwitch()
  expectAssignable<
    HasEventTargetAddRemove<true | 'pending'>
  >(state)

  t.pass('expectAssignable match listener argument typings')
})

test('RxJS: fromEvent type inference', async (t) => {
  const state = new StateSwitch()
  const event$ = fromEvent(state, 'on')
  expectType<Observable<true | 'pending'>>(event$)

  const future = firstValueFrom(event$)
  state.on('pending')

  const result = await future
  expectType<true | 'pending'>(result)
})

test('RxJS: fromEvent stream for the second value', async (t) => {
  const state = new StateSwitch()
  const event$ = fromEvent(state, 'off')
  state.off('pending')

  const future = firstValueFrom(event$)
  state.off(true)

  const result = await future
  t.equal(result, true, 'should get "true" result')
})
