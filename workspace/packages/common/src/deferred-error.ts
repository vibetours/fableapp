export default function raiseDeferredError(err: Error): void {
  const globalData = (window as any).__fable_global_app_data__ || {};
  const anonymousDemoId = globalData.anonymousDemoId;
  err.message += ` for anonymousDemoId: ${anonymousDemoId}`;

  console.warn(`${err.message}. An error will be thrown in next couple of frames`);
  const timer = setTimeout(() => {
    clearTimeout(timer);
    throw err;
  }, 32);
}
