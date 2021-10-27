import { StateSwitch }        from './state-switch.js'

class BusyIndicator {

  private state: StateSwitch

  constructor (...args: ConstructorParameters<typeof StateSwitch>) {
    this.state = new StateSwitch(...args)
  }

  /**
   * Set busy state
   * @param b busy or not
   */
  busy (b: boolean): void
  /**
   * Get busy state
   */
  busy (): boolean

  busy (b?: boolean): void | boolean {
    if (typeof b === 'undefined') {
      return !!(this.state.active())
    }

    if (b) {
      this.state.active(true)
    } else {
      this.state.inactive(true)
    }
  }

  /**
   * Return a Promise that resolves when the busy state is off
   */
  async idle (): Promise<void> {
    await this.state.stable('inactive')
  }

  /**
   * @deprecated use idle() instead
   */
  async available (): Promise<void> {
    console.error('available() is deprecated, use idle() instead.\n' + new Error().stack)
    return this.idle()
  }

}

export { BusyIndicator }
