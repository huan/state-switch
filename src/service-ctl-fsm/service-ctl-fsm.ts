/**
 * ServiceCtlFsm: Finite State Machine (XState) based service lifecycle controller.
 */
import { getLoggable }    from 'brolog'
import type { Loggable }  from 'brolog'
import {
  createMachine,
  interpret,
  type Interpreter,
}                         from 'xstate'

import type {
  ServiceCtlInterface,
  StateSwitchOptions,
  StateSwitchInterface,
}                               from '../interfaces.ts'
import { ServiceableAbstract }  from '../interfaces.ts'
import { StateSwitch }          from '../state-switch.ts'
import { VERSION }              from '../version.ts'

import {
  config,
  type ServiceCtlState,
  type ServiceCtlEvent,
}                             from './machine-config.ts'
import {
  buildMachineOptions,
}                             from './machine-options.ts'
import {
  guardMachineEvent,
}                             from './guard-machine-event.ts'
import {
  waitForMachineState,
}                             from './wait-for-selector.ts'

const serviceCtlFsmMixin = (
  serviceCtlName = 'ServiceCtlFsm',
  options? : StateSwitchOptions,
) => <SuperClass extends typeof ServiceableAbstract> (superClass: SuperClass) => {

  abstract class ServiceCtlFsmMixin extends superClass implements ServiceCtlInterface {

    static VERSION = VERSION

    state: StateSwitchInterface

    __serviceCtlLogger: Loggable
    __serviceCtlFsmInterpreter: Interpreter<any, ServiceCtlState, ServiceCtlEvent>

    constructor (...args: any[]) {
      super(...args)

      this.__serviceCtlLogger = getLoggable(options?.log)
      this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'constructor()')

      this.state = new StateSwitch(serviceCtlName, options)

      const machineOptions = buildMachineOptions({
        start: async () => {
          if (typeof super.start === 'function') {
            await super.start()
          }
          await this.onStart()
        },
        stop: async () => {
          await this.onStop()
          if (typeof super.stop === 'function') {
            await super.stop()
          }
        },
      })
      const machine = createMachine(config, machineOptions)

      this.__serviceCtlFsmInterpreter = interpret(machine) as any
      this.__serviceCtlFsmInterpreter.start()
    }

    override start (): Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'start()')
      guardMachineEvent(this.__serviceCtlFsmInterpreter, 'START')

      const started   = waitForMachineState(this.__serviceCtlFsmInterpreter, 'active')
      const canceled  = waitForMachineState(this.__serviceCtlFsmInterpreter, 'canceled')

      this.__serviceCtlFsmInterpreter.send('START')
      this.state.active(true)

      return Promise.race([started, canceled]).then(() => {
        this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'start() ... done')
      })
    }

    override stop (): Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'stop()')
      guardMachineEvent(this.__serviceCtlFsmInterpreter, 'STOP')

      const stopped   = waitForMachineState(this.__serviceCtlFsmInterpreter, 'inactive')
      const canceled  = waitForMachineState(this.__serviceCtlFsmInterpreter, 'canceled')

      this.__serviceCtlFsmInterpreter.send('STOP')
      this.state.inactive(true)

      return Promise.race([stopped, canceled]).then(() => {
        this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'stop() ... done')
      })
    }

    public reset (): Promise<void> {
      this.__serviceCtlLogger.verbose(`ServiceCtlFsm<${serviceCtlName}>`, 'reset()')
      guardMachineEvent(this.__serviceCtlFsmInterpreter, 'RESET')

      const reseted   = waitForMachineState(this.__serviceCtlFsmInterpreter, 'active')
      const canceled  = waitForMachineState(this.__serviceCtlFsmInterpreter, 'canceled')

      this.__serviceCtlFsmInterpreter.send('RESET')
      return Promise.race([reseted, canceled])
    }

    abstract onStart (): Promise<void> | void
    abstract onStop  (): Promise<void> | void

  }

  return ServiceCtlFsmMixin
}

const ServiceCtlFsm = serviceCtlFsmMixin()(ServiceableAbstract)
type ServiceCtlFsm = InstanceType<typeof ServiceCtlFsm>

export {
  ServiceCtlFsm,
  serviceCtlFsmMixin,
}
