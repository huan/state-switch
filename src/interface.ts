import type { StateSwitch } from './state-switch.js'
import type { BusyIndicator } from './busy-indicator.js'
import { ServiceCtl } from './service-ctl/service-ctl.js'

interface StateSwitchInterface {
  off     : StateSwitch['off']
  on      : StateSwitch['on']
  pending : StateSwitch['pending']
  ready   : StateSwitch['ready']
}

interface BusyIndicatorInterface {
  busy : BusyIndicator['busy']
  idle : BusyIndicator['idle']
}

interface ServiceCtlInterface {
  onStart : ServiceCtl['onStart']
  onStop  : ServiceCtl['onStop']
  reset   : ServiceCtl['reset']
  start   : ServiceCtl['start']
  stop    : ServiceCtl['stop']
}

interface StateSwitchOptions {
  log?: any
}

export type {
  BusyIndicatorInterface,
  StateSwitchInterface,
  ServiceCtlInterface,
  StateSwitchOptions,
}
