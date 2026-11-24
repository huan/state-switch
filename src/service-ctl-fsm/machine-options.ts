/**
 * Build XState machine options (actions, activities, services) for ServiceCtlFsm.
 */
import type { MachineOptions } from 'xstate'

import type {
  ServiceCtlContext,
  ServiceCtlEvent,
}                     from './machine-config.ts'

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

export type {
  ServiceCtlServiceOptions,
}
export {
  buildMachineOptions,
}
