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
        try {
          await timeoutPromise(
            this.state.stable('inactive'),
            TIMEOUT_SECONDS * 1000,
          )
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'start() found that is stopping, waiting stable ... done')
        } catch (e) {
          this.emit('error', e)
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'start() found that is stopping, waiting stable ... timeout')
        }
      }

      this.state.active('pending')

      try {
        if (typeof super.start === 'function') {
          await super.start()
        }
        await this.onStart()
      } catch (e) {
        this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'start() exception: %s', (e as Error).message)
        // Drop the in-flight turn-on before publishing inactive, or a later
        // stop() treats the controller as already stopped and skips cleanup.
        const cleanupErrors = await this.__serviceCtlShutdown()
        this.state.inactive(true)
        this.__serviceCtlEmitErrors([ e, ...cleanupErrors ])
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
        try {
          await timeoutPromise(
            this.state.stable('active'),
            TIMEOUT_SECONDS * 1000,
          )
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'stop() found that is starting, waiting stable ... done')
        } catch (e) {
          this.emit('error', e)
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'stop() found that is starting, waiting stable ... timeout')
        }
      }

      this.state.inactive('pending')

      const cleanupErrors = await this.__serviceCtlShutdown()
      // A failed child hook must not put the controller back to active, and
      // must not skip the parent. The service is stopped either way.
      this.state.inactive(true)
      this.__serviceCtlEmitErrors(cleanupErrors)
    }

    public async reset () : Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtl<${serviceCtlName}>`, 'reset()')

      if (this.__serviceCtlResettingIndicator.busy()) {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() found that is resetting, waiting idle ... (max %s seconds)', RESET_TIMEOUT_SECONDS)
        try {
          await timeoutPromise(
            this.__serviceCtlResettingIndicator.idle(),
            RESET_TIMEOUT_SECONDS * 1000,
          )
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() found that is resetting, waiting idle ... done')
        } catch (e) {
          this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'reset() timeout: %s', (e as Error).message)
          this.emit('error', e)
          throw e
        }
        return
      }

      if (this.state.inactive()) {
        this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() found that is NOT active, doing nothing')
        return
      }

      this.__serviceCtlResettingIndicator.busy(true)

      try {
        try {
          await timeoutPromise(
            this.state.stable(),
            3 * TIMEOUT_SECONDS * 1000,
          )
        } catch (e) {
          this.emit('error', e)
          this.__serviceCtlLogger.warn(`ServiceCtl<${serviceCtlName}>`, 'reset() wait stable timeout: %s', (e as Error).message)
        }

        await this.stop()
        await this.start()
      } finally {
        this.__serviceCtlResettingIndicator.busy(false)
      }
    }

    /**
     * Child hook first, then the parent. Each failure is recorded and does not
     * cancel the other hook.
     */
    async __serviceCtlShutdown (): Promise<unknown[]> {
      const errors: unknown[] = []

      try {
        await this.onStop()
      } catch (e) {
        this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'stop() onStop() exception: %s', (e as Error).message)
        errors.push(e)
      }

      if (typeof super.stop === 'function') {
        try {
          await super.stop()
        } catch (e) {
          this.__serviceCtlLogger.error(`ServiceCtl<${serviceCtlName}>`, 'stop() super.stop() exception: %s', (e as Error).message)
          errors.push(e)
        }
      }

      return errors
    }

    __serviceCtlEmitErrors (errors: readonly unknown[]): void {
      for (const e of errors) {
        this.emit('error', e)
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
