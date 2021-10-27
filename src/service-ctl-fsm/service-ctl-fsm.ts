/**
 * Licenst: Apache-2.0
 * https://github.com/huan/state-switch
 */
import { EventEmitter } from 'events'
import {
  createMachine,
  interpret,
  Interpreter,
}                       from 'xstate'

import { VERSION }              from '../version.js'
import type {
  EmittableConstructor,
  ServiceCtlInterface,
  StateSwitchInterface,
  StateSwitchOptions,
}                             from '../interface.js'

import type {
  ServiceCtlContext,
  ServiceCtlEvent,
  ServiceCtlState,
}                     from './machine-config.js'
import {
  config,
}                     from './machine-config.js'

import { buildMachineOptions }  from './machine-options.js'
import { waitForMachineState }  from './wait-for-selector.js'
import { guardMachineEvent }    from './guard-machine-event.js'
import { getLoggable } from 'brolog'
import type { Loggable } from 'brolog'
import { StateSwitch } from '../state-switch.js'

const serviceCtlFsmMixin = (
  serviceCtlName = 'ServiceCtlFsm',
  options? : StateSwitchOptions,
) => <SuperClass extends EmittableConstructor> (superClass: SuperClass) => {

  abstract class ServiceCtlFsmMixin extends superClass implements ServiceCtlInterface {

    static VERSION = VERSION

    /**
     * Huan(202110): this state is simple record the start/stop status
     */
    state: StateSwitchInterface

    _serviceCtlLog: Loggable
    _serviceCtlFsmInterpreter: Interpreter<
      ServiceCtlContext,
      ServiceCtlState,
      ServiceCtlEvent
    >

    constructor (...args: any[]) {
      super(...args)

      this._serviceCtlLog = getLoggable(options?.log)
      this._serviceCtlLog.verbose(serviceCtlName, 'constructor()')

      this.state = new StateSwitch(serviceCtlName, options)

      const machineOptions = buildMachineOptions({
        // reset: () => has been internally implemented by calling stop() and start()
        start : () => this.onStart(),
        stop  : () => this.onStop(),
      })
      const machine = createMachine(config, machineOptions)

      this._serviceCtlFsmInterpreter = interpret(machine)
      this._serviceCtlFsmInterpreter.start()
    }

    start (): Promise<void> {
      this._serviceCtlLog.verbose(serviceCtlName, 'start()')
      guardMachineEvent(this._serviceCtlFsmInterpreter, 'START')

      const started   = waitForMachineState(this._serviceCtlFsmInterpreter, 'active')
      const canceled  = waitForMachineState(this._serviceCtlFsmInterpreter, 'canceled')

      this._serviceCtlFsmInterpreter.send('START')
      this.state.active(true)

      return Promise.race([
        started,
        canceled,
      ])
    }

    stop (): Promise<void> {
      this._serviceCtlLog.verbose(serviceCtlName, 'stop()')
      guardMachineEvent(this._serviceCtlFsmInterpreter, 'STOP')

      const stopped   = waitForMachineState(this._serviceCtlFsmInterpreter, 'inactive')
      const canceled  = waitForMachineState(this._serviceCtlFsmInterpreter, 'canceled')

      this._serviceCtlFsmInterpreter.send('STOP')
      this.state.inactive(true)

      return Promise.race([
        stopped,
        canceled,
      ])
    }

    reset (): Promise<void> {
      this._serviceCtlLog.verbose(serviceCtlName, 'reset()')
      guardMachineEvent(this._serviceCtlFsmInterpreter, 'RESET')

      const started   = waitForMachineState(this._serviceCtlFsmInterpreter, 'active')
      const canceled  = waitForMachineState(this._serviceCtlFsmInterpreter, 'canceled')

      this._serviceCtlFsmInterpreter.send('RESET')

      // TODO: emit('error' e) if there's any rejections inside `reset()`

      return Promise.race([
        started,
        canceled,
      ])

    }

    abstract onStart (): Promise<void>
    abstract onStop  (): Promise<void>

  }

  return ServiceCtlFsmMixin
}

abstract class ServiceCtlFsm extends serviceCtlFsmMixin()(EventEmitter) {}

export {
  ServiceCtlFsm,
  serviceCtlFsmMixin,
}
