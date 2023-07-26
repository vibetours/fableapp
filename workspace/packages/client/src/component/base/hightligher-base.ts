import { Coords, ITourDataOpts } from '@fable/common/dist/types';
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

export interface HighlighterBaseConfig {
  selectionColor: string;
  showOverlay: boolean;
}

export default abstract class HighlighterBase {
  protected readonly doc: Document;

  protected readonly win: Window;

  protected maskEl: HTMLDivElement | null;

  static ANNOTATION_PADDING_ONE_SIDE = 8;

  nestedFrames: HTMLIFrameElement[];

  nestedDocs: Document[];

  private listnrSubs: Partial<Record<keyof HTMLElementEventMap, Array<[(e: Event) => void, Document]>>>;

  private config: HighlighterBaseConfig;

  constructor(doc: Document, nestedFrames: HTMLIFrameElement[], config: HighlighterBaseConfig) {
    this.doc = doc;
    this.nestedFrames = nestedFrames;
    this.nestedDocs = this.nestedFrames.map(f => f.contentDocument).filter(d => !!d) as Document[];
    this.win = doc.defaultView as Window;
    this.maskEl = null;
    this.listnrSubs = {};
    this.config = config;
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

  private drawMask(elSize: Rect, win: Window, dx: number, dy: number) {
    const maskBox = this.getOrCreateMask();

    const padding = HighlighterBase.ANNOTATION_PADDING_ONE_SIDE;

    const top = elSize.top + this.win.scrollY + dy;
    const left = elSize.left + this.win.scrollX + dx;

    const rightEndpoint = Math.ceil(left + elSize.width + (left <= 0 ? 0 : padding * 2));
    // the boundary is checked against the main window not iframe's window
    // as iframe could occupy a small portion in screen.
    const width = rightEndpoint >= win.scrollX + window.innerWidth
      ? elSize.width : elSize.width + (left <= 0 ? 0 : padding * 2);

    const bottomEndpoint = Math.ceil(top + elSize.height + (top <= 0 ? 0 : padding * 2));
    const height = bottomEndpoint >= win.scrollY + window.innerHeight
      ? elSize.height : elSize.height + (top <= 0 ? 0 : padding * 2);

    const maskBoxTop = bottomEndpoint >= win.scrollY + window.innerHeight ? top : top - (top <= 0 ? -2 : padding);
    const maskBoxLeft = rightEndpoint >= win.scrollX + window.innerWidth ? left : left - (left <= 0 ? -2 : padding);

    maskBox.style.top = `${maskBoxTop}px`;
    maskBox.style.left = `${maskBoxLeft}px`;
    maskBox.style.width = `${width}px`;
    maskBox.style.height = `${height}px`;
  }

  // We used to calculate dxdy of frames after loading complete
  // Sometime (google sheet extension) even ater the onload event iframe content's gets repostioned after that
  // (probably css?) Hence we calculate dxdy on first interaction itself
  private calculateCumulativeDxdy(doc: Document, cdxdy: [number, number] = [0, 0]): [number, number] {
    let dxdy = doc.body.getAttribute('dxdy');
    if (!dxdy) {
      if (doc.defaultView && doc.defaultView.frameElement) {
        const box = doc.defaultView.frameElement.getBoundingClientRect();
        dxdy = `${box.x},${box.y}`;
        doc.body.setAttribute('dxdy', dxdy);
      }
    }
    const [dx, dy] = (dxdy || ',').split(',').map(d => +d);
    if (doc.defaultView && doc.defaultView.frameElement && doc.defaultView.frameElement.id !== ROOT_EMBED_IFRAME_ID) {
      return this.calculateCumulativeDxdy(doc.defaultView.frameElement.ownerDocument, [cdxdy[0] + dx, cdxdy[1] + dy]);
    }
    return cdxdy;
  }

  protected getCumulativeDxdy(doc: Document): [number, number] {
    let val;
    if (val = doc.body.getAttribute('cdxcy')) {
      return val.split(',').map(d => +d) as [number, number];
    }
    const calculatedVal = this.calculateCumulativeDxdy(doc);
    doc.body.setAttribute('cdxcy', calculatedVal.join(','));
    return calculatedVal;
  }

  protected selectElementInDoc(el: HTMLElement, doc: Document) {
    const win = doc.defaultView!;
    // const [dx, dy] = doc.body.getAttribute('dxdy')!.split(',').map(d => +d);
    const [dx, dy] = this.getCumulativeDxdy(doc);
    const elSize: DOMRect = el.getBoundingClientRect();
    this.drawMask(elSize, win, dx, dy);
  }

  selectBoxInDoc(scaleCoords: Coords) {
    const win = this.doc.defaultView!;
    const [dx, dy] = this.doc.body.getAttribute('dxdy')!.split(',').map(d => +d);
    const elSize = this.getAbsFromRelCoords(scaleCoords);
    this.drawMask(elSize, win, dx, dy);
  }

  getAbsFromRelCoords(coords: Coords): Rect {
    const imageEl = this.doc.querySelector('img')!;
    const imageRect = imageEl.getBoundingClientRect();

    const x = Math.round(coords.x * imageRect.width);
    const y = Math.round(coords.y * imageRect.height);
    const width = Math.round(coords.width * imageRect.width);
    const height = Math.round(coords.height * imageRect.height);

    const top = imageRect.top + y;
    const left = imageRect.left + x;
    const right = left + width;
    const bottom = top + height;

    return {
      x, y, width, height, top, left, right, bottom
    };
  }

  createFullScreenMask(): void {
    const elSize: DOMRect = this.doc.body.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();
    maskBox.style.top = `${elSize.top + this.win.scrollY}px`;
    maskBox.style.left = `${elSize.left + this.win.scrollX}px`;
    maskBox.style.width = '0px';
    maskBox.style.height = '0px';
  }

  abstract maskHasDarkBg(): boolean;

  abstract highlightBgColor(): string;

  protected getOrCreateMask(): HTMLDivElement {
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
    mask.style.boxShadow = `${this.config.selectionColor} 0px 0px 0px 2px, rgba(0, 0, 0, ${(this.maskHasDarkBg() && this.config.showOverlay) ? '0.25' : '0.0'
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

  updateConfig<K extends keyof HighlighterBaseConfig>(key: K, value: HighlighterBaseConfig[K]): void {
    if (value !== this.config[key]) {
      this.removeMaskIfPresent();
      this.config[key] = value;
    }
  }

  protected attachElToUmbrellaDiv(el: Element) {
    const umbrellaDiv = this.doc.getElementsByClassName('fable-rt-umbrl')[0] as HTMLDivElement;
    const annotationsContainer = this.doc.getElementsByClassName('fable-annotations--container')[0] as HTMLDivElement;
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
    let p = '';
    for (const id of elIdxs) {
      p += `.${id}`;
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
