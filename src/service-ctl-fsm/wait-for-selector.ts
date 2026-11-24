/**
 * Utility to asynchronously wait for a specific XState machine state transition using RxJS.
 */
import {
  type Observable,
  firstValueFrom,
  from,
}                 from 'rxjs'
import {
  filter,
}                 from 'rxjs/operators'

const waitForSelector = async <T> (
  stream$: Observable<T>,
  selector: (x: T) => boolean,
): Promise<void> => {
  const future = firstValueFrom(
    stream$.pipe(
      filter(selector),
    ),
  )
  return future.then(() => undefined)
}

const waitForMachineState = async (
  interpreter: any,
  state: string,
): Promise<void> => {
  const selector = (
    x: any,
  ) => x.value === state

  return waitForSelector(
    from(interpreter),
    selector,
  )
}

export {
  waitForSelector,
  waitForMachineState,
}
