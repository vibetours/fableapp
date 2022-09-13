import { getRandomNo } from './utils';

/*
 * Container lifecycle manager to show
 * - show extra information (context button on top around an element)
 * - perform additional action (mask on top of html body to stop interaction of host page)
 */
export default class FollowBehindContainer {
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
