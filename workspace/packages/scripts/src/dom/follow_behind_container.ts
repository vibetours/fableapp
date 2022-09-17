import { getRandomNo } from './utils';
import { MASK_PREFIX_CLS_NAME } from './constants';

export enum NodeType {
  Gen,
  Img,
  Txt,
}

/*
* TODO change this description
 * Determines how the container of the content needs to be rendered
 * Outline -> The content would be rendered around the anchored element
 * Cover -> The container should cover the full anchored element. This is used if the full anchored
 *          element is masked.
 */
export enum ContentRenderingMode {
  Stacked,
  Cover // todo see if this is needed
}

/*
 * Content the rendered content root is pushed via this delegate to the caller.
 * Caller could statically or dynamically render content.
 * Caller should not change style of the mount point.
 */
export abstract class ContentRenderingDelegate {
  abstract mount(point: HTMLElement): string;

  abstract renderingMode(): ContentRenderingMode;
}

interface IListenersList extends Record<string, any>{
  onclick?: Array<(e: MouseEvent) => void>;
  onmousemove?: Array<(e: MouseEvent) => void>;
}

export interface IUnitListeners extends Record<string, any> {
  onclick?: (e: MouseEvent) => void;
  onmousemove?: (e: MouseEvent) => void;
}

/*
 * Container lifecycle manager to show
 * - show extra information (context button on top around an element)
 * - perform additional action (mask on top of html body to stop interaction of host page)
 */
export default class FollowBehindContainer {
  private static FN_EXEC_STATUS_SKIP = 1;

  private static FN_EXEC_STATUS_ACTIVE = 0;

  private static MAX_ZINDEX_VAL = 2147483647;

  private readonly con: HTMLDivElement;

  private readonly stackedHeaderEl: HTMLElement;

  private readonly stackedMainEl: HTMLElement;

  private doc: Document;

  private contentRenderer: ContentRenderingDelegate;

  private listeners: IListenersList = {};

  private bodyRect: DOMRect;

  constructor(
    doc: Document,
    contentRenderer: ContentRenderingDelegate,
    listeners: IUnitListeners
  ) {
    this.doc = doc;
    this.bodyRect = doc.body.getBoundingClientRect();
    this.con = this.doc.createElement('div');
    this.con.style.position = 'absolute';
    this.addOrUpdateListeners(listeners);
    this.contentRenderer = contentRenderer;
    const cls = contentRenderer.mount(this.con);
    const stacks = this.con.getElementsByClassName(cls) as HTMLCollectionOf<HTMLElement>;
    this.stackedHeaderEl = stacks[0];
    this.stackedMainEl = stacks[1];

    this.setAttrs(this.stackedMainEl);

    const randClsSuffix = getRandomNo();
    this.con.setAttribute('id', `${MASK_PREFIX_CLS_NAME}${randClsSuffix}`);
    this.con.setAttribute('class', `${MASK_PREFIX_CLS_NAME}${randClsSuffix}`);
    this.con.style.fontSize = '12px';
    this.con.style.zIndex = '-1';
    // if (this.contentRenderer.renderingMode() === ContentRenderingMode.Stacked) {
    //   // Since in this mode the content is displayed around the anchor we show a it as if it's a popup menu
    //   // hence background is required
    //   this.con.style.background = '#424242';
    //   this.con.style.color = '#fff';
    //   this.con.style.padding = '1px 4px';
    // } else {
    //   // TODO[temp]
    // }
    this.addStylesheet(`
      [contenteditable]:focus {
        outline: 0px solid transparent;
      }
     
      .${cls}  {
        background: #160245;
        color: #fff;
      }
      `);
    this.doc.body.appendChild(this.con);

    // this.rect = this.con.getBoundingClientRect();
    this.moveOutsideViewPort();
  }

