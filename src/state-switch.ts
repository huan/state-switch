/**
 * StateSwitch: change monitor and guarder for asynchronous state transitions.
 * Supports Three-Valued Logic (3VL): true, false, and 'pending'.
 *
 * `active('pending')` means a turn-on is in flight (`active()` is `'pending'`,
 * `inactive()` is `false`). `inactive('pending')` is the opposite. Readiness
 * promises are armed once and reused until they settle, so `stable()` waiters
 * survive a later pending/true pair and the opposite promise is rearmed when
 * its stable state is left.
 */
import type { Loggable } from 'brolog'
import { getLoggable }  from 'brolog'

import {
  VERSION,
}                           from './version.ts'
import type {
  StateSwitchInterface,
  StateSwitchOptions,
}                           from './interfaces.ts'
import {
  StateSwitchEventEmitter,
  type Pending,
  type StateType,
}                           from './events.ts'

const nop = (..._args: unknown[]): void => {}
const isNop = (arg: unknown): boolean => arg === nop

let COUNTER = 0

export class StateSwitch extends StateSwitchEventEmitter implements StateSwitchInterface {

  protected _log: Loggable

  protected _activePromise:   Promise<void>
  protected _inactivePromise: Promise<void>

  protected _activeResolver:    Function
  protected _inactiveResolver:  Function

  protected _isActive   : boolean
  protected _isPending  : boolean

  protected readonly _name: string
  protected readonly _options: StateSwitchOptions

  constructor (
    name = `StateSwitch#${COUNTER++}`,
    options: StateSwitchOptions = {},
  ) {
    super()

    this._name = name
    this._options = options

    this._log = getLoggable(this._options.log)
    this._log.verbose('StateSwitch', 'constructor(%s, "%s")',
      this._name,
      JSON.stringify(this._options),
    )

    this._isActive  = false
    this._isPending = false

    this._activeResolver    = nop
    this._inactiveResolver  = nop

    // Inactive is the initial stable state. The active promise stays pending
    // until the first successful turn-on.
    this._activePromise = new Promise<void>(resolve => {
      this._activeResolver = resolve
    })
    this._inactivePromise = Promise.resolve()
  }

  public version (): string {
    return VERSION
  }

  public name (): string {
    return this._name
  }

  /**
   * Open a fresh readiness promise only when the previous one has settled.
   * Replacing an outstanding resolver would leave existing `stable()` waiters
   * pending forever.
   */
  private arm (which: StateType): void {
    if (which === 'active') {
      if (!isNop(this._activeResolver)) {
        return
      }
      this._activePromise = new Promise<void>(resolve => {
        this._activeResolver = resolve
      })
      return
    }

    if (!isNop(this._inactiveResolver)) {
      return
    }
    this._inactivePromise = new Promise<void>(resolve => {
      this._inactiveResolver = resolve
    })
  }

  private settle (which: StateType): void {
    if (which === 'active') {
      if (isNop(this._activeResolver)) {
        return
      }
      this._log.verbose('StateSwitch', 'active(true) resolving activeResolver')
      this._activeResolver()
      this._activeResolver = nop
      return
    }

    if (isNop(this._inactiveResolver)) {
      return
    }
    this._log.verbose('StateSwitch', 'inactive(true) resolving inactiveResolver')
    this._inactiveResolver()
    this._inactiveResolver = nop
  }

  public active (): boolean | Pending
  public active (state: true | Pending): void

  public active (state?: true | Pending): void | boolean | Pending {
    /**
     * Get. `'pending'` only while turning on; the opposite side stays `false`.
     */
    if (typeof state === 'undefined') {
      return this._isActive
        ? this._isPending ? 'pending' : true
        : false
    }

    this._log.verbose('StateSwitch', 'active(%s)', state)

    this._isActive  = true
    this._isPending = state === 'pending'

    // Leave the stable inactive state before listeners observe the transition.
    this.arm('inactive')
    this.emit('active', state)

    if (state === true) {
      this.settle('active')
    }
  }

  public inactive (): boolean | Pending
  public inactive (state: true | Pending): void

  public inactive (state?: true | Pending): void | boolean | Pending {
    /**
     * Get. `'pending'` only while turning off; the opposite side stays `false`.
     */
    if (typeof state === 'undefined') {
      return !this._isActive
        ? this._isPending ? 'pending' : true
        : false
    }

    this._log.verbose('StateSwitch', 'inactive(%s)', state)

    this._isActive  = false
    this._isPending = state === 'pending'

    this.arm('active')
    this.emit('inactive', state)

    if (state === true) {
      this.settle('inactive')
    }
  }

  public pending (): boolean {
    return this._isPending
  }

  public async stable (
    expectedState?: StateType,
    noCross = false,
  ): Promise<void> {
    this._log.verbose('StateSwitch', 'stable(%s, %s)', expectedState, noCross)

    if (!expectedState) {
      // `_isActive` is the transition target while pending, and the stable
      // side otherwise, so the default follows the direction already in flight.
      expectedState = this._isActive ? 'active' : 'inactive'
    }

    if (expectedState === 'active') {
      if (noCross && this._isActive === false) {
        throw new Error('stable(active) but the state is inactive. call stable(active, false) to disable noCross')
      }
      await this._activePromise
      return
    }

    if (expectedState === 'inactive') {
      if (noCross && this._isActive === true) {
        throw new Error('stable(inactive) but the state is active. call stable(inactive, false) to disable noCross')
      }
      await this._inactivePromise
      return
    }

    throw new Error('unsupported expectedState: ' + expectedState)
  }

}
