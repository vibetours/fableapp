import { render } from 'eta';
import HOVER_IND, { DUPLICATE_DIV_CLS, TEXT_EDIT_DIV_CLS } from './views/hover_indicator';

function getRandomNo(): string {
  const msStr = (+new Date()).toString();
  return msStr.substring(4) + ((Math.random() * 10000) | 0);
}

/*
 * When a property value is set via this script, old property value is stored
 * as part of the dom object property with a default value.
 * Like if we are changing the border of an HTMLElement then old value of el.style.border
 * is saved as el.__fab_style_border__
 * This is required as often time we dynamically change property value of a dom and we restore
 * it back later
 */
function saveCurrentProperty(el: any, propertyName: string, defaultValue: any) {
  const props = propertyName.split('.');
  const fullPropName = `__fab_${props.join('_')}__`;
  let e = el;
  for (const prop of props) {
    if (e !== null && e !== undefined && prop in e) {
      e = e[prop];
    } else {
      e = defaultValue;
      break;
    }
  }

  el[fullPropName] = e;
}

/*
 * After the property value is changed some ops is performed, we restore the old property value
 * back that was stored earlier. In that case we pass (el, 'style.border') to restore the prev value
 */
function restoreSavedProperty(el: any, propertyName: string) {
  const props = propertyName.split('.');
  const fullPropName = `__fab_${props.join('_')}__`;
  let e = el;
  for (let i = 0; i < props.length - 1; i++) {
    const prop = props[i];
    if (prop in e) {
      e = e[props[i]];
    } else {
      break;
    }
  }
  const lastProp = props[props.length - 1];
  if (lastProp in e) {
    e[lastProp] = el[fullPropName];
  }
  delete el[fullPropName];
}

/*
 * Contains the current element selection of DOM.
 */
class DOMElementSelection {
  currentEl: HTMLElement | null = null;

  lastEl: HTMLElement | null = null;

  clear = () => {
    this.currentEl = null;
    this.lastEl = null;
  };

  from(that: DOMElementSelection) {
    this.currentEl = that.currentEl;
    this.lastEl = that.currentEl;
  }
}

enum SelectionRegistryType {
  // When mouse is hovered to see outline of dom elements. This happens when edit button is clicked
  // and an item is not pinned
  PROBING = 'PROBING',
}

const SELECTION_REGISTRY: Record<SelectionRegistryType, DOMElementSelection> = {
  [SelectionRegistryType.PROBING]: new DOMElementSelection(),
};

/*
 * Container to show extra information around a bounding box
 */
class FollowBehindContainer {
  private doc: Document;

  private readonly con: HTMLDivElement;

  private rect: DOMRect;

  constructor(doc: Document, childRenderer: () => string, listeners: Record<'onclick', (e: MouseEvent) => void>) {
    this.doc = doc;

    this.con = this.doc.createElement('div');
    this.con.style.position = 'absolute';
    // this.con.innerHTML = ;
    this.con.innerHTML = childRenderer();
    this.con.setAttribute('id', `fab-fbc-${getRandomNo()}`);
    this.con.onmouseover = (e) => e.stopPropagation();
    this.con.onmouseout = (e) => e.stopPropagation();
    this.con.onclick = (e) => {
      e.stopPropagation();
      if (listeners.onclick) {
        listeners.onclick(e);
      }
    };
    this.con.style.fontSize = '12px';
    this.con.style.zIndex = '-1';
    this.con.style.background = '#424242';
    this.con.style.color = '#fff';
    this.con.style.padding = '4px 6px';
    this.doc.body.appendChild(this.con);

    this.rect = this.con.getBoundingClientRect();
    this.moveOutsideViewPort();
  }

  isPresentInPath(els: Array<HTMLElement>) {
    for (const el of els) {
      if (el === this.con) {
        return true;
      }
    }
    return false;
  }

  moveOutsideViewPort() {
    this.con.style.display = 'none';
  }

  bringInViewPort(anchorEl: HTMLStyleElement) {
    const rect = anchorEl.getBoundingClientRect();
    this.con.style.left = `${rect.left}px`;
    this.con.style.top = `${rect.top - this.rect.height + 2}px`;
    this.con.style.display = 'block';
    this.con.style.zIndex = '50';
  }

  destroy() {
    this.doc.body.removeChild(this.con);
  }
}

function getHeadEl(els: Array<HTMLStyleElement>): HTMLStyleElement {
  for (const el of els) {
    if (el.tagName && el.tagName.toLowerCase() === 'svg') {
      // For svg elements there could be nested <g/> or <path /> etc elements
      // But we have to treat svg element as a single element otherwise the
      // element selection becomes very erratic as for each <g/> <path/> element
      // the events are triggered
      return el;
    }
  }
  return els[0];
}

function classNameExists(el: HTMLElement, clsName: string) {
  const cls = el.getAttribute('class');
  if (!cls) {
    return false;
  }
  const clsNames = cls.split(/\s+/);
  for (const cl of clsNames) {
    if (cl.toLowerCase() === clsName) {
      return true;
    }
  }
  return false;
}

export class TextEditingManager {
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

export class DomInteractionManager {
  private readonly doc: Document;

  private followBehind: FollowBehindContainer | null = null;

  private readonly followBehindChildRenderer: () => string;

  private currentTextEditingManager: TextEditingManager | null = null;

  constructor(doc: Document) {
    this.doc = doc;
    this.followBehindChildRenderer = () => render(HOVER_IND, {}) as string;
  }

  reg() {
    this.followBehind = new FollowBehindContainer(this.doc, this.followBehindChildRenderer, {
      onclick: this.followBehindOnClick,
    });
    this.registerBodyListener();
  }

  unreg() {
    this.removeBodyListener();
    this.followBehind?.destroy();
  }

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

          this.currentTextEditingManager = new TextEditingManager(editRoot, this.doc);
          this.currentTextEditingManager.start();
        } else if (classNameExists(el, DUPLICATE_DIV_CLS)) {
          console.log('duplicate clicked');
          this.removeBodyListener();
        }
      }
    }
  };

  private registerBodyListener = () => {
    saveCurrentProperty(this.doc.body, 'onmousemove', null);
    this.doc.body.onmousemove = (e) => {
      const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
      const els = this.doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLStyleElement>;
      // We pick up all the elements that are over the mouse. If the follow behind element container
      // is present then we don't do anything as there could be the case user is choosing to select
      // an action
      if (this.followBehind?.isPresentInPath(els)) {
        return;
      }
      const el = getHeadEl(els);
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

  private removeBodyListener() {
    const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
    if (lastEl) {
      restoreSavedProperty(lastEl, 'style.boxShadow');
    }
    SELECTION_REGISTRY.PROBING.clear();
    restoreSavedProperty(this.doc.body, 'onmousemove');
    restoreSavedProperty(this.doc.body, 'onmouseout');
  }
}

// Just for testing where unit testing would require creating complex dom creation
export const __testables__ = {
  saveCurrentProperty,
  restoreSavedProperty,
};