  addOrUpdateListeners(listeners: IUnitListeners) {
    // Individual un-registration is not handled yet
    for (const [eventName, fn] of Object.entries(listeners)) {
      let fnList;
      if (eventName in this.listeners) {
        fnList = this.listeners[eventName];
      } else {
        fnList = this.listeners[eventName] = [];
      }
      fn.__data__fab_stat__ = FollowBehindContainer.FN_EXEC_STATUS_ACTIVE;
      fnList.push(fn);
    }
  }

  pauseListener(listeners: IUnitListeners) {
    for (const [eventName, fn] of Object.entries(listeners)) {
      if (eventName in this.listeners) {
        for (const fn2 of this.listeners[eventName]) {
          if (fn2 === fn) {
            fn2.__data__fab_stat__ = FollowBehindContainer.FN_EXEC_STATUS_SKIP;
          }
        }
      }
    }
  }

  bringInViewPort(anchorEl: HTMLElement, nodeType: NodeType) {
    const rect = anchorEl.getBoundingClientRect();
    const headerRect = this.stackedHeaderEl.getBoundingClientRect();
    const headerHeight = headerRect.height;

    this.con.style.top = `${rect.top - headerHeight}px`;
    this.con.style.left = `${rect.left}px`;
    this.con.style.height = `${rect.height + headerHeight}px`;
    this.stackedMainEl.style.height = `${rect.height}px`;
    this.stackedMainEl.style.width = `${rect.width}px`;

    this.con.style.display = 'block';
    this.con.style.zIndex = `${FollowBehindContainer.MAX_ZINDEX_VAL}`;

    if (nodeType === NodeType.Txt) {
      this.con.style.cursor = 'text';
    } else {
      this.con.style.cursor = 'default';
    }
  }

  addStylesheet(content: string): string {
    const id = getRandomNo();
    const style = this.doc.createElement('style');
    style.innerHTML = content;
    this.con.appendChild(style);
    return id;
  }

  hide() {
    this.con.style.display = 'none';
  }

  destroy() {
    this.con.onmouseover = null;
    this.con.onmouseout = null;
    this.con.onmouseup = null;
    this.con.onmousedown = null;
    this.con.onpointerdown = null;
    this.con.onpointerup = null;
    this.con.onclick = null;
    this.listeners = {};
    this.doc.body.removeChild(this.con);
  }

  setCssProp(key: string, value: string): FollowBehindContainer {
    (this.con.style as any)[key] = value;
    return this;
  }

  isPresentInPath(els: Array<HTMLElement>) {
    for (const el of els) {
      if (el === this.con) {
        return true;
      }
    }
    return false;
  }

  private setAttrs(el: HTMLElement) {
    el.onmouseover = this.stopPropagationFn;
    el.onmouseout = this.stopPropagationFn;
    el.onmouseup = this.stopPropagationFn;
    el.onmousedown = this.stopPropagationFn;
    el.onpointerdown = this.stopPropagationFn;
    el.onpointerup = this.stopPropagationFn;
    el.onclick = this.listenerExecutor('onclick', true);
    el.onmousemove = this.listenerExecutor('onmousemove', true);
    // this.stackedMainEl.style.background = '#ffc10740';
    this.stackedMainEl.style.background = 'transparent';
    this.stackedMainEl.style.boxShadow = 'inset 0px 0px 0px 2px #160245';
  }

  private listenerExecutor(eventType: 'onmousemove' | 'onclick', shouldStopPropagation = true) {
    return (e: MouseEvent) => {
      shouldStopPropagation && e.stopImmediatePropagation();
      (this.listeners[eventType] || []).forEach(fn => {
        if ((fn as any).__data__fab_stat__ === FollowBehindContainer.FN_EXEC_STATUS_ACTIVE) {
          fn(e);
        }
      });
    };
  }

  private stopPropagationFn = (e: MouseEvent) => e.stopImmediatePropagation();

  private moveOutsideViewPort() {
    this.con.style.display = 'none';
  }
}
