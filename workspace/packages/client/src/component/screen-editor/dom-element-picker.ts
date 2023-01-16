export enum HighlightMode {
  Idle,
  Selection,
  Pinned,
}

type ElSelectCallback = (el: HTMLElement) => void;

export default class DomElementPicker {
  private readonly doc: Document;

  private highlightMode: HighlightMode;

  private maskEl: HTMLDivElement | null;

  private prevElHovered: Element | Text | null;

  private onElSelect: ElSelectCallback;

  private onElDeSelect: ElSelectCallback;

  private evts: Partial<Record<keyof HTMLElementEventMap, Array<(e: Event) => void>>>;

  constructor(doc: Document, cbs: { onElSelect: ElSelectCallback; onElDeSelect: ElSelectCallback }) {
    this.doc = doc;
    this.highlightMode = HighlightMode.Idle;
    this.maskEl = null;
    this.prevElHovered = null;
    this.onElSelect = cbs.onElSelect;
    this.onElDeSelect = cbs.onElDeSelect;
    this.evts = {};
  }

  enable() {
    this.highlightMode = HighlightMode.Selection;
    this.getOrCreateMask();
    return this;
  }

  disable() {
    this.highlightMode = HighlightMode.Idle;
    this.removeMaskIfPresent();
    return this;
  }

  getOutOfPinMode() {
    this.highlightMode = HighlightMode.Selection;
    this.onElDeSelect(this.prevElHovered as HTMLElement);
    return this;
  }

  addEventListener<K extends keyof DocumentEventMap>(eventName: K, fn: (e: DocumentEventMap[K]) => void) {
    let fns: Array<(e: DocumentEventMap[K]) => void> = [];
    if (eventName in this.evts) {
      fns = this.evts[eventName]!;
    } else {
      (this.evts as any)[eventName] = fns;
    }
    fns.push(fn);
    this.doc.addEventListener(eventName, fn);
  }

  getMode() {
    return this.highlightMode;
  }

  setupHighlighting() {
    this.doc.addEventListener('mousemove', this.handleMouseMove);
    this.doc.addEventListener('click', this.handleClick);
    return this;
  }

  dispose() {
    this.highlightMode = HighlightMode.Idle;
    this.doc.removeEventListener('mousemove', this.handleMouseMove);
    this.doc.removeEventListener('click', this.handleClick);
    this.removeMaskIfPresent();
    for (const [eventName, fns] of Object.entries(this.evts)) {
      for (const fn of fns) {
        this.doc.removeEventListener(eventName, fn);
      }
    }
    this.evts = {};
  }

  private getOrCreateMask() {
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

  private removeMaskIfPresent() {
    if (this.maskEl) {
      this.maskEl.remove();
      this.maskEl = null;
    }
  }

  private getPrimaryFocusElementBelowMouse(els: HTMLElement[], x: number, y: number): HTMLElement | Text {
    for (const el of els) {
      if (el.tagName && el.tagName.toLowerCase() === 'svg') {
        return el;
      }
    }

    const elBelowMouse = els[0] as HTMLElement;
    const text = this.findTextDescendantsBelowMouse(elBelowMouse, x, y);
    return text || elBelowMouse;
  }

  private findTextDescendantsBelowMouse(el: HTMLElement, x: number, y: number): Text | null {
    const children = Array.from(el.childNodes);
    if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
      // If there is only one child and the node is child node, then consider the whole node as text node.
      return children[0] as Text;
    }
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE || child instanceof Text) {
        const range = this.doc.createRange();
        range.selectNode(child);
        const rect = range.getBoundingClientRect();
        if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
          return child as Text;
        }
      }
    }
    return null;
  }

  private handleMouseMove = (event: MouseEvent) => {
    if (this.highlightMode !== HighlightMode.Selection) return;
    const els = this.doc.elementsFromPoint(event.clientX, event.clientY) as HTMLElement[];
    if (!els.length) return;
    const el = this.getPrimaryFocusElementBelowMouse(els, event.clientX, event.clientY);
    const anchorEl = (el.nodeType === Node.TEXT_NODE ? (el.parentNode as HTMLElement) : el) as HTMLElement;
    if (this.prevElHovered && this.prevElHovered === anchorEl) return;
    this.prevElHovered = anchorEl;
    const maskBox = this.getOrCreateMask();
    const elSize: DOMRect = anchorEl.getBoundingClientRect();
    maskBox.style.top = `${elSize.top}px`;
    maskBox.style.left = `${elSize.left}px`;
    maskBox.style.width = `${elSize.width}px`;
    maskBox.style.height = `${elSize.height}px`;
    maskBox.style.background = '#fedf644f';
    maskBox.style.boxShadow = 'rgb(117, 102, 255) 0px 0px 0px 2px, rgba(0, 0, 0, 0.0) 0px 0px 0px 1000vw';
  };

  private handleClick = () => {
    const el = this.prevElHovered;
    console.assert(el !== null);
    this.highlightMode = HighlightMode.Pinned;
    this.onElSelect(el as HTMLElement);
  };
}
