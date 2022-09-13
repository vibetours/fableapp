import { render } from 'eta';
import HOVER_IND from './views/hover_indicator';

function getRandomNo(): string {
  const msStr = (+new Date()).toString();
  return msStr.substring(4) + ((Math.random() * 10000) | 0);
}

/*
 * When a property value is set via this script, old property value is stored
 * as part of the dom object property with a default value.
 * Like if we are changing the border of an HTMLElement then old value of el.style.border
 * is saved as el.__fab_style_border__
 * This is required as often time we dynmically change property value of an dom and we restore
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
  private doc: HTMLDocument;

  private con: HTMLDivElement;

  private rect: DOMRect;

  constructor(doc: HTMLDocument, childRenderer: () => string, listeners: Record<'onclick', (e: MouseEvent) => void>) {
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

export class DomInteractionManager {
  private doc: HTMLDocument;

  private followBehind: FollowBehindContainer | null = null;

  private followBehindChildRenderer: () => string;

  private followBehindOnClick = (e: MouseEvent) => {
    const path = (e as any).path || ((e.composedPath && e.composedPath()) as Array<EventTarget>);
    for (const el of path) {
      if (el.tagName && el.tagName.toLowerCase() === 'div') {
        if (classNameExists(el, 'fab-fbi-tedit')) {
          console.log('text selection clicked');
        } else if (classNameExists(el, 'fab-fbi-edup')) {
          console.log('duplicate clicked');
          // 2
        }
      }
    }
  };

  constructor(doc: HTMLDocument) {
    this.doc = doc;
    this.followBehindChildRenderer = () => render(HOVER_IND, {}) as string;
  }

  reg() {
    saveCurrentProperty(this.doc.body, 'onmousemove', null);
    this.followBehind = new FollowBehindContainer(this.doc, this.followBehindChildRenderer, {
      onclick: this.followBehindOnClick,
    });
    this.doc.body.onmousemove = (e) => {
      const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
      const els = this.doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLStyleElement>;
      // We pickup all the elements that are over the mouse. If the follow behind element container
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
  }

  unreg() {
    const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
    if (lastEl) {
      restoreSavedProperty(lastEl, 'style.boxShadow');
    }
    SELECTION_REGISTRY.PROBING.clear();
    this.followBehind?.destroy();
    restoreSavedProperty(this.doc.body, 'onmousemove');
    restoreSavedProperty(this.doc.body, 'onmouseout');
  }
}

// Just for testing where unit testing would require creating complex dom creation
export const __testables__ = {
  saveCurrentProperty,
  restoreSavedProperty,
};
