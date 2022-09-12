import { render } from "eta";
import HOVER_IND from "./views/hover_indicator";

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
  const props = propertyName.split(".");
  const fullPropName = `__fab_${props.join("_")}__`;
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
  const props = propertyName.split(".");
  const fullPropName = `__fab_${props.join("_")}__`;
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
  PROBING = "PROBING",
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

  constructor(doc: HTMLDocument) {
    this.doc = doc;

    this.con = this.doc.createElement("div");
    this.con.style.position = "absolute";
    this.con.innerHTML = render(HOVER_IND, {}) as string;
    this.con.setAttribute("id", `fab-fbc-${getRandomNo()}`);
    this.con.onmouseover = (e) => {
      (e as any).__fab__target = this.con;
      e.stopPropagation();
    };
    this.con.onmouseout = (e) => {
      (e as any).__fab__target = this.con;
      e.stopPropagation();
    };
    this.con.onclick = (e) => {
      e.stopPropagation();
    };
    this.con.style.fontSize = "12px";
    this.con.style.zIndex = "-1";
    this.con.style.background = "#424242";
    this.con.style.color = "#fff";
    this.con.style.padding = "4px 6px";
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
    this.con.style.display = "none";
  }

  bringInViewPort(anchorEl: HTMLStyleElement) {
    const rect = anchorEl.getBoundingClientRect();
    this.con.style.left = `${rect.left}px`;
    this.con.style.top = `${rect.top - this.rect.height + 2}px`;
    this.con.style.display = "block";
    this.con.style.zIndex = "50";
  }

  destroy() {
    this.doc.body.removeChild(this.con);
  }
}

export const pointDOMElsWhenHovered: {
  __followBehind: FollowBehindContainer | null;
  reg: (doc: HTMLDocument) => void;
  unreg: (doc: HTMLDocument) => void;
} = {
  __followBehind: null,
  reg: (doc: HTMLDocument) => {
    const that = pointDOMElsWhenHovered;
    saveCurrentProperty(doc.body, "onmousemove", null);
    that.__followBehind = new FollowBehindContainer(doc);
    doc.body.onmousemove = function (e) {
      const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
      const els = doc.elementsFromPoint(e.clientX, e.clientY) as Array<HTMLStyleElement>;
      if (that.__followBehind?.isPresentInPath(els)) {
        return;
      }
      const el = els[0];
      if (el) {
        if (el !== lastEl) {
          SELECTION_REGISTRY.PROBING.currentEl = el;
          if (lastEl) {
            restoreSavedProperty(lastEl, "style.boxShadow");
          }
          if (el.style) {
            that.__followBehind?.bringInViewPort(el);
            saveCurrentProperty(el, "style.boxShadow", "initial");
            el.style.boxShadow = "inset 0px 0px 0px 2px #424242";
          }
        }
        SELECTION_REGISTRY.PROBING.lastEl = el;
      }
    };
  },
  unreg: (doc: HTMLDocument, keepSelection = false) => {
    const lastEl = SELECTION_REGISTRY.PROBING.lastEl;
    if (lastEl) {
      restoreSavedProperty(lastEl, "style.boxShadow");
    }
    !keepSelection && SELECTION_REGISTRY.PROBING.clear();
    const that = pointDOMElsWhenHovered;
    if (that.__followBehind) {
      that.__followBehind.destroy();
    }
    restoreSavedProperty(doc.body, "onmousemove");
    restoreSavedProperty(doc.body, "onmouseout");
  },
};

// Just for testing where unit testing would require creating complex dom creation
export const __testables__ = {
  saveCurrentProperty,
  restoreSavedProperty,
};
