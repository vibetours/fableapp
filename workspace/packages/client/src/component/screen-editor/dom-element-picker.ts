export default class DomElementPicker {
  private readonly doc: Document;
  private currEl: HTMLElement;
  private shouldHighlight: boolean;
  private maskEl: HTMLDivElement | null;
  private prevElHovered: Element | Text | null;

  constructor(doc: Document) {
    this.doc = doc;
    this.currEl = doc.body;
    this.shouldHighlight = false;
    this.maskEl = null;
    this.prevElHovered = null;
  }

  // get textContent() {
  //   return DOMInteractionUtilities.selectedEl.textContent;
  // }

  // set textContent(text: string | null) {
  //   DOMInteractionUtilities.selectedEl.textContent = text;
  // }

  enable() {
    this.shouldHighlight = true;
    this.getOrCreateMask();
    return this;
  }

  disable() {
    this.shouldHighlight = false;
    this.removeMaskIfPresent();
    return this;
  }

  isEnabled() {
    return this.shouldHighlight;
  }

  private getOrCreateMask() {
    if (this.maskEl) {
      return this.maskEl;
    }
    const cls = `fable-el-mask-${(Math.random() * 10 ** 6) | 0}`;
    const mask = this.doc.createElement("div");
    mask.setAttribute("class", cls);
    mask.style.position = "fixed";
    mask.style.pointerEvents = "none";
    mask.style.zIndex = "99999";
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
      if (el.tagName && el.tagName.toLowerCase() === "svg") {
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
    if (!this.shouldHighlight) return;
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
    maskBox.style.background = "#fedf644f";
    maskBox.style.boxShadow = "rgb(117, 102, 255) 0px 0px 0px 2px, rgba(0, 0, 0, 0.0) 0px 0px 0px 1000vw";
  };

  private handleClick = (event: MouseEvent) => {
    // if (!DOMInteractionUtilities.isHighlight) return;
    // const elements = this.iFrame.contentDocument?.elementsFromPoint(event.clientX, event.clientY) as HTMLElement[];
    // const el = elements[0];
    // DOMInteractionUtilities.selectedEl = el;
    // this.setSelectedEl(el);
  };

  setupHighlighting() {
    this.doc.addEventListener("mousemove", this.handleMouseMove);
    this.doc.addEventListener("click", this.handleClick);
    return this;
  }

  dispose() {
    this.shouldHighlight = false;
    this.doc.removeEventListener("mousemove", this.handleMouseMove);
    this.doc.removeEventListener("click", this.handleClick);
    this.removeMaskIfPresent();
  }
}
