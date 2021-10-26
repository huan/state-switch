import { MachineOptions } from 'xstate'

import {
  ServiceCtlContext,
  ServiceCtlEvent,
}                     from './machine-config.js'

interface ServiceCtlServiceOptions {
  // actions: {
  //   onEntry: Function,
  //   onExit: Function,
  // },
  // services: {
  start:  () => Promise<void>,
  stop:   () => Promise<void>,
  // }
}

// MachineOptions<TContext, TEvent>
const buildMachineOptions = (
  options: ServiceCtlServiceOptions,
): MachineOptions<
  ServiceCtlContext,
  ServiceCtlEvent
> => {
  const reset = async () => {
    await options.stop()
    await options.start()
  }

  return {
    actions: {
      // onEntry,
      // onExit,
    },
    activities: {},
    delays: {},
    guards: {},
    services: {
      reset,
      start : options.start,
      stop  : options.stop,
    },
  }
}

export {
  ServiceCtlServiceOptions,
  buildMachineOptions,
}
