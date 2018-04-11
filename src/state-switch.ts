/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class StateSwitch
 * Licenst: Apache-2.0
 * https://github.com/zixia/state-switcher
 *
 * Helper Class for Manage State Change
 */
const NOP = require('nop')

import { version }  from '../package.json'
export const VERSION = version

// 'pending': it's in process, not stable.
export type Pending = 'pending'

export class StateSwitch {
  private _on     : boolean
  private _pending: boolean

  private log: any

  private onPromise:    Promise<void>
  private offPromise:   Promise<void>

  private onResolver:   Function
  private offResolver:  Function

  constructor(
    private _name = 'Lock',
    logInstance?: any,
  ) {
    if (logInstance) {
      this.setLog(logInstance) // init log, should be a Brolog or Npmlog instance
    } else {
      this.setLog(null)
    }
    this.log.verbose('StateSwitch', 'constructor(name=%s)', _name)

    this._on      = false
    this._pending = false

    /**
     * for ready()
     */
    this.offPromise = Promise.resolve()
    this.onPromise  = new Promise<void>(r => {
      this.onResolver = r
    })
    this.offResolver = NOP

  }

  public version(): string {
    return VERSION
  }

  public setLog(logInstance?: any) {
    if (logInstance) {
      this.log = logInstance
    } else {
      this.log = {
        silly(...args)    { /* nop */ },
        verbose(...args)  { /* nop */ },
        warn(...args)     { /* nop */ },
        error(...args)    { /* nop */ },
      }
    }
  }

  public on()                     : boolean | Pending
  public on(state: true | Pending): void
  public on(state: never)         : never
  /**
   * set/get ON state
   */
  public on(state?: true | Pending): boolean | Pending | void {
    if (state) {
      this.log.verbose('StateSwitch', '<%s> on(%s) <- (%s)',
                                      this._name,
                                      state,
                                      this.on(),
                      )

      this._on = true
      this._pending = (state === 'pending')

      /**
       * for ready()
       */
      if (this.offResolver === NOP) {
        this.offPromise = new Promise<void>(r => this.offResolver = r)
      }
      if (state === true && this.onResolver !== NOP) {
        this.onResolver()
        this.onResolver = NOP
      }

      return
    }

    const on = this._on
                ? this._pending ? 'pending' : true
                : false
    this.log.silly('StateSwitch', '<%s> on() is %s', this._name, on)
    return on
  }

  public off()                     : boolean | Pending
  public off(state: true | Pending): void
  public off(state: never)         : never

  /**
   * set/get OFF state
   */
  public off(state?: true | Pending): boolean | Pending | void {
    if (state) {
      this.log.verbose('StateSwitch', '<%s> off(%s) <- (%s)',
                                  this._name,
                                  state,
                                  this.off(),
                      )
      this._on      = false
      this._pending = (state === 'pending')

      /**
       * for ready()
       */
      if (this.onResolver === NOP) {
        this.onPromise = new Promise<void>(r => this.onResolver = r)
      }
      if (state === true && this.offResolver !== NOP) {
        this.offResolver()
        this.offResolver = NOP
      }

      return
    }

    const off = !this._on
                ? this._pending ? 'pending' : true
                : false
    this.log.silly('StateSwitch', '<%s> off() is %s', this._name, off)
    return off
  }

  public async ready(
    state: 'on' | 'off' = 'on',
    noCross             = false,
  ): Promise<void> {
    this.log.verbose('StateSwitch', 'ready(%s, %s)', state, noCross)

    if (state === 'on') {
      if (this._on === false && noCross === true) {
        throw new Error(`ready(on) but the state is off. call ready(on, true) to force crossWait`)
      }
      await this.onPromise
    } else {  // state === off
      if (this._on === true && noCross === true) {
        throw new Error('ready(off) but the state is on. call ready(off, true) to force crossWait')
      }
      await this.offPromise
    }

    this.log.silly('StateSwitch', 'ready(%s, %s)-ed.', state, noCross)

  }

  /**
   * does the state is not stable(in process)?
   */
  public pending() {
    this.log.silly('StateSwitch', '<%s> pending() is %s', this._name, this._pending)
    return this._pending
  }

  /**
   * get the client name
   */
  public name() {
    return this._name
  }
}

export default StateSwitch
