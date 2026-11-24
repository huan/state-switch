/**
 * Event listener types and EventEmitter wrapper for StateSwitch active/inactive transitions.
 */
import { EventEmitter }         from 'node:events'
// typed-emitter ships CommonJS types, so NodeNext sees its default export
// under `.default`, as in wechaty's own event schemas.
import type * as TypedEventEmitter from 'typed-emitter'

/**
 * Using Three Valued Logic for ON/OFF State
 *  https://github.com/huan/state-switch/issues/1
 *
 * Three-valued Logic (3VL): `true`, `false`, and
 *  'pending': it's in process, not stable.
 */
type Pending = 'pending'

export type ActiveListener    = (state: true | Pending) => void | Promise<void>
export type InactiveListener  = (state: true | Pending) => void | Promise<void>

interface StateSwitchEventListener {
  active   : ActiveListener
  inactive : InactiveListener
}

const StateSwitchEventEmitter = EventEmitter as unknown as new () =>
  TypedEventEmitter.default<StateSwitchEventListener>

type StateType = keyof StateSwitchEventListener

export type {
  Pending,
  StateType,
}
export {
  StateSwitchEventEmitter,
}
