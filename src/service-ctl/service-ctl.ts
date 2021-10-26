/**
 * Licenst: Apache-2.0
 * https://github.com/huan/state-switch
 */
import { EventEmitter } from 'events'
import { Constructor }  from 'clone-class'

import {
  ServiceCtlInterface,
  StateSwitchOptions,
}                               from '../interface.js'
import { StateSwitch }          from '../state-switch.js'
import { BusyIndicator }        from '../busy-indicator.js'
import { VERSION }              from '../version.js'
import { nopLogger }            from '../nop-logger.js'

import { timeoutPromise } from './timeout-promise.js'

/**
 * Wait from unknown state
 */
const TIMEOUT_SECONDS = 5

const serviceCtlMixin = (
  serviceCtlName = 'ServiceCtl',
  options? : StateSwitchOptions,
) => <SuperClass extends Constructor<{ emit: Function }>> (superClass: SuperClass) => {

  abstract class ServiceCtlMixin extends superClass implements ServiceCtlInterface {

    static VERSION = VERSION

    _serviceCtlStateSwitch         : StateSwitch
    _serviceCtlBusyIndicator : BusyIndicator
    _serviceCtlLog           : any            // BrologInterface

    constructor (...args: any[]) {
      super(...args)

      this._serviceCtlStateSwitch         = new StateSwitch(serviceCtlName,   options?.log)
      this._serviceCtlBusyIndicator = new BusyIndicator(serviceCtlName, options?.log)

      this._serviceCtlLog = options?.log || nopLogger()
    }

    async start () : Promise<void> {
      if (this._serviceCtlStateSwitch.on()) {
        this._serviceCtlLog.warn(serviceCtlName, 'start() found that is starting/statred...')
        await this._serviceCtlStateSwitch.ready('on')
        this._serviceCtlLog.warn(serviceCtlName, 'start() found that is starting/statred... done')
        return
      }

      if (this._serviceCtlStateSwitch.off() === 'pending') {
        this._serviceCtlLog.warn(serviceCtlName, 'start() found that is stopping...')

        try {
          this._serviceCtlLog.warn('Wechaty', 'start() found that is stopping, waiting stable ... (max %s seconds)', TIMEOUT_SECONDS)
          await timeoutPromise(
            this._serviceCtlStateSwitch.ready('off'),
            TIMEOUT_SECONDS * 1000,
          )
          this._serviceCtlLog.warn('Wechaty', 'start() found that is stopping, waiting stable ... done')
        } catch (e) {
          this.emit('error', e)
          this._serviceCtlLog.warn('Wechaty', 'start() found that is stopping, waiting stable ... timeout')
        }
      }

      this._serviceCtlStateSwitch.on('pending')

      try {
        this._serviceCtlLog.verbose(serviceCtlName, 'start() this.onStart() ...')
        await this.onStart()
        this._serviceCtlLog.verbose(serviceCtlName, 'start() this.onStart() done')

        /**
         * the service has been successfully started
         */
        this._serviceCtlStateSwitch.on(true)

      } catch (e) {
        this.emit('error', e)
        await this.stop()
        throw e
      }
    }

    async stop (): Promise<void> {
      this._serviceCtlLog.verbose(serviceCtlName, 'stop()')

      if (this._serviceCtlStateSwitch.off()) {
        this._serviceCtlLog.warn(serviceCtlName, 'stop() found that is stopping/stopped...')
        await this._serviceCtlStateSwitch.ready()
        this._serviceCtlLog.warn(serviceCtlName, 'stop() found that is stopping/stopped... done')
        return
      }

      if (this._serviceCtlStateSwitch.on() === 'pending') {
        this._serviceCtlLog.warn(serviceCtlName, 'stop() found that is starting...')

        try {
          this._serviceCtlLog.warn('Wechaty', 'stop() found that is starting, waiting stable ... (max %s seconds)', TIMEOUT_SECONDS)
          await timeoutPromise(
            this._serviceCtlStateSwitch.ready('on'),
            TIMEOUT_SECONDS * 1000,
          )
          this._serviceCtlLog.warn('Wechaty', 'stop() found that is starting, waiting stable ... done')
        } catch (e) {
          this.emit('error', e)
          this._serviceCtlLog.warn('Wechaty', 'stop() found that is starting, waiting stable ... timeout')
        }
      }

      this._serviceCtlStateSwitch.off('pending')

      try {
        this._serviceCtlLog.verbose(serviceCtlName, 'stop() this.stop() ...')
        await this.onStop()
        this._serviceCtlLog.verbose(serviceCtlName, 'stop() this.stop() done')
      } catch (e) {
        this.emit('error', e)
      }

      /**
       * no matter whether the `try {...}` code success or not
       *  set the service state to off(stopped) state
       */
      this._serviceCtlStateSwitch.off(true)
    }

    async reset (): Promise<void> {
      this._serviceCtlLog.verbose(serviceCtlName, 'reset()')

      /**
       * Do not start Service if it's OFF
       */
      if (this._serviceCtlStateSwitch.off()) {
        this._serviceCtlLog.verbose(serviceCtlName, 'reset() `state` is `off`, do nothing')
        return
      }

      /**
       * Do not reset again if it's already resetting
       */
      if (this._serviceCtlBusyIndicator.busy()) {
        this._serviceCtlLog.verbose(serviceCtlName, 'reset() `resetBusy` is `busy`, wait `idle()`...')
        try {
          await timeoutPromise(
            this._serviceCtlBusyIndicator.idle(),
            3 * TIMEOUT_SECONDS * 1000,
            () => new Error('wait resetting timeout'),
          )
          this._serviceCtlLog.verbose(serviceCtlName, 'reset() `resetBusy` is `busy`, wait `idle()` done')

          return

        } catch (e) {
          this.emit('error', e)
          this._serviceCtlLog.verbose(serviceCtlName, 'reset() `resetBusy` is `busy`, wait `idle()` timeout')
        }
      }

      this._serviceCtlBusyIndicator.busy(true)

      try {
        /**
         * If the Service is starting/stopping, wait for it
         * The state will be `'on'` after await `ready()`
         */
        try {
          this._serviceCtlLog.verbose(serviceCtlName, 'reset() wait state ready() ...')
          await timeoutPromise(
            this._serviceCtlStateSwitch.ready(),
            3 * TIMEOUT_SECONDS * 1000,
            () => new Error('state.ready() timeout'),
          )
          this._serviceCtlLog.verbose(serviceCtlName, 'reset() wait state ready() done')
        } catch (e) {
          this.emit('error', e)
          this._serviceCtlLog.verbose(serviceCtlName, 'reset() wait state ready() timeout')
        }

        await this.stop()
        await this.start()

      } catch (e) {
        this.emit('error', e)
        this._serviceCtlLog.warn(serviceCtlName, 'reset() rejection: %s', (e as Error).message)

      } finally {
        this._serviceCtlLog.verbose(serviceCtlName, 'reset() done')
        this._serviceCtlBusyIndicator.busy(false)
      }

    }

    abstract onStart (): Promise<void>
    abstract onStop  (): Promise<void>

  }

  return ServiceCtlMixin
}

abstract class ServiceCtl extends serviceCtlMixin()(EventEmitter) {}

export {
  ServiceCtl,
  serviceCtlMixin,
}