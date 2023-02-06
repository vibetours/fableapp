export default abstract class HighlighterBase {
  protected readonly doc: Document;

  protected readonly win: Window;

  protected maskEl: HTMLDivElement | null;

  protected readonly maxZIndex: number;

  constructor(doc: Document) {
    this.doc = doc;
    this.win = doc.defaultView as Window;
    this.maskEl = null;
    this.maxZIndex = this.getMaxZIndex();
  }

  private getMaxZIndex() {
    return Array.from(this.doc.querySelectorAll('body *'))
      .map(a => parseFloat(this.win.getComputedStyle(a).zIndex))
      .filter(a => !Number.isNaN(a))
      .sort()
      .pop() || 1;
  }

  protected dispose() {
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

  protected selectElement(el: HTMLElement) {
    const elSize: DOMRect = el.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();
    maskBox.style.top = `${elSize.top + this.win.scrollY}px`;
    maskBox.style.left = `${elSize.left + this.win.screenX}px`;
    maskBox.style.width = `${elSize.width}px`;
    maskBox.style.height = `${elSize.height}px`;
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
    mask.style.zIndex = `${this.maxZIndex + 1}`;
    mask.style.background = this.highlightBgColor();
    mask.style.boxShadow = `rgb(117, 102, 255) 0px 0px 0px 2px, rgba(0, 0, 0, ${this.maskHasDarkBg() ? '0.45' : '0.0'
    }) 0px 0px 0px 1000vw`;
    this.maskEl = mask;
    this.attachElToUmbrellaDiv(mask);
    return mask;
  }

  protected attachElToUmbrellaDiv(el: Element) {
    const umbrellaDiv = this.doc.getElementsByClassName('fable-rt-umbrl')[0] as HTMLDivElement;
    if (!umbrellaDiv) {
      throw new Error('Container div not found');
    }

    umbrellaDiv.appendChild(el);
    return this;
  }

  protected removeMaskIfPresent() {
    if (this.maskEl) {
      this.maskEl.remove();
      this.maskEl = null;
    }
  }

  elFromPath(path: string): HTMLElement | null {
    const elIdxs = path.split('.').map((id) => +id);
    let node = this.doc as Node;
    for (const id of elIdxs) {
      node = node.childNodes[id];
    }
    if (node === this.doc) {
      return null;
    }
    return node as HTMLElement;
  }

  elPath(el: HTMLElement) {
    let elPath = el.getAttribute('fab-el-path');
    if (elPath === null) {
      const path = HighlighterBase.calculatePathFromEl(el, this.doc, []);
      elPath = path.join('.');
      el.setAttribute('fab-el-path', elPath);
    }
    return elPath;
  }

  private static calculatePathFromEl(el: Node, doc: Document, loc: number[]): number[] {
    if (!el.parentNode) {
      return loc.reverse();
    }
    const siblings = el.parentNode.childNodes;
    for (let i = 0, l = siblings.length; i < l; i++) {
      if (el === siblings[i]) {
        loc.push(i);
        return this.calculatePathFromEl(el.parentNode, doc, loc);
      }
    }
    return loc;
  }
}
