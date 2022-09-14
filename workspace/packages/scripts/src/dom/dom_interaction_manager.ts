import { render } from 'eta';
import HOVER_IND, { DUPLICATE_DIV_CLS, TEXT_EDIT_DIV_CLS } from '../views/hover_indicator';
import { classNameExists, restoreSavedProperty, saveCurrentProperty } from './utils';
import FollowBehindContainer, { ContentRenderingDelegate, ContentRenderingMode } from './follow_behind_container';
import TextEditingManager from './text_editing_manager';
import { SELECTION_REGISTRY } from './el_selection';

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

class StaticContentRenderingDelegate extends ContentRenderingDelegate {
  mount(point: HTMLElement): void {
    point.innerHTML = render(HOVER_IND, {}) as string;
  }

  renderingMode(): ContentRenderingMode {
    return ContentRenderingMode.Outline;
  }
}

export class DomInteractionManager {
  private readonly doc: Document;

  private followBehind: FollowBehindContainer | null = null;

  private readonly followBehindContentRenderer: ContentRenderingDelegate;

  private currentTextEditingManager: TextEditingManager | null = null;

  constructor(doc: Document) {
    this.doc = doc;
    this.followBehindContentRenderer = new StaticContentRenderingDelegate();
  }

  reg() {
    this.followBehind = new FollowBehindContainer(this.doc, this.followBehindContentRenderer, {
      onclick: this.followBehindOnClick,
    });
    this.registerBodyListener();
  }

  unreg() {
    this.removeBodyListener();
    this.followBehind?.destroy();
  }

  private onOutSideSelection = () => {
    this.currentTextEditingManager?.finish();
    this.currentTextEditingManager = null;
    this.registerBodyListener();
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
