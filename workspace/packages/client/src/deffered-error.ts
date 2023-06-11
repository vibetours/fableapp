export default function raiseDeferredError(errMsg: string) {
  console.warn(`${errMsg}. An error will be thrown in next couple of frames`);
  const timer = setTimeout(() => {
    clearTimeout(timer);
    throw new Error(errMsg);
  }, 32);
}
