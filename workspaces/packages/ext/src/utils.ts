export function getRandomId(): string {
  return Math.random().toString(16).substring(2, 15) + Math.random().toString(16).substring(2, 15);
}

const LOCKS: {
  current: string;
  q: Array<{ id: string; resolve: () => void }>;
  timerMap: Record<string, number>;
} = {
  current: '',
  q: [],
  timerMap: {},
};

function nextLock(id: string) {
  if (LOCKS.current === '') {
    const head = LOCKS.q.shift();
    if (head) {
      LOCKS.current = head.id;
      head.resolve();
      const timer = setTimeout(releaseLock, 5000);
      LOCKS.timerMap[id] = timer;
    }
  }
}

export function releaseLock(id: string) {
  LOCKS.current = '';
  nextLock(id);
  if (id in LOCKS.timerMap) {
    clearTimeout(LOCKS.timerMap[id]);
  }
}

export function acquireLock(id: string) {
  const candidate = { id, resolve: () => {} };
  const p = new Promise((resolve) => (candidate.resolve = resolve));
  LOCKS.q.push(candidate);

  setTimeout(
    ((i: string) => () => {
      nextLock(i);
    })(id),
    10
  );

  return p;
}
