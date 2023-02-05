import HighlighterBase from '../base/hightligher-base';

export enum HighlightMode {
  Idle,
  Selection,
  Pinned,
  NOOP,
}

type ElSelectCallback = (el: HTMLElement, doc: Document) => void;

export default class DomElementPicker extends HighlighterBase {
  private highlightMode: HighlightMode;

  private prevElHovered: Element | Text | null;

  private onElSelect: ElSelectCallback;

  private onElDeSelect: ElSelectCallback;

  private evts: Partial<Record<keyof HTMLElementEventMap, Array<(e: Event) => void>>>;

  constructor(doc: Document, cbs: {onElSelect: ElSelectCallback; onElDeSelect: ElSelectCallback}) {
    super(doc);
    this.highlightMode = HighlightMode.Idle;
    this.maskEl = null;
    this.prevElHovered = null;
    this.onElSelect = cbs.onElSelect;
    this.onElDeSelect = cbs.onElDeSelect;
    this.evts = {};
  }

  enable() {
    if (this.highlightMode !== HighlightMode.Pinned) {
      this.highlightMode = HighlightMode.Selection;
    }
    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  maskHasDarkBg(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  highlightBgColor(): string {
    return '#fedf644f';
  }

  disable() {
    if (this.highlightMode !== HighlightMode.Pinned) {
      this.highlightMode = HighlightMode.Idle;
      this.removeMaskIfPresent();
    }
    return this;
  }

  getOutOfPinMode() {
    this.highlightMode = HighlightMode.Selection;
    this.onElDeSelect(this.prevElHovered as HTMLElement, this.doc);
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
    if (eventName !== 'click') {
      // we already install click listeners from this, hence outside clicks needs to be handled differently
      this.doc.addEventListener(eventName, fn);
    }
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
    for (const [eventName, fns] of Object.entries(this.evts)) {
      for (const fn of fns) {
        this.doc.removeEventListener(eventName, fn);
      }
    }
    this.evts = {};
    super.dispose();
  }

  // TODO If there are other html elements spanning over image element then we miss the image element, travarse the full
  // array returned by elementsFromPoint to checik if image element is in path.
  // Can be replicated using google analytics right top user icon click
  private getPrimaryFocusElementBelowMouse(els: HTMLElement[], x: number, y: number): HTMLElement | Text {
    let i = 0;
    for (const el of els) {
      if (el.tagName && el.tagName.toLowerCase() === 'svg') {
        return el;
      }
      i++;
      if (el.getAttribute('fable-ignr-sel')) {
        break;
      }
    }

    const elBelowMouse = els[i < els.length - 1 ? i : 0] as HTMLElement;
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
    this.selectElement(anchorEl);
  };

  selectElement(el: HTMLElement, mode = HighlightMode.NOOP) {
    super.selectElement(el);
    if (mode === HighlightMode.Pinned) {
      this.pinnedMode(el);
    }
    // rest of the mode support is not yet required hence not added
  }

  private pinnedMode(el: HTMLElement) {
    this.highlightMode = HighlightMode.Pinned;
    this.onElSelect(el, this.doc);
  }

  private handleClick = (e: MouseEvent) => {
    if (this.highlightMode === HighlightMode.Selection) {
      const el = this.prevElHovered;
      if (!el) {
        throw new Error("Can't pin an element as the previously hovered element is not found");
      }
      e.stopPropagation();
      e.preventDefault();
      this.pinnedMode(el as HTMLElement);
    } else {
      (this.evts.click || []).map(f => f(e));
    }
  };
}
