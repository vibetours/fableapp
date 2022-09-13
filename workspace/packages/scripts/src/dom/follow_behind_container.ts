import { getRandomNo } from './utils';

/*
 * Content the rendered content root is pushed via this delegate to the caller.
 * Caller could statically or dynamically render content.
 * Caller should not change style of the mount point.
 */
export abstract class ContentRenderingDelegate {
  abstract mount(point: HTMLElement): void;
}

/*
 * Container lifecycle manager to show
 * - show extra information (context button on top around an element)
 * - perform additional action (mask on top of html body to stop interaction of host page)
 */
export default class FollowBehindContainer {
  private doc: Document;

  private readonly con: HTMLDivElement;

  private rect: DOMRect;

  constructor(
    doc: Document,
    contentRenderer: ContentRenderingDelegate,
    listeners: Record<'onclick', (e: MouseEvent) => void>
  ) {
    this.doc = doc;
    this.con = this.doc.createElement('div');
    this.con.style.position = 'absolute';
    contentRenderer.mount(this.con);
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

  isPresentInPath(els: Array<HTMLElement>) {
    for (const el of els) {
      if (el === this.con) {
        return true;
      }
    }
    return false;
  }

  private moveOutsideViewPort() {
    this.con.style.display = 'none';
  }
}
