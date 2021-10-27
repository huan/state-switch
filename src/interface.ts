import type { Loggable } from 'brolog'

import type { StateSwitch } from './state-switch.js'
import type { BusyIndicator } from './busy-indicator.js'
import type { ServiceCtl } from './service-ctl/service-ctl.js'

interface StateSwitchInterface {
  active   : StateSwitch['active']
  inactive : StateSwitch['inactive']
  pending  : StateSwitch['pending']
  stable   : StateSwitch['stable']
}

interface BusyIndicatorInterface {
  busy : BusyIndicator['busy']
  idle : BusyIndicator['idle']
}

interface ServiceCtlInterface {
  state: StateSwitchInterface

  reset   : ServiceCtl['reset']
  start   : ServiceCtl['start']
  stop    : ServiceCtl['stop']
}

interface StateSwitchOptions {
  log?: Loggable
}

type EmittableConstructor = (abstract new (...args: any[]) => {
  emit: (...args: any[]) => any;
})

export type {
  BusyIndicatorInterface,
  EmittableConstructor,
  StateSwitchInterface,
  ServiceCtlInterface,
  StateSwitchOptions,
}
