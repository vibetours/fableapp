export enum SyncTarget {
  LocalStorage,
}

interface CB {
  onSyncNeeded: <T extends Record<string, any>>(key: string, value: T) => void;
}

export default class ChunkSyncManager {
  private readonly target: SyncTarget;

  private readonly lookupKeys: Record<string, 1> = {};

  private readonly lookupKeyLike: string;

  private readonly interval: number;

  private timer: number = 0;

  private isStarted: boolean = false;

  private readonly cb: CB;

  constructor(target: SyncTarget, lookupKeyLike: string, cb: CB, pollingInterval = 5000) {
    this.target = target;
    this.interval = pollingInterval;
    this.cb = cb;
    this.lookupKeyLike = lookupKeyLike;
  }

  add<K, T>(key: string, value: T, updateFn: (storedVal: K | null, v: T) => K): K {
    if (!(key in this.lookupKeys)) {
      this.lookupKeys[key] = 1;
    }

    const storedVal = localStorage.getItem(key);
    const newVal = updateFn(storedVal === null ? null : JSON.parse(storedVal), value);
    localStorage.setItem(key, JSON.stringify(newVal));
    return newVal;
  }

  startIfNotAlreadyStarted<K>(onLocalEditsLeft: (key: string, v: K) => void) {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    if (!this.timer) {
      this.timer = setInterval(this.poll, this.interval) as unknown as number;
    }
    let len = localStorage.length;
    while (len--) {
      const key = localStorage.key(len);
      if (!key) break;
      if (key.startsWith(this.lookupKeyLike)) {
        const val = localStorage.getItem(key);
        if (!val) {
          localStorage.removeItem(key);
        } else {
          this.lookupKeys[key] = 1;
          onLocalEditsLeft(key, JSON.parse(val) as K);
        }
      }
    }
  }

  // TODO this function does not wait to check if the server has failed to receive the data
  //      Edits could be lost when there if the server is not available
  poll = () => {
    for (const key of Object.keys(this.lookupKeys)) {
      const val = localStorage.getItem(key);
      if (val) {
        this.cb.onSyncNeeded(key, JSON.parse(val));
      }
      localStorage.removeItem(key);
      delete this.lookupKeys[key];
    }
  };

  end() {
    clearInterval(this.timer);
    this.timer = 0;
    this.poll();
  }
}
