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
import { Constructor }  from 'clone-class'
import {
  createMachine,
  interpret,
  Interpreter,
}                       from 'xstate'

import { VERSION }              from '../version.js'
import {
  ServiceCtlInterface,
  StateSwitchOptions,
}                             from '../interface.js'
// import { nopLogger }            from '../nop-logger.js'

import {
  config,
  ServiceCtlContext,
  ServiceCtlEvent,
  ServiceCtlState,
}                     from './machine-config.js'

import { buildMachineOptions }  from './machine-options.js'
import { waitForMachineState }  from './wait-for-selector.js'
import { guardMachineEvent }    from './guard-machine-event.js'
import { nopLogger } from '../nop-logger.js'

const serviceCtlFsmMixin = (
  serviceCtlName = 'ServiceCtlFsm',
  options? : StateSwitchOptions,
) => <SuperClass extends Constructor<{ emit: Function }>> (superClass: SuperClass) => {

  abstract class ServiceCtlFsmMixin extends superClass implements ServiceCtlInterface {

    static VERSION = VERSION

    _serviceCtlLog: any // BrologInterface
    _serviceCtlFsmInterpreter: Interpreter<
      ServiceCtlContext,
      ServiceCtlState,
      ServiceCtlEvent
    >

    constructor (...args: any[]) {
      super(...args)

      this._serviceCtlLog = options?.log || nopLogger()
      this._serviceCtlLog.verbose(serviceCtlName, 'constructor()')

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
