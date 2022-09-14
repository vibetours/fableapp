import { getRandomNo } from './utils';

/*
 * Determines how the container of the content needs to be rendered
 * Outline -> The content would be rendered around the anchored element
 * Cover -> The container should cover the full anchored element. This is used if the full anchored
 *          element is masked.
 */
export enum ContentRenderingMode {
  Outline,
  Cover
}

/*
 * Content the rendered content root is pushed via this delegate to the caller.
 * Caller could statically or dynamically render content.
 * Caller should not change style of the mount point.
 */
export abstract class ContentRenderingDelegate {
  abstract mount(point: HTMLElement, container: FollowBehindContainer): void;

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

  private readonly con: HTMLDivElement;

  private doc: Document;

  private rect: DOMRect;

  private contentRenderer: ContentRenderingDelegate;

  private listeners: IListenersList = {};

  constructor(
    doc: Document,
    contentRenderer: ContentRenderingDelegate,
    listeners: IUnitListeners
  ) {
    this.doc = doc;
    this.con = this.doc.createElement('div');
    this.con.style.position = 'absolute';
    this.contentRenderer = contentRenderer;
    contentRenderer.mount(this.con, this);
    this.con.setAttribute('id', `fab-fbc-${getRandomNo()}`);
    this.con.onmouseover = this.stopPropagationFn;
    this.con.onmouseout = this.stopPropagationFn;
    this.con.onmouseup = this.stopPropagationFn;
    this.con.onmousedown = this.stopPropagationFn;
    this.con.onpointerdown = this.stopPropagationFn;
    this.con.onpointerup = this.stopPropagationFn;
    this.addOrUpdateListeners(listeners);
    this.con.onclick = this.listenerExecutor('onclick', true);
    this.con.onmousemove = this.listenerExecutor('onmousemove', true);
    this.con.style.fontSize = '12px';
    this.con.style.zIndex = '-1';
    if (this.contentRenderer.renderingMode() === ContentRenderingMode.Outline) {
      // Since in this mode the content is displayed around the anchor we show a it as if it's a popup menu
      // hence background is required
      this.con.style.background = '#424242';
      this.con.style.color = '#fff';
      this.con.style.padding = '4px 6px';
    } else {
      // TODO[temp]
      this.con.style.background = '#ffc10740';
    }
    this.addStylesheet(`
      [contenteditable]:focus {
        outline: 0px solid transparent;
      }`);
    this.doc.body.appendChild(this.con);

    this.rect = this.con.getBoundingClientRect();
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

  bringInViewPort(anchorEl: HTMLElement) {
    const rect = anchorEl.getBoundingClientRect();
    if (this.contentRenderer.renderingMode() === ContentRenderingMode.Cover) {
      this.con.style.top = `${rect.top}px`;
      this.con.style.height = `${rect.height}px`;
      this.con.style.width = `${rect.width}px`;
    } else if (this.contentRenderer.renderingMode() === ContentRenderingMode.Outline) {
      this.con.style.top = `${rect.top - this.rect.height + 2}px`;
      // height and width of the container becomes the height and width of content
    }
    this.con.style.left = `${rect.left}px`;
    this.con.style.display = 'block';
    this.con.style.zIndex = '50';
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
