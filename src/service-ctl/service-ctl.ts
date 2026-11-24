/**
 * ServiceCtl: async lifecycle controller mixin providing start, stop, and reset operations.
 */
import { getLoggable }    from 'brolog'
import type { Loggable }  from 'brolog'
import { timeoutPromise } from 'gerror'

import type {
  ServiceCtlInterface,
  StateSwitchOptions,
  StateSwitchInterface,
}                               from '../interfaces.ts'
import { ServiceableAbstract }  from '../interfaces.ts'
import { StateSwitch }          from '../state-switch.ts'
import { BusyIndicator }        from '../busy-indicator.ts'
import { VERSION }              from '../version.ts'

const TIMEOUT_SECONDS = 5
const RESET_TIMEOUT_SECONDS = TIMEOUT_SECONDS * 3

const serviceCtlMixin = (
  serviceCtlName = 'ServiceCtl',
  options? : StateSwitchOptions,
) => <SuperClass extends typeof ServiceableAbstract> (superClass: SuperClass) => {

  abstract class ServiceCtlMixin extends superClass implements ServiceCtlInterface {

    static VERSION = VERSION

    state: StateSwitchInterface

    __serviceCtlResettingIndicator : BusyIndicator
    __serviceCtlLogger             : Loggable

    constructor (...args: any[]) {
      super(...args)

      this.__serviceCtlLogger = getLoggable(options?.log)
      this.__serviceCtlLogger.verbose(`ServiceCtl<${serviceCtlName}>`, 'constructor()')

      this.state = new StateSwitch(serviceCtlName, options)
      this.__serviceCtlResettingIndicator = new BusyIndicator(serviceCtlName + 'Reset', options)
    }

    override async start () : Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtl<${serviceCtlName}>`, 'start()')

      if (this.state.active()) {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'start() found that is starting/statred ...')
        await this.state.stable('active')
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'start() found that is starting/statred ... done')
        return
      }

      if (this.state.inactive() === 'pending') {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'start() found that is stopping, waiting stable ... (max %s seconds)', TIMEOUT_SECONDS)
        await timeoutPromise(
          this.state.stable('inactive'),
          TIMEOUT_SECONDS * 1000,
        ).catch(e => {
          this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'start() timeout: %s', (e as Error).message)
        })
      }

      this.state.active('pending')

      try {
        if (typeof super.start === 'function') {
          await super.start()
        }
        await this.onStart()
      } catch (e) {
        this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'start() exception: %s', (e as Error).message)
        this.state.inactive(true)
        throw e
      }

      this.state.active(true)
    }

    override async stop () : Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtl<${serviceCtlName}>`, 'stop()')

      if (this.state.inactive()) {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'stop() found that is stopping/stopped ...')
        await this.state.stable('inactive')
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'stop() found that is stopping/stopped ... done')
        return
      }

      if (this.state.active() === 'pending') {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'stop() found that is starting, waiting stable ... (max %s seconds)', TIMEOUT_SECONDS)
        await timeoutPromise(
          this.state.stable('active'),
          TIMEOUT_SECONDS * 1000,
        ).catch(e => {
          this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'stop() timeout: %s', (e as Error).message)
        })
      }

      this.state.inactive('pending')

      try {
        await this.onStop()
        if (typeof super.stop === 'function') {
          await super.stop()
        }
      } catch (e) {
        this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'stop() exception: %s', (e as Error).message)
        this.state.active(true)
        throw e
      }

      this.state.inactive(true)
    }

    public async reset () : Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtl<${serviceCtlName}>`, 'reset()')

      if (this.__serviceCtlResettingIndicator.busy()) {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() found that is resetting, waiting idle ... (max %s seconds)', RESET_TIMEOUT_SECONDS)
        await timeoutPromise(
          this.__serviceCtlResettingIndicator.idle(),
          RESET_TIMEOUT_SECONDS * 1000,
        ).catch(e => {
          this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'reset() timeout: %s', (e as Error).message)
        })
        return
      }

      this.__serviceCtlResettingIndicator.busy(true)

      try {
        if (this.state.active()) {
          await this.stop()
          await this.start()
        } else {
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() found that is NOT active, doing nothing')
        }
      } finally {
        this.__serviceCtlResettingIndicator.busy(false)
      }
    }

    abstract onStart (): Promise<void> | void
    abstract onStop  (): Promise<void> | void

  }

  return ServiceCtlMixin
}

const ServiceCtl = serviceCtlMixin()(ServiceableAbstract)
type ServiceCtl = InstanceType<typeof ServiceCtl>

export {
  ServiceCtl,
  serviceCtlMixin,
}
