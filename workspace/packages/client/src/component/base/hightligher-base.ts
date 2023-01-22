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
}
