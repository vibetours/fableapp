import { ROOT_EMBED_IFRAME_ID } from '../screen-editor/preview';

export interface Rect {
  x: number;
  y: number;
  height: number;
  width: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export default abstract class HighlighterBase {
  protected readonly doc: Document;

  protected readonly win: Window;

  protected maskEl: HTMLDivElement | null;

  static ANNOTATION_PADDING_ONE_SIDE = 8;

  nestedFrames: HTMLIFrameElement[];

  nestedDocs: Document[];

  private listnrSubs: Partial<Record<keyof HTMLElementEventMap, Array<[(e: Event) => void, Document]>>>;

  constructor(doc: Document, nestedFrames: HTMLIFrameElement[]) {
    this.doc = doc;
    this.nestedFrames = nestedFrames;
    this.nestedDocs = this.nestedFrames.map(f => f.contentDocument).filter(d => !!d) as Document[];
    this.win = doc.defaultView as Window;
    this.maskEl = null;
    this.listnrSubs = {};
  }

  protected dispose() {
    for (const [key, unsubs] of Object.entries(this.listnrSubs)) {
      const tKey = key as keyof HTMLElementEventMap;
      unsubs.forEach(([fn, doc]) => doc.removeEventListener(tKey, fn, key === 'scroll'));
    }
    this.listnrSubs = {};
    this.removeMaskIfPresent();
  }

  // WARN this does not work for elements that are visible but height is greater than the
  // window height or width is greater than the window width
  protected isElInViewPort(el: HTMLElement) {
    const rect = el.getBoundingClientRect();

    return (
      rect.top >= 0
      && rect.left >= 0
      && rect.bottom <= (this.win.innerHeight || this.doc.documentElement.clientHeight)
      && rect.right <= (this.win.innerWidth || this.doc.documentElement.clientWidth)
    );
  }

  protected selectElementInDoc(el: HTMLElement, doc: Document) {
    const win = doc.defaultView!;
    const [dx, dy] = doc.body.getAttribute('dxdy')!.split(',').map(d => +d);
    const elSize: DOMRect = el.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();

    const padding = HighlighterBase.ANNOTATION_PADDING_ONE_SIDE;

    const top = elSize.top + this.win.scrollY + dy;
    const left = elSize.left + this.win.scrollX + dx;

    const rightEndpoint = Math.ceil(left + elSize.width + (left <= 0 ? 0 : padding * 2));
    const width = rightEndpoint >= win.scrollX + win.innerWidth
      ? elSize.width : elSize.width + (left <= 0 ? 0 : padding * 2);

    const bottomEndpoint = Math.ceil(top + elSize.height + (top <= 0 ? 0 : padding * 2));
    const height = bottomEndpoint >= win.scrollY + win.innerHeight
      ? elSize.height : elSize.height + (top <= 0 ? 0 : padding * 2);

    maskBox.style.top = `${top - (top <= 0 ? -2 : padding)}px`;
    maskBox.style.left = `${left - (left <= 0 ? -2 : padding)}px`;
    maskBox.style.width = `${width}px`;
    maskBox.style.height = `${height}px`;
  }

  createFullScreenMask() {
    const elSize: DOMRect = this.doc.body.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();
    maskBox.style.top = `${elSize.top + this.win.scrollY}px`;
    maskBox.style.left = `${elSize.left + this.win.scrollX}px`;
    maskBox.style.width = '0px';
    maskBox.style.height = '0px';
  }

  abstract maskHasDarkBg(): boolean;

  abstract highlightBgColor(): string;

  protected getOrCreateMask() {
    if (this.maskEl) {
      return this.maskEl;
    }
    const cls = `fable-el-mask-${(Math.random() * 10 ** 6) | 0}`;
    const mask = this.doc.createElement('div');
    mask.setAttribute('class', cls);
    mask.style.position = 'absolute';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    mask.style.background = this.highlightBgColor();
    mask.style.borderRadius = '2px';
    mask.style.boxShadow = `#2196f3 0px 0px 0px 2px, rgba(0, 0, 0, ${this.maskHasDarkBg() ? '0.25' : '0.0'
    }) 0px 0px 0px 1000vw`;
    this.maskEl = mask;
    this.attachElToUmbrellaDiv(mask);
    return mask;
  }

  protected subscribeListenerToAllDoc<K extends keyof DocumentEventMap>(
    evt: K,
    fn: (doc: Document) => (e: DocumentEventMap[K]) => void
  ) {
    (this.listnrSubs as any)[evt] = [
      ...((this.listnrSubs as any)[evt] || []),
      ...[this.doc, ...this.nestedDocs].map(doc => {
        const evtFn = fn(doc);
        doc.addEventListener(evt, evtFn, evt === 'scroll');
        return [evtFn, doc];
      })
    ];
  }

  showTransparentMask(show: boolean) {
    if (!this.maskEl) {
      return;
    }

    this.maskEl.style.boxShadow = `#2196f3 0px 0px 0px 2px, ${show ? 'transparent' : 'rgba(0, 0, 0, 0.25)'}
    0px 0px 0px 1000vw`;
  }

  protected attachElToUmbrellaDiv(el: Element) {
    const umbrellaDiv = this.doc.getElementsByClassName('fable-rt-umbrl')[0] as HTMLDivElement;
    const annotationsContainer = this.doc.getElementsByClassName('fable-annotations-container')[0] as HTMLDivElement;
    if (!umbrellaDiv) {
      throw new Error('Container div not found');
    }

    umbrellaDiv.insertBefore(el, annotationsContainer);
    return this;
  }

  protected removeMaskIfPresent() {
    if (this.maskEl) {
      this.maskEl.remove();
      this.maskEl = null;
    }
  }

  elFromPath(path: string): HTMLElement | null {
    const elIdxs = path.split('.').map((id) => +id).slice(1);
    const document = this.doc as Document;
    let node = document.documentElement as Node;
    for (const id of elIdxs) {
      if ((node as HTMLElement).tagName && ((node as HTMLElement).tagName.toLowerCase() === 'iframe'
      || (node as HTMLElement).tagName.toLowerCase() === 'object')) {
        node = (node as HTMLIFrameElement).contentDocument!;
      }
      node = node.childNodes[id];
    }
    if (node === this.doc) {
      return null;
    }
    return node as HTMLElement;
  }

  // eslint-disable-next-line class-methods-use-this
  elPath(el: HTMLElement) {
    let elPath = el.getAttribute('fab-el-path');
    if (elPath === null) {
      const path = HighlighterBase.calculatePathFromEl(el, []);
      elPath = path.join('.');
      el.setAttribute('fab-el-path', elPath);
    }
    return elPath;
  }

  private static calculatePathFromEl(el: Node, loc: number[]): number[] {
    if (el.nodeName === '#document') {
      const tEl = el as Document;
      if (tEl.defaultView && tEl.defaultView.frameElement && tEl.defaultView.frameElement.id !== ROOT_EMBED_IFRAME_ID) {
        return this.calculatePathFromEl(tEl.defaultView.frameElement, loc);
      }
      return loc.reverse();
    }
    const siblings = el.parentNode!.childNodes;
    for (let i = 0, l = siblings.length; i < l; i++) {
      if (el === siblings[i]) {
        loc.push(i);
        return this.calculatePathFromEl(el.parentNode!, loc);
      }
    }
    return loc;
  }
}
