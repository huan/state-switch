/**
 *
 * StateSwitch for easy managing the states with async programming
 *
 * Class StateSwitch
 * Licenst: Apache-2.0
 * https://github.com/huan/state-switch
 *
 * Helper Class for Manage State Change
 */
import { EventEmitter } from 'events'
import type { Loggable } from 'brolog'
import { getLoggable }  from 'brolog'
import NOP              from 'nop'

import {
  VERSION,
}                       from './version.js'
import type {
  StateSwitchInterface,
  StateSwitchOptions,
}                       from './interface.js'

/**
 * Using Three Valued Logic for ON/OFF State
 *  https://github.com/huan/state-switch/issues/1
 *
 * Three-valued Logic (3VL): `true`, `false`, and
 *  'pending': it's in process, not stable.
 */
type Pending = 'pending'
type StateType =
  | 'active'
  | 'inactive'
  // `on` & `off` are deprecated. use `active` and `inactive` instead
  | 'on'
  | 'off'

let COUNTER = 0

export class StateSwitch extends EventEmitter implements StateSwitchInterface {

  protected _log: Loggable

  protected _activePromise:   Promise<void>
  protected _inactivePromise: Promise<void>

  protected _activeResolver:    Function
  protected _inactiveResolver:  Function

  protected _isActive   : boolean
  protected _isPending  : boolean

  constructor (
    protected readonly _name = `StateSwitch#${COUNTER++}`,
    protected readonly _options: StateSwitchOptions = {},
  ) {
    super()

    this._log = getLoggable(_options.log)
    this._log.verbose('StateSwitch', 'constructor(%s, "%s")',
      _name,
      JSON.stringify(_options),
    )

    this._isActive   = false
    this._isPending = false

    /**
     * for ready()
     */
    this._inactiveResolver = NOP
    this._activePromise = new Promise<void>(resolve => {
      this._activeResolver = resolve
    })

    this._inactivePromise = Promise.resolve()
  }

  name (): string {
    return this._name
  }

  version (): string {
    return VERSION
  }

  /**
   * @deprecated will be removed after Dec 31, 2022
   */
  setLog (logInstance?: any) {
    this._log = getLoggable(logInstance)
  }

  /**
   * Get the current ON state (3VL).
   */
  active (): boolean | Pending
  /**
   * Turn on the current state.
   * @param state
   *  `Pending` means we entered the turn on async process
   *  `true` means we have finished the turn on async process.
   */
  active (state: true | Pending): void

  active (state: never): never
  active (
    state?: true | Pending,
  ): void | boolean | Pending {
    /**
     * Set
     */
    if (state) {
      this._log.verbose('StateSwitch', '<%s> on(%s) <- (%s)',
        this._name,
        state,
        this.active(),
      )

      this._isActive = true
      this._isPending = (state === 'pending')

      this.emit('active', state)
      /**
       * @deprecated `on` event will be removed after Dec 31, 2022
       */
      this.emit('on', state)

      /**
        * for ready()
        */
      if (this._inactiveResolver === NOP) {
        this._inactivePromise = new Promise<void>(resolve => (this._inactiveResolver = resolve))
      }
      if (state === true && this._activeResolver !== NOP) {
        this._activeResolver()
        this._activeResolver = NOP
      }

      return
    }

    /**
     * Get
     */
    const activeState = this._isActive
      ? this._isPending ? 'pending' : true
      : false
    this._log.silly('StateSwitch', '<%s> on() is %s', this._name, activeState)
    return activeState
  }

  /**
   * Get the current OFF state (3VL).
   */
  inactive (): boolean | Pending

  /**
   * Turn off the current state.
   * @param state
   *  `Pending` means we entered the turn off async process
   *  `true` means we have finished the turn off async process.
   */
  inactive (state: true | Pending): void

  inactive (state: never): never
  inactive (
    state?: true | Pending,
  ): void | boolean | Pending {
    /**
     * Set
     */
    if (state) {
      this._log.verbose('StateSwitch', '<%s> off(%s) <- (%s)',
        this._name,
        state,
        this.inactive(),
      )
      this._isActive  = false
      this._isPending = (state === 'pending')

      this.emit('inactive', state)
      /**
       * @deprecated `off` event will be removed after Dec 31, 2022
       */
      this.emit('off', state)

      /**
        * for ready()
        */
      if (this._activeResolver === NOP) {
        this._activePromise = new Promise<void>(resolve => (this._activeResolver = resolve))
      }
      if (state === true && this._inactiveResolver !== NOP) {
        this._inactiveResolver()
        this._inactiveResolver = NOP
      }

      return
    }

    /**
     * Get
     */
    const inactiveState = !this._isActive
      ? this._isPending ? 'pending' : true
      : false
    this._log.silly('StateSwitch', '<%s> off() is %s', this._name, inactiveState)
    return inactiveState
  }

  /**
   * @deprecate use `active()` instead. will be removed after Dec 31, 2022
   */
  on (state: any): any {
    this._log.error('StateSwitch', 'on() is deprecated: use active() instead.\n%s', new Error().stack)
    return this.active(state)
  }

  /**
   * @deprecate use `inactive()` instead. will be removed after Dec 31, 2022
   */
  off (state: any): any {
    this._log.error('StateSwitch', 'off() is deprecated: use inactive() instead.\n%s', new Error().stack)
    return this.inactive(state)
  }

  /**
   * does the state is not stable(in process)?
   */
  pending () {
    this._log.silly('StateSwitch', '<%s> pending() is %s', this._name, this._isPending)
    return this._isPending
  }

  /**
   * Wait the pending state to be stable.
   */
  async stable (
    state?: StateType,
    noCross = false,
  ): Promise<void> {
    this._log.verbose('StateSwitch', '<%s> stable(%s, noCross=%s)', this._name, state, noCross)

    if (typeof state === 'undefined') {
      state = this._isActive ? 'active' : 'inactive'
    }

    if (state === 'active' || state === 'on') {
      if (this._isActive === false && noCross === true) {
        throw new Error('stable(active) but the state is inactive. call stable(active, false) to disable noCross')
      }

      await this._activePromise

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (state === 'inactive' || state === 'off') {
      if (this._isActive === true && noCross === true) {
        throw new Error('stable(inactive) but the state is active. call stable(inactive, false) to disable noCross')
      }
      await this._inactivePromise

    } else {
      throw new Error(`should not go here. ${state} should be of type 'never'`)
    }

    this._log.silly('StateSwitch', '<%s> stable(%s, %s) resolved.', this._name, state, noCross)

  }

  /**
   * @deprecated use `stable()` instead. will be removed after Dec 31, 2022
   */
  ready () {
    this._log.error('StateSwitch', 'ready() is deprecated: use stable() instead.\n%s', new Error().stack)
    return this.stable()
  }

  /**
   * Huan(202105): To make RxJS fromEvent happy: type inferencing
   *  https://github.com/ReactiveX/rxjs/blob/92fbdda7c06561bc73dae3c14de3fc7aff92bbd4/src/internal/observable/fromEvent.ts#L39-L50
   */
  addEventListener (
    event: StateType,
    listener: ((payload: true | 'pending') => void),
  ): void {
    super.addListener(event, listener)
  }

  removeEventListener (
    event: string,
    listener: ((payload: true | 'pending') => void),
  ): void {
    super.removeListener(event, listener)
  }

}
