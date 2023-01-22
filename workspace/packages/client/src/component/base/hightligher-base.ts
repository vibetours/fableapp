export default abstract class HighlighterBase {
  protected readonly doc: Document;

  protected maskEl: HTMLDivElement | null;

  constructor(doc: Document) {
    this.doc = doc;
    this.maskEl = null;
  }

  protected dispose() {
    this.removeMaskIfPresent();
  }

  protected selectElement(el: HTMLElement) {
    const elSize: DOMRect = el.getBoundingClientRect();
    const maskBox = this.getOrCreateMask();
    maskBox.style.top = `${elSize.top}px`;
    maskBox.style.left = `${elSize.left}px`;
    maskBox.style.width = `${elSize.width}px`;
    maskBox.style.height = `${elSize.height}px`;
    maskBox.style.background = '#fedf644f';
    maskBox.style.boxShadow = 'rgb(117, 102, 255) 0px 0px 0px 2px, rgba(0, 0, 0, 0.0) 0px 0px 0px 1000vw';
  }

  protected getOrCreateMask() {
    if (this.maskEl) {
      return this.maskEl;
    }
    const cls = `fable-el-mask-${(Math.random() * 10 ** 6) | 0}`;
    const mask = this.doc.createElement('div');
    mask.setAttribute('class', cls);
    mask.style.position = 'fixed';
    mask.style.pointerEvents = 'none';
    mask.style.zIndex = '99999';
    this.maskEl = mask;
    this.doc.body.appendChild(mask);
    return mask;
  }

  protected removeMaskIfPresent() {
    if (this.maskEl) {
      this.maskEl.remove();
      this.maskEl = null;
    }
  }

  elFromPath(path: string) {
    const elIdxs = path.split('.').map((id) => +id);
    let node = this.doc as Node;
    for (const id of elIdxs) {
      node = node.childNodes[id];
    }
    return node;
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
