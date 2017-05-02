/**
 *
 * Wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class StateSwitcher
 * Licenst: Apache-2.0
 * https://github.com/zixia/state-switcher
 *
 * Helper Class for Manage State Change
 */

/**
 * A - State A
 * B - State B
 */
export class StateSwitcher <A, B>{
  private _target:  A|B
  private _current: A|B
  private _stable:  boolean

  private log: any

  constructor(
    private _client: string,
    initState: A|B,
    logInstance?: any,
  ) {
    if (logInstance) {
      this.setLog(logInstance) // init log, should be a Brolog or Npmlog instance
    } else {
      this.setLog(null)
    }
    this.log.silly('StateSwitcher', 'constructor(%s, %s)', _client, initState)

    this._target  = initState
    this._current = initState
    this._stable  = true
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
  /**
   * set/get target state
   */
  public target(newState?: A|B): A|B {
    if (newState) {
      this.log.verbose('StateSwitcher', '%s:target(%s) <- (%s)',
                                  this._client,
                                  newState,
                                  this._target,
      )
      this._target = newState
    } else {
      this.log.silly('StateSwitcher', '%s:target() - %s', this._client, this._target)
    }
    return this._target
  }

  /**
   * set/get current state
   * @param stable boolean  true for stable, false for inprocess
   */
  public current(newState?: A|B, stable = true): A|B {
    if (newState) {
      this.log.verbose('StateSwitcher', '%s:current(%s,%s) <- (%s,%s)',
                                  this._client,
                                  newState, stable,
                                  this._current, this._stable,
                )

      /**
       * strict check current is equal to target
       */
      if (this._target !== newState) {
        this.log.warn('StateSwitcher', '%s:current(%s,%s) current is different with target. call state.target(%s) first.',
                                 this._client,
                                 newState, stable,
                                 newState,
        )
        const e = new Error('current not match target')
        this.log.verbose('StateSwitcher', e.stack)
        throw e
      }

      /**
       * warn for inprocess current state change twice, mostly like a logic bug outside
       */
      if (this._current === newState && this._stable === stable
          && stable === false
      ) {
        this.log.warn('StateSwitcher', '%s:current(%s,%s) called but there are already in the same state',
                                  this._client,
                                  newState, stable,
        )
        const e = new Error('current unchange')
        this.log.verbose('StateSwitcher', e.stack)
      }

      this._current = newState
      this._stable  = stable
    } else {
      this.log.silly('StateSwitcher', '%s:current() - %s', this._client, this._current)
    }
    return this._current
  }

  /**
   * does the current state be stable(not inprocess)?
   */
  public stable() {
    this.log.silly('StateSwitcher', '%s:stable() is %s', this._client, this._stable)
    return this._stable
  }

  /**
   * does the current state be inprocess(not stable)?
   */
  public inprocess() {
    this.log.silly('StateSwitcher', '%s:inprocess() %s', this._client, !this._stable)
    return !this._stable
  }

  /**
   * get the client name
   */
  public client() {
    return this._client
  }
}

export default StateSwitcher
