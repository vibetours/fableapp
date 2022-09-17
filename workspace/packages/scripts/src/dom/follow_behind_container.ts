import { getRandomNo } from './utils';
import { MASK_PREFIX_CLS_NAME } from './constants';

export enum NodeType {
  Gen,
  Img,
  Txt,
  NA
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
 * Caller should manage the content rendering, for any bound box updating currentAnchorEl needs to be called after
 * content update.
 */
export abstract class ContentRenderingDelegate {
  abstract mount(point: HTMLElement): string;

  abstract renderingMode(): ContentRenderingMode;
}

export enum EListenerFnExecStatus {
  FN_EXEC_STATUS_SKIP,
  FN_EXEC_STATUS_ACTIVE,
}

interface IEventListenerFn {
  __data__fab_stat__?: EListenerFnExecStatus,

  (e: Event, nodeType: NodeType, el: HTMLElement | null): void,
}

export type IListenersList = Partial<Record<keyof GlobalEventHandlersEventMap, Array<IEventListenerFn>>>;

export type IUnitListener = Partial<Record<keyof GlobalEventHandlersEventMap, IEventListenerFn>>;

export default class FollowBehindContainer {
  private static MAX_Z_INDEX_VAL = 2147483647;

  private readonly con: HTMLDivElement;

  private readonly stackedHeaderEl: HTMLElement;

  private readonly stackedMainEl: HTMLElement;

  private doc: Document;

  private win: Window;

  private contentRenderer: ContentRenderingDelegate;

  private listeners: Partial<IListenersList> = {};

  private bodyRect: DOMRect;

  private currentNodeType: NodeType = NodeType.NA;

  private targetEl: HTMLElement | null = null;

  constructor(
    doc: Document,
    contentRenderer: ContentRenderingDelegate,
    listeners: IUnitListener
  ) {
    this.doc = doc;
    this.win = doc.defaultView as Window;
    this.bodyRect = doc.body.getBoundingClientRect();
    this.con = this.doc.createElement('div');
    this.con.style.position = 'absolute';
    this.addOrUpdateListeners(listeners);
    this.contentRenderer = contentRenderer;
    const cls = contentRenderer.mount(this.con);
    const stacks = this.con.getElementsByClassName(cls) as HTMLCollectionOf<HTMLElement>;
    this.stackedHeaderEl = stacks[0];
    this.stackedMainEl = stacks[1];

    this.stackedMainEl.style.background = 'transparent';
    this.stackedMainEl.style.boxShadow = 'inset 0px 0px 0px 2px #160245';

    const randClsSuffix = getRandomNo();
    this.con.setAttribute('id', `${MASK_PREFIX_CLS_NAME}${randClsSuffix}`);
    this.con.setAttribute('class', `${MASK_PREFIX_CLS_NAME}${randClsSuffix}`);
    this.con.style.fontSize = '12px';
    // Header calculation goes to toss sometime if this property is not present. This makes the text in one line
    this.con.style.whiteSpace = 'nowrap';
    this.con.style.zIndex = '-1';
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
    this.moveOutsideViewPort();
    this.makeEditHostReadOnly();
  }

  makeEditHostReadOnly() {
    // Stop event propagation in CAPTURE phase
    // WARN: For event like mousemove, don't attach directly, as with every move it looks for listeners to fire.
    //      Probably create a simpler stop propagation function
    this.win.addEventListener('click', this.stopPropagationWithHookFn, true);
    this.win.addEventListener('mousedown', this.stopPropagationWithHookFn, true);
    this.win.addEventListener('mouseup', this.stopPropagationWithHookFn, true);
    this.win.addEventListener('pointerdown', this.stopPropagationWithHookFn, true);
    this.win.addEventListener('pointerup', this.stopPropagationWithHookFn, true);
    this.con.style.pointerEvents = 'all';
  }

  makeEditHostInteractive() {
    this.win.removeEventListener('click', this.stopPropagationWithHookFn, true);
    this.win.removeEventListener('mousedown', this.stopPropagationWithHookFn, true);
    this.win.removeEventListener('mouseup', this.stopPropagationWithHookFn, true);
    this.win.removeEventListener('pointerdown', this.stopPropagationWithHookFn, true);
    this.win.removeEventListener('pointerup', this.stopPropagationWithHookFn, true);
    this.con.style.pointerEvents = 'none';
  }

  addOrUpdateListeners(listeners: IUnitListener) {
    // Individual un-registration is not handled yet
    for (const [eventName, fn] of Object.entries(listeners)) {
      if (!fn) continue;
      const eventType = eventName as keyof GlobalEventHandlersEventMap;
      let fnList: Array<IEventListenerFn> = [];
      if (eventType in this.listeners) {
        fnList = this.listeners[eventType] as Array<IEventListenerFn>;
      } else {
        fnList = this.listeners[eventType] = [];
      }
      fn.__data__fab_stat__ = EListenerFnExecStatus.FN_EXEC_STATUS_ACTIVE;
      fnList.push(fn);
    }
  }

  pauseListener(listeners: IUnitListener) {
    for (const [eventName, fn] of Object.entries(listeners)) {
      const eventType = eventName as keyof GlobalEventHandlersEventMap;
      for (const fn2 of (this.listeners[eventType] || [])) {
        if (fn2 === fn) {
          fn2.__data__fab_stat__ = EListenerFnExecStatus.FN_EXEC_STATUS_SKIP;
        }
      }
    }
  }

  /*
   * If a text is clicked then targetElement <- text and
   * anchorElement <- is the parent
   * This separation is done because text is limited in terms of interaction, the final exact
   * target is necessary
   */
  bringInViewPort(anchorEl: HTMLElement, targetElement: HTMLElement, nodeType: NodeType) {
    this.currentNodeType = nodeType;
    this.targetEl = targetElement;

    const rect = anchorEl.getBoundingClientRect();
    const headerRect = this.stackedHeaderEl.getBoundingClientRect();
    const headerHeight = headerRect.height;

    this.con.style.top = `${rect.top + this.win.scrollY - headerHeight}px`;
    this.con.style.left = `${rect.left + this.win.scrollX}px`;
    this.con.style.height = `${rect.height + headerHeight}px`;
    this.stackedMainEl.style.height = `${rect.height}px`;
    this.stackedMainEl.style.width = `${rect.width}px`;

    this.con.style.display = 'block';
    this.con.style.zIndex = `${FollowBehindContainer.MAX_Z_INDEX_VAL}`;

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
    this.listeners = {};
    this.makeEditHostInteractive();
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

  fade() {
    this.stackedMainEl.style.boxShadow = 'inset 0px 0px 0px 0px #160245';
  }

  unfade() {
    this.stackedMainEl.style.boxShadow = 'inset 0px 0px 0px 2px #160245';
  }

  private executeListeners = (type: keyof GlobalEventHandlersEventMap, e: Event) => {
    (this.listeners[type] || []).forEach((fn: IEventListenerFn) => {
      if (fn.__data__fab_stat__ === EListenerFnExecStatus.FN_EXEC_STATUS_ACTIVE) {
        fn(e, this.currentNodeType, this.targetEl);
      }
    });
  }

  private stopPropagationWithHookFn = (e: Event) => {
    this.executeListeners(e.type as keyof GlobalEventHandlersEventMap, e);
    e.stopImmediatePropagation();
  }

  private moveOutsideViewPort() {
    this.con.style.display = 'none';
  }
}
