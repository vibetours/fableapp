import { restoreSavedProperty, saveCurrentProperty } from './utils';

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

  constructor(root: HTMLElement, doc: Document) {
    this.root = root;
    this.doc = doc;
  }

  start() {
    // First we detect all the text elements and wrap a <span/> around a naked text element.
    // This is necessary other wide content editable delete other elements when backspace is pressed.
    // Then we highlight all the text elements and make those contenteditable
    this.findTextInSubtree(this.root);
    this.putGuardAgainstText();
    this.markTextEls();
  }

  finish() {
    this.restoreTextNodes();
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
      text.isMarked = true;
      markerEl.setAttribute('contenteditable', 'true');
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
    console.log(this.textNodes);
    for (const text of this.textNodes) {
      console.log(text.isNaked);
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
        text.parent.removeAttribute('contenteditable');
      }
    }
  }
}
