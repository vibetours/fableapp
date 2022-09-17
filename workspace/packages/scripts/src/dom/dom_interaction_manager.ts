import { render } from 'eta';
import FollowBehindContainer, { ContentRenderingDelegate, NodeType } from './follow_behind_container';
import { SELECTION_REGISTRY } from './el_selection';
import { getRandomNo } from './utils';
import { MASK_PREFIX_CLS_NAME } from './constants';
import TextEditingManager from './text_editing_manager';

(window as any).etarender = render;

const maskClsNameLike = new RegExp(`\\s+${MASK_PREFIX_CLS_NAME}\\d+\\s+`);
function getPrimaryFocusElementBelowMouse(els: Array<HTMLElement>, x: number, y: number, doc: Document): HTMLElement {
  let skip = 0;
  let noMoreMaskEl = false;
  for (const el of els) {
    if (!noMoreMaskEl && ` ${el.getAttribute('class') || ''} `.match(maskClsNameLike) !== null) {
      // There is an absolute positioned div used as masked used to handle interaction / draw extra element
      // When a mouse event is triggered, skip those elements from fable.
      // Note all those elements must have class name prefixed with MASK_PREFIX_CLS_NAME
      skip++;
      continue;
    } else {
      noMoreMaskEl = true;
    }
    if (el.tagName && el.tagName.toLowerCase() === 'svg') {
      // For svg elements there could be nested <g/> or <path /> etc elements
      // But we have to treat svg element as a single element otherwise the
      // element selection becomes very erratic as for each <g/> <path/> element
      // the events are triggered
      return el;
    }
  }
  const actualElBelowMouse = els[skip];
  // There might be text elements below the mouse cursor, the dom does not send those text elements
  // as part of elementsFromPoint tree. So we detect separately for this
  const text = findTextDescendantsBelowMouse(actualElBelowMouse, x, y, doc) as HTMLElement;
  return text || actualElBelowMouse;
}

function findTextDescendantsBelowMouse(el: HTMLElement, x: number, y: number, doc: Document): HTMLElement | null {
  const children = [].slice.call(el.childNodes, 0) as Array<HTMLElement>;
  if (children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
    // If there is only one child and the node is child node, then consider the whole node as text node.
    return children[0];
  }
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE || child instanceof Text) {
      const range = doc.createRange();
      range.selectNode(child);
      const rect = range.getBoundingClientRect();
      if (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom) {
        return child;
      }
    }
  }
  return null;
}

enum EditingMode {
  Selection,
  Pin
}

const ELEMENT_EDITING_MODE_ATTR = 'data-fab-eem';

const HTML_TEMPLATE_PROXY_EDIT_HEADING = `
  <div 
    class="<%= it.cls %>"
    style="display: inline-block; padding: 0px 4px;">
        <div style="display: inline-block;" ${ELEMENT_EDITING_MODE_ATTR}="${EditingMode.Pin}">
            Click outside to complete editing
        </div>
        <div style="display: inline-block;" ${ELEMENT_EDITING_MODE_ATTR}="${EditingMode.Selection}">
            <em>Click to <span class="<%= it.extraInfoCls %>"></span></em>  see more edit options
        </div>
    </div>
`;

const HTML_TEMPLATE_MAIN = `
  <div class="<%= it.cls %>"></div>
`;

class InEditingContentRenderingDelegate extends ContentRenderingDelegate {
  private stackedCls: string = `${MASK_PREFIX_CLS_NAME}${getRandomNo()}`;

  private extraInfoCls: string = `${MASK_PREFIX_CLS_NAME}${getRandomNo()}`;

  private header: HTMLElement | null = null;

  mount(point: HTMLElement): string {
    point.insertAdjacentHTML('beforeend',
      render(HTML_TEMPLATE_PROXY_EDIT_HEADING, {
        cls: this.stackedCls,
        extraInfoCls: this.extraInfoCls,
      }) as string
      + render(HTML_TEMPLATE_MAIN, {
        cls: this.stackedCls
      }) as string);

    this.header = point.getElementsByClassName(this.stackedCls)[0] as HTMLElement;

    return this.stackedCls;
  }

