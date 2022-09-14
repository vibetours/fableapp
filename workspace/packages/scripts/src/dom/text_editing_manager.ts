import { restoreSavedProperty, saveCurrentProperty } from './utils';
import FollowBehindContainer, { ContentRenderingDelegate, ContentRenderingMode } from './follow_behind_container';

const ATTR_NAME_MARKED_FOR_EDITING = 'data-fab-m-4-e';

class MaskContentRenderingDelegate extends ContentRenderingDelegate {
  private editManager: TextEditingManager;

  constructor(editManager: TextEditingManager) {
    super();

    this.editManager = editManager;
  }

  mount(point: HTMLElement): void {
    this.editManager.mountMaskContent(point);
  }

  renderingMode(): ContentRenderingMode {
    return ContentRenderingMode.Cover;
  }
}

interface IListeners extends Record<string, any>{
  onOutSideSelection?: () => void;
}

export default class TextEditingManager {
  private readonly root: HTMLElement;

  private textNodes: Array<{
    el: Text;
    parent: HTMLElement;
    isNaked: boolean;
    guard?: HTMLSpanElement;
    isMarked: boolean;
  }> = [];

  private readonly doc: Document;

  private mask: FollowBehindContainer | null = null;

  private maskContent: ContentRenderingDelegate = new MaskContentRenderingDelegate(this);

  private listeners: IListeners = {};

  constructor(root: HTMLElement, doc: Document, listeners: IListeners) {
    this.root = root;
    this.doc = doc;
    this.listeners = listeners;
  }

  start() {
    // First we detect all the text elements and wrap a <span/> around a naked text element.
    // This is necessary other wide content editable delete other elements when backspace is pressed.
    // Then we highlight all the text elements and make those contenteditable
    this.findTextInSubtree(this.root);
    this.putGuardAgainstText();
    this.markTextEls();
    this.createMask();
  }

  finish() {
    this.mask?.destroy();
    this.restoreTextNodes();
  }

  mountMaskContent(mount: HTMLElement) {
  }

  private onMaskContentRootClick = (e: MouseEvent) => {
    const els = this.doc.elementsFromPoint(e.clientX, e.clientY);
    let editTarget: HTMLStyleElement | null = null;
    for (const el of els) {
      if (el.getAttribute(ATTR_NAME_MARKED_FOR_EDITING)) {
        editTarget = el as HTMLStyleElement;
        // We don't break out from the loop as there might be overlapping elements below mouse pointer.
        // In that case editTarget picks up the element which is visually towards the top
        console.log(editTarget);
      }
    }
    if (!editTarget) {
      // There is no edit target, this condition happens when user click outside selected elements
      this.listeners.onOutSideSelection && this.listeners.onOutSideSelection();
    }
  }

  private markTextEls() {
    for (const text of this.textNodes) {
      const markerEl = text.guard === undefined || text.guard === null ? text.parent : text.guard;
      saveCurrentProperty(markerEl, 'style.background', null);
      saveCurrentProperty(markerEl, 'style.border', null);
      saveCurrentProperty(markerEl, 'style.outline', null);
      markerEl.style.background = '#e3f2fd';
      markerEl.style.border = '2px solid #64b5f6';
      markerEl.style.outline = 'none';
      markerEl.setAttribute(ATTR_NAME_MARKED_FOR_EDITING, 'true');
      text.isMarked = true;
    }
  }

  private findTextInSubtree(node: HTMLElement) {
    const children = [].slice.call(node.childNodes, 0) as Array<HTMLElement>;
    let otherNodeAroundTextNode = 0;
    const texts = [];
    for (const child of children) {
      if (!(child instanceof SVGElement)) {
        // If it's a svg element we don't traverse the dom in depth as there won't be any Text element
        // TODO SVG text elements needs to be handle differently
        this.findTextInSubtree(child);
      }
      if (child instanceof Text) {
        texts.push(child);
      } else {
        otherNodeAroundTextNode += 1;
      }
    }

    if (texts.length > 0) {
      const isNaked = otherNodeAroundTextNode > 0;
      texts.forEach((tEl) => this.textNodes.push({ el: tEl, parent: node, isNaked, isMarked: false }));
    }
  }

  private putGuardAgainstText() {
    for (const text of this.textNodes) {
      if (!text.isNaked) {
        continue;
      }
      const guard = this.doc.createElement('span');
      guard.style.padding = '0px';
      guard.style.margin = '0px';
      guard.style.top = 'auto';
      guard.appendChild(text.el.cloneNode());
      text.el.replaceWith(guard);
      text.guard = guard;
    }
  }

  private restoreTextNodes() {
    for (const text of this.textNodes) {
      if (!text.isMarked) {
        return;
      }
      if (text.isNaked && text.guard) {
        text.guard.replaceWith(text.el);
      } else {
        restoreSavedProperty(text.parent, 'style.background');
        restoreSavedProperty(text.parent, 'style.border');
        restoreSavedProperty(text.parent, 'style.outline');
        text.parent.removeAttribute(ATTR_NAME_MARKED_FOR_EDITING);
      }
    }
  }

  /*
   * When content is edited there could be intractable elements in dom like button etc.
   * So if we directly edit text then the click could trigger the onclick event of that element,
   * Hence we create a mask that covers the whole body and that receives the click event and detect
   * which element received the click in host page. We then mock the same style on top of the mask and let the user edit
   * Once editing is done, the value is returned to target element
   */
  private createMask() {
    this.mask = new FollowBehindContainer(this.doc, this.maskContent, {
      onclick: this.onMaskContentRootClick
    });
    this.mask.bringInViewPort(this.doc.body);
  }
}
