import { render } from 'eta';
import FollowBehindContainer, {
  ContentRenderingDelegate,
  ContentRenderingMode,
  NodeType
} from './follow_behind_container';
import { SELECTION_REGISTRY } from './el_selection';
import { getRandomNo } from './utils';
import { MASK_PREFIX_CLS_NAME } from './constants';

(window as any).etarender = render;

const maskClsNameLike = new RegExp(`\\s+${MASK_PREFIX_CLS_NAME}\\d+\\s+`);
function getPrimaryFocusElementBelowMouse(els: Array<HTMLElement>, x: number, y: number, doc: Document): HTMLElement {
  let skip = 0;
  let noMoreMaskEl = false;
  for (const el of els) {
    if (!noMoreMaskEl && ` ${el.getAttribute('class') || ''} `.match(maskClsNameLike) !== null) {
      // There is a absolute div as masked used to handle interaction / draw extra element
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
  // There might be text elements below the mouse cursor, the dom does not send those text elements as
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
      // console.log('childNode found');
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

const HTML_TEMPLATE_PROXY_EDIT_HEADING = `
  <div 
    class="<%= it.cls %>"
    style="display: inline-block; padding: 0px 4px;">
        <div style="display: inline-block;">
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

  private lastHeaderType: NodeType = NodeType.Gen;

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

  updateHeaderFor(type: NodeType) {
    if (!this.header) return;
    if (this.lastHeaderType === type) return;

    this.lastHeaderType = type;

    (this.header.getElementsByClassName(this.extraInfoCls)[0] as HTMLElement).innerText = type === NodeType.Txt ? 'edit'
      + ' text &' : (type === NodeType.Img ? 'edit image &' : '');
  }

  renderingMode(): ContentRenderingMode {
    return ContentRenderingMode.Stacked;
  }
}

export class DomInteractionManager {
  private readonly doc: Document;

  private followBehind: FollowBehindContainer | null = null;

  private readonly followBehindContentRenderer: InEditingContentRenderingDelegate;

  // private textEditingManager: TextEditingManager;

  constructor(doc: Document) {
    this.doc = doc;
    this.followBehindContentRenderer = new InEditingContentRenderingDelegate();
    // this.textEditingManager = new TextEditingManager(this.doc, {});
  }

  reg() {
    this.followBehind = new FollowBehindContainer(this.doc, this.followBehindContentRenderer, {
      // onclick: this.followBehindOnClick,
    });
    // this.registerBodyListener();
    this.doc.body.addEventListener('mousemove', this.onMouseMovementOnBody, true);
  }

  unreg() {
    // this.removeBodyListener();
    this.doc.body.removeEventListener('mousemove', this.onMouseMovementOnBody, true);
    this.followBehind?.destroy();
  }

  private onOutSideSelection = () => {
    // this.currentTextEditingManager?.finish();
    // this.currentTextEditingManager = null;
    // this.registerBodyListener();
  }

  /*
  private followBehindOnClick = (e: MouseEvent) => {
    const path = (e as any).path || ((e.composedPath && e.composedPath()) as Array<EventTarget>);
    for (const el of path) {
      if (el.tagName && el.tagName.toLowerCase() === 'div') {
        // TODO take classname from constants and replace the same classname in the template
        if (classNameExists(el, TEXT_EDIT_DIV_CLS)) {
          const editRoot = SELECTION_REGISTRY.PROBING.currentEl;
          if (!editRoot) {
            return;
          }
          this.removeBodyListener();

          this.currentTextEditingManager = new TextEditingManager(editRoot, this.doc, {
            onOutSideSelection: this.onOutSideSelection,
          });
          this.currentTextEditingManager.start();
        } else if (classNameExists(el, DUPLICATE_DIV_CLS)) {
          console.log('duplicate clicked');
          this.removeBodyListener();
        }
      }
    }
  };
   */

  private onMouseMovementOnBody = (e: MouseEvent) => {
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
        let textNode: Text | null;
        if (el instanceof HTMLImageElement || el instanceof SVGElement) {
          nodeType = NodeType.Img;
          this.followBehindContentRenderer.updateHeaderFor(nodeType);
        } else if (el instanceof Text || el.nodeType === Node.TEXT_NODE) {
          nodeType = NodeType.Txt;
          this.followBehindContentRenderer.updateHeaderFor(nodeType);
        } else {
          nodeType = NodeType.Gen;
          this.followBehindContentRenderer.updateHeaderFor(nodeType);
        }

        // If the bottom most element is text then we can't compute bounding box of it (dom does not allow this)
        // hence we send the parent element for that
        const targetContainerEl = el.nodeType === Node.TEXT_NODE ? (el.parentNode as HTMLElement) : el;
        this.followBehind.bringInViewPort(targetContainerEl, nodeType);
      }
      SELECTION_REGISTRY.PROBING.lastEl = el;
    }
  }

  /*
  private registerBodyListener = () => {
    saveCurrentProperty(this.doc.body, 'onmousemove', null);
    this.doc.body.onmousemove = (e) => {
      const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
      const els = this.doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLElement>;
      // We pick up all the elements that are over the mouse. If the follow behind element container
      // is present then we don't do anything as there could be the case user is choosing to select
      // an action
      if (this.followBehind?.isPresentInPath(els)) {
        return;
      }
      const el = getPrimaryFocusElement(els);
      if (el) {
        if (el !== lastEl) {
          SELECTION_REGISTRY.PROBING.currentEl = el;
          if (lastEl) {
            restoreSavedProperty(lastEl, 'style.boxShadow');
          }
          if (el.style) {
            this.followBehind?.bringInViewPort(el);
            saveCurrentProperty(el, 'style.boxShadow', 'initial');
            el.style.boxShadow = 'inset 0px 0px 0px 2px #424242';
          }
        }
        SELECTION_REGISTRY.PROBING.lastEl = el;
      }
    };
  };
   */

  /*
  private removeBodyListener() {
    const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
    if (lastEl) {
      restoreSavedProperty(lastEl, 'style.boxShadow');
    }
    SELECTION_REGISTRY.PROBING.clear();
    restoreSavedProperty(this.doc.body, 'onmousemove');
    restoreSavedProperty(this.doc.body, 'onmouseout');
  }
   */
}
