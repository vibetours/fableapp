export function isSameOrigin(origin1: string, origin2: string): boolean {
  const url1 = new URL(origin1);
  const url2 = new URL(origin2);

  return url1.host === url2.host;
}

export const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getDisplayableTime(d: Date): string {
  const now = +new Date();
  const dMs = +d;
  const diff = now - dMs;

  const aMin = 60 * 1000;
  const anHour = 60 * aMin;
  const aDay = 24 * anHour;

  if (diff < aMin) {
    return 'Just now';
  }

  if (diff < anHour) {
    const mins = (diff / aMin) | 0;
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }

  if (diff < aDay) {
    const hrs = (diff / anHour) | 0;
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  }

  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

// eslint-disable-next-line no-promise-executor-return
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getCurrentUtcUnixTime(): number {
  return Math.floor(new Date().getTime() / 1000);
}

export function deepcopy<T>(obj: T): T {
  if ('structuredClone' in window && typeof structuredClone === 'function') {
    return structuredClone(obj) as T;
  }
  return JSON.parse(JSON.stringify(obj));
}

export function trimSpaceAndNewLine(txt: string): string {
  return txt
    .split('\n')
    .map((t) => t.trim())
    .filter((t) => t !== '')
    .join('\n');
}

export function getRandomId(): string {
  return `${+new Date() / 1000 | 0}${Math.random().toString(16).substring(2, 15)}`;
}
