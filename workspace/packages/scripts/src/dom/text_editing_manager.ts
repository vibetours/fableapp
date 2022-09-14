import { copyStyle, getRandomNo, restoreSavedProperty, saveCurrentProperty } from './utils';
import FollowBehindContainer, { ContentRenderingDelegate, ContentRenderingMode } from './follow_behind_container';

const ATTR_NAME_MARKED_FOR_EDITING = 'data-fab-m-4-e';

const HTML_TEMPLATE_PROXY_EDIT_HEADING = `
  <div style="
    color: white;
    font-size: 14px;
    font-weight: bold;
    margin: 2px 2px 4px;
  ">
    Edit button text
  </div>
`;

const HTML_TEMPLATE_PROXY_EDIT_FOOTER = `
  <div style="
    color: white;
    font-size: 10px;
    margin: 4px 2px 2px;
  ">
    <div>
        Press <em>⮐</em> or <em>click outside</em> to update button text.
    </div>
    <div>Press <em>Esc</em> to cancel</div>
  </div>
`;

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

  private maskMount: HTMLElement | null = null;

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
    this.maskMount = mount;
  }

  private onMaskContentRootClick = (e: MouseEvent) => {
    if (!this.mask) {
      return;
    }
    const els = this.doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLElement>;
    let editTargetEl: HTMLElement | null = null;
    let btnEl: HTMLElement | null = null;
    for (const el of els) {
      if (el.getAttribute(ATTR_NAME_MARKED_FOR_EDITING)) {
        editTargetEl = el;
        // We don't break out from the loop as there might be overlapping elements below mouse pointer.
        // In that case editTarget picks up the element which is visually towards the top
      }
      if (editTargetEl && el.tagName && el.tagName.toLowerCase() === 'button') {
        // We separately detect if there is a button element in path that would be handled separately
        // during editing
        btnEl = el;
      }
    }
    if (editTargetEl) {
      this.mask.pauseListener({
        onmousemove: this.onMaskContentRootMouseMove,
      });
      this.editTarget(editTargetEl, btnEl);
      // this.createClonedEl(editTarget);
    } else {
      // There is no edit target, this condition happens when user click outside selected elements
      this.listeners.onOutSideSelection && this.listeners.onOutSideSelection();
    }
  }

  private createBtnEditProxy(target: HTMLElement, btn: HTMLElement) {
    if (!(this.maskMount && this.mask)) {
      return;
    }
    const arrowHeight = 15;
    const borderThickness = 4;

    const btnRect = btn.getBoundingClientRect();
    const proxyCon = this.doc.createElement('div');
    proxyCon.style.position = 'absolute';
    proxyCon.style.top = `${btnRect.top + btnRect.height + arrowHeight + borderThickness}px`;
    proxyCon.style.left = `${btnRect.left}px`;
    proxyCon.style.minHeight = `${btnRect.height}px`;
    proxyCon.style.minWidth = `${btnRect.width}px`;
    proxyCon.style.border = `${borderThickness}px solid #150345`;
    proxyCon.style.background = '#150345';
    proxyCon.style.margin = '0px';
    proxyCon.style.cursor = 'default';
    proxyCon.style.boxShadow = '0px 0px 5px -1px';
    const clsName = `fab-stl-${getRandomNo()}`;
    proxyCon.setAttribute('class', clsName);
    this.mask.addStylesheet(`
      .${clsName}:after {
          content: " ";
          position: absolute;
          left: 20px;
          top: -19px;
          border-top: none;
          border-right: 15px solid transparent;
          border-left: 15px solid transparent;
          border-bottom: 15px solid #150345;
        }
    `);

    const editContainer = this.doc.createElement('div');
    copyStyle(editContainer, btn, this.doc);
    editContainer.style.height = `${btnRect.height}px`;
    editContainer.style.minWidth = '100%';
    editContainer.style.border = 'none';
    editContainer.style.background = '#fee26f';
    editContainer.style.margin = '0px';
    editContainer.style.cursor = 'text';
    editContainer.style.color = '#000';

    const children = [].slice.call(target.childNodes, 0).map((node: HTMLElement) => node.cloneNode(true));
    editContainer.append(...children);

    proxyCon.insertAdjacentHTML('beforeend', HTML_TEMPLATE_PROXY_EDIT_HEADING);
    proxyCon.append(editContainer);
    proxyCon.insertAdjacentHTML('beforeend', HTML_TEMPLATE_PROXY_EDIT_FOOTER);
    this.maskMount.append(proxyCon);

    this.focusAndSetCursor(editContainer);
  }

  private editTarget(target: HTMLElement, btnEl: HTMLElement | null) {
    if (btnEl) {
      // If the target is child of button then performing edit in line would change trigger button action
      // hence we do the editing in a popup
      this.createBtnEditProxy(target, btnEl);
    } else {
      this.focusAndSetCursor(target);
    }
  }

  private focusAndSetCursor(el: HTMLElement) {
    el.setAttribute('contenteditable', 'true');
    el.focus();
    const selection = getSelection();
    selection?.setPosition(el.childNodes[0], el.innerText.length);
  }

  private onMaskContentRootMouseMove = (e: MouseEvent) => {
    console.log('move on mask');
    const els = this.doc.elementsFromPoint(e.clientX, e.clientY);
    let editTarget = null;
    for (const el of els) {
      if (el.getAttribute(ATTR_NAME_MARKED_FOR_EDITING)) {
        editTarget = el;
        break;
      }
    }
    this.mask?.setCssProp('cursor', editTarget ? 'text' : 'default');
  }

  private markTextEls() {
    for (const text of this.textNodes) {
      const markerEl = text.guard === undefined || text.guard === null ? text.parent : text.guard;
      saveCurrentProperty(markerEl, 'style.background', null);
      saveCurrentProperty(markerEl, 'style.border', null);
      saveCurrentProperty(markerEl, 'style.outline', null);
      markerEl.style.background = '#fee26f';
      markerEl.style.border = '2px solid #150345';
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
      onclick: this.onMaskContentRootClick,
      onmousemove: this.onMaskContentRootMouseMove,
    });
    this.mask.bringInViewPort(this.doc.body);
  }
}
