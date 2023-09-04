export default function raiseDeferredError(err: Error): void {
  console.warn(`${err.message}. An error will be thrown in next couple of frames`);
  const timer = setTimeout(() => {
    clearTimeout(timer);
    throw err;
  }, 32);
}
