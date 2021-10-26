const randomException = () => {
  if (Math.random() > 0.5) {
    throw new Error('failure')
  }
}
const sleep = () => new Promise((resolve) => setTimeout(resolve, 1000))

const onStart = async () => {
  console.info('onStart')
  await sleep()
  randomException()
}
const onStop = async () => {
  console.info('onStop')
  await sleep()
  randomException()
}

const onEntry = async (context: any, event: any) => {
  console.info('onEntry', context.counter, event)
}
const onExit = async (context: any, event: any) => {
  console.info('onExit', context.counter, event)
}

const start = async () => {
  console.info('start()')
  await onStart()
}
const stop = async () => {
  console.info('stop()')
  await onStop()
}
const reset = async () => {
  console.info('reset()')
  await stop()
  await start()
}

export {
  start,
  stop,
  reset,
  onEntry,
  onExit,
}
