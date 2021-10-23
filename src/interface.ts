import type { StateSwitch } from './state-switch.js'
import type { BusyIndicator } from './busy-indicator.js'

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

export type {
  BusyIndicatorInterface,
  StateSwitchInterface,
}
