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
import { Constructor }  from 'clone-class'
import {
  createMachine,
  interpret,
  Interpreter,
}                       from 'xstate'

import { VERSION } from '../version.js'
import {
  config,
  ServiceCtlContext,
  ServiceCtlEvent,
  ServiceCtlState,
}                     from './machine-config.js'

import { buildMachineOptions }  from './machine-options.js'
import { waitForMachineState }  from './wait-for-selector.js'
import { guardMachineEvent }    from './guard-machine-event.js'

class EmptyClass {}

const serviceCtlMixin = <SuperClass extends Constructor<{}>> (superClass: SuperClass) => {

  abstract class ServiceCtlMixin extends superClass {

    static VERSION = VERSION

    _service: Interpreter<
      ServiceCtlContext,
      ServiceCtlState,
      ServiceCtlEvent
    >

    constructor (...args: any[]) {
      super(...args)

      const machineOptions = buildMachineOptions({
        // reset: () => has been internally implemented by calling stop() and start()
        start : () => this.onStart(),
        stop  : () => this.onStop(),
      })
      const machine = createMachine(config, machineOptions)

      this._service = interpret(machine)
      this._service.start()
    }

    start (): Promise<void> {
      guardMachineEvent(this._service, 'START')

      const started   = waitForMachineState(this._service, 'active')
      const canceled  = waitForMachineState(this._service, 'canceled')

      this._service.send('START')

      return Promise.race([
        started,
        canceled,
      ])
    }

    stop (): Promise<void> {
      guardMachineEvent(this._service, 'STOP')

      const stopped   = waitForMachineState(this._service, 'inactive')
      const canceled  = waitForMachineState(this._service, 'canceled')

      this._service.send('STOP')

      return Promise.race([
        stopped,
        canceled,
      ])
    }

    reset (): Promise<void> {
      guardMachineEvent(this._service, 'RESET')

      const started   = waitForMachineState(this._service, 'active')
      const canceled  = waitForMachineState(this._service, 'canceled')

      this._service.send('RESET')

      return Promise.race([
        started,
        canceled,
      ])

    }

    abstract onStart (): Promise<void>
    abstract onStop  (): Promise<void>

  }

  return ServiceCtlMixin
}

abstract class ServiceCtl extends serviceCtlMixin(EmptyClass) {}

export {
  ServiceCtl,
  serviceCtlMixin,
}
