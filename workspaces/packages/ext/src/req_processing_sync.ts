export class Defer {
  public p: Promise<void>;

  private resolveFn: (() => void) | null = null;

  private rejectFn: (() => void) | null = null;

  constructor() {
    this.p = new Promise((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  resolve() {
    if (this.resolveFn) {
      this.resolveFn();
    }
  }

  reject() {
    if (this.rejectFn) {
      this.rejectFn();
    }
  }
}

export class ProgressSequence {
  private id: string;

  public reqWillBeSent: Defer;

  public respReceived: Defer;

  public respReceivedExtraInfo: Defer;

  constructor(id: string) {
    this.id = id;
    this.reqWillBeSent = new Defer();
    this.respReceived = new Defer();
    this.respReceivedExtraInfo = new Defer();
  }

  fulfill() {
    this.reqWillBeSent.resolve();
    this.respReceived.resolve();
    this.respReceivedExtraInfo.resolve();
  }

  reject() {
    this.reqWillBeSent.reject();
    this.respReceived.reject();
    this.respReceivedExtraInfo.reject();
  }

  dispose() {
    this.fulfill();
  }
}

export default class ReqProcessingSynchronizer {
  private acquiredLocks: Record<string, ProgressSequence>;

  private disabledLocks: Record<string, 1>;

  private commits: Record<string, 1>;

  constructor() {
    this.acquiredLocks = {};
    this.disabledLocks = {};
    this.commits = {};
  }

  isCommited(id: string): boolean {
    return !!this.commits[id];
  }

  commit(id: string) {
    this.commits[id] = 1;
  }

  ignore(id: string) {
    if (id in this.acquiredLocks) {
      this.acquiredLocks[id].fulfill();
    }
    this.disabledLocks[id] = 1;
  }

  getLock(id: string): ProgressSequence | null {
    if (id in this.disabledLocks) {
      return null;
    }

    if (!(id in this.acquiredLocks)) {
      this.acquiredLocks[id] = new ProgressSequence(id);
    }

    return this.acquiredLocks[id];
  }

  deriveNewLock(id: string): ProgressSequence {
    const lock = this.getLock(id);
    const seq = new ProgressSequence(id);

    this.acquiredLocks[id] = seq;
    if (lock) {
      seq.reqWillBeSent.p.finally(() => {
        lock.reqWillBeSent.resolve();
      });

      seq.respReceivedExtraInfo.p.finally(() => {
        lock.respReceivedExtraInfo.resolve();
      });

      seq.respReceived.p.finally(() => {
        lock.respReceived.resolve();
      });
    }

    return seq;
  }
}
