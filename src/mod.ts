/**
 * Public entry point for state-switch: async state guard and lifecycle control.
 */
import { VERSION }  from './version.ts'
import {
  StateSwitch,
}                   from './state-switch.ts'
import type {
  BusyIndicatorInterface,
  ServiceCtlInterface,
  StateSwitchInterface,
}                         from './interfaces.ts'
import {
  BusyIndicator,
}                         from './busy-indicator.ts'
import {
  BooleanIndicator,
}                         from './boolean-indicator.ts'
import {
  ServiceCtlFsm,
  serviceCtlFsmMixin,
}                         from './service-ctl-fsm/mod.ts'
import {
  ServiceCtl,
  serviceCtlMixin,
}                         from './service-ctl/mod.ts'

export type {
  BusyIndicatorInterface,
  ServiceCtlInterface,
  StateSwitchInterface,
}
export {
  BusyIndicator,
  BooleanIndicator,
  ServiceCtl,
  ServiceCtlFsm,
  serviceCtlFsmMixin,
  serviceCtlMixin,
  StateSwitch,
  VERSION,
}
