/**
 * Event guard ensuring the XState machine can accept a given event in its current state.
 */
import type {
  EventObject,
  Interpreter,
  StateSchema,
}                 from 'xstate'

const guardMachineEvent = <TServiceCtlState extends StateSchema, TServiceCtlEvent extends EventObject> (
  interpreter: Interpreter<
    any,
    TServiceCtlState,
    TServiceCtlEvent
  >,
  event: TServiceCtlEvent['type'],
): void => {
  if (!interpreter.state.can(event)) {
    throw new Error([
      `StateMachine "${interpreter.id}" can not accept event "${event}"`,
      ` with current state "${interpreter.state.value}"`,
    ].join(''))
  }
}

export { guardMachineEvent }
