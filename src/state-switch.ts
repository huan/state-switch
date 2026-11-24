/**
 * StateSwitch: change monitor and guarder for asynchronous state transitions.
 * Supports Three-Valued Logic (3VL): true, false, and 'pending'.
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

    this._activePromise   = this.initPromise('active')
    this._inactivePromise = this.initPromise('inactive')
  }

  public version (): string {
    return VERSION
  }

  public name (): string {
    return this._name
  }

  private initPromise (type: StateType): Promise<void> {
    this._log.verbose('StateSwitch', 'initPromise(%s)', type)

    const isTargetActive = type === 'active'

    if (this._isActive === isTargetActive && !this._isPending) {
      this._log.verbose('StateSwitch', 'initPromise(%s) resolved because this._isActive === %s and not pending',
        type,
        this._isActive,
      )
      return Promise.resolve()
    }

    return new Promise<void>(resolve => {
      this._log.verbose('StateSwitch', 'initPromise(%s) new Promise()', type)
      if (isTargetActive) {
        this._activeResolver = resolve
      } else {
        this._inactiveResolver = resolve
      }
    })
  }

  public active (): boolean | Pending
  public active (state: true | Pending): void

  public active (state?: true | Pending): void | boolean | Pending {
    if (typeof state === 'undefined') {
      return this._isPending
        ? 'pending'
        : this._isActive
    }

    this._log.verbose('StateSwitch', 'active(%s)', state)

    if (state === 'pending') {
      this._isPending = true
      this._isActive  = false
      this._activePromise = this.initPromise('active')

      this.emit('active', 'pending')
      return
    }

    this._isPending = false
    this._isActive  = true

    if (!isNop(this._activeResolver)) {
      this._log.verbose('StateSwitch', 'active(true) resolving activeResolver')
      this._activeResolver()
      this._activeResolver = nop
    }

    this._inactivePromise = this.initPromise('inactive')

    this.emit('active', true)
  }

  public inactive (): boolean | Pending
  public inactive (state: true | Pending): void

  public inactive (state?: true | Pending): void | boolean | Pending {
    if (typeof state === 'undefined') {
      return this._isPending
        ? 'pending'
        : !this._isActive
    }

    this._log.verbose('StateSwitch', 'inactive(%s)', state)

    if (state === 'pending') {
      this._isPending = true
      this._isActive  = true
      this._inactivePromise = this.initPromise('inactive')

      this.emit('inactive', 'pending')
      return
    }

    this._isPending = false
    this._isActive  = false

    if (!isNop(this._inactiveResolver)) {
      this._log.verbose('StateSwitch', 'inactive(true) resolving inactiveResolver')
      this._inactiveResolver()
      this._inactiveResolver = nop
    }

    this._activePromise = this.initPromise('active')

    this.emit('inactive', true)
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
      if (this._isPending) {
        expectedState = this._isActive ? 'inactive' : 'active'
      } else {
        expectedState = this._isActive ? 'active'   : 'inactive'
      }
    }

    if (noCross) {
      if (this.pending()) {
        throw new Error('StateSwitch.stable() failed because noCross is true and state is pending')
      }
      if (expectedState === 'active' && !this._isActive) {
        throw new Error('StateSwitch.stable() failed because noCross is true and expectedState is active but state is inactive')
      }
      if (expectedState === 'inactive' && this._isActive) {
        throw new Error('StateSwitch.stable() failed because noCross is true and expectedState is inactive but state is active')
      }
    }

    if (expectedState === 'active') {
      await this._activePromise
    } else if (expectedState === 'inactive') {
      await this._inactivePromise
    } else {
      throw new Error('unsupported expectedState: ' + expectedState)
    }
  }

}