  updateHeaderFor(type: NodeType, mode: EditingMode) {
    if (!this.header) return;

    const pinModeHeader = this.header.querySelector(
      `[${ELEMENT_EDITING_MODE_ATTR}="${EditingMode.Pin}"]`
    ) as HTMLElement;
    const selModeHeader = this.header.querySelector(
      `[${ELEMENT_EDITING_MODE_ATTR}="${EditingMode.Selection}"]`
    ) as HTMLElement;
    if (mode === EditingMode.Pin) {
      selModeHeader.style.display = 'none';
      pinModeHeader.style.display = 'inline-block';
    } else {
      pinModeHeader.style.display = 'none';
      (this.header.getElementsByClassName(this.extraInfoCls)[0] as HTMLElement).innerText = type === NodeType.Txt
        ? 'edit text &'
        : (type === NodeType.Img ? 'edit image &' : '');
      selModeHeader.style.display = 'inline-block';
    }
  }
}

export class DomInteractionManager {
  private readonly doc: Document;

  private followBehind: FollowBehindContainer | null = null;

  private readonly followBehindContentRenderer: InEditingContentRenderingDelegate;

  private editMode: EditingMode = EditingMode.Selection;

  // private textEditingManager: TextEditingManager;
  private txtEditManager: TextEditingManager | null = null;

  constructor(doc: Document) {
    this.doc = doc;
    this.followBehindContentRenderer = new InEditingContentRenderingDelegate();
  }

  reg() {
    this.followBehind = new FollowBehindContainer(this.doc, this.followBehindContentRenderer, {
      click: this.onElEdit,
    });
    this.doc.body.addEventListener('mousemove', this.moveMaskWithElSelection, true);
  }

  unreg() {
    this.doc.body.removeEventListener('mousemove', this.moveMaskWithElSelection, true);
    SELECTION_REGISTRY.PROBING.clear();
    this.followBehind?.destroy();
  }

  private onElEdit = (e: Event, nodeType: NodeType, el: HTMLElement | Text | null): void => {
    if (!this.followBehind) return;
    this.editMode = this.editMode === EditingMode.Selection ? EditingMode.Pin : EditingMode.Selection;
    this.followBehindContentRenderer.updateHeaderFor(nodeType, this.editMode);

    this.txtEditManager?.finish();
    this.txtEditManager = null;

    if (this.editMode === EditingMode.Pin) {
      this.doc.body.removeEventListener('mousemove', this.moveMaskWithElSelection, true);
      if (nodeType === NodeType.Txt) {
        this.followBehind.fade();
        this.txtEditManager = new TextEditingManager(el as Text, e as MouseEvent, this.doc);
        this.txtEditManager.start();
      }
    } else {
      this.followBehind.unfade();
      this.doc.body.addEventListener('mousemove', this.moveMaskWithElSelection, true);
    }
  }

  private moveMaskWithElSelection = (e: MouseEvent) => {
    if (!this.followBehind) return;

    const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
    const els = this.doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLElement>;
    // We pick up all the elements that are over the mouse. If the follow behind element container
    // is present then we don't do anything as there could be the case user is choosing to select
    // an action
    const el = getPrimaryFocusElementBelowMouse(els, e.clientX, e.clientY, this.doc);
    if (el) {
      if (el !== lastEl) {
        SELECTION_REGISTRY.PROBING.currentEl = el;
        let nodeType: NodeType;
        if (el instanceof HTMLImageElement || el instanceof SVGElement) {
          nodeType = NodeType.Img;
          this.followBehindContentRenderer.updateHeaderFor(nodeType, EditingMode.Selection);
        } else if (el instanceof Text || el.nodeType === Node.TEXT_NODE) {
          nodeType = NodeType.Txt;
          this.followBehindContentRenderer.updateHeaderFor(nodeType, EditingMode.Selection);
        } else {
          nodeType = NodeType.Gen;
          this.followBehindContentRenderer.updateHeaderFor(nodeType, EditingMode.Selection);
        }

        // If the bottom most element is text then we can't compute bounding box of it (dom does not allow this)
        // hence we send the parent element for that
        const targetContainerEl = el.nodeType === Node.TEXT_NODE ? (el.parentNode as HTMLElement) : el;
        this.followBehind.bringInViewPort(targetContainerEl, el, nodeType);
      }
      SELECTION_REGISTRY.PROBING.lastEl = el;
    }
  }
}
