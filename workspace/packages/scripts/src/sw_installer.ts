import { InboundMessageTypes, EmptyMsg, OutboundMessageTypes } from '@fable/common/dist/constants';
import { registerMsgListener, sendMessageToParent } from './messaging';
import { DomInteractionManager } from './dom';

function getAttr(node: HTMLElement, attrName: string): string {
  return (node.getAttribute(attrName) || '').trim();
}

function replaceProxyTags(nodes: Array<HTMLElement>, tagType: string) {
  let i = 0;
  for (; i < nodes.length; i++) {
    const node = nodes[i];
    if ((tagType === 'link' && getAttr(node, 'href') !== '') || (tagType === 'script' && getAttr(node, 'src') !== '')) {
      // If the scripts have already valid source attributes then we don't edit those
      continue;
    }

    const newEl = document.createElement(tagType);
    const attrsName = node.getAttributeNames();
    for (const attrName of attrsName) {
      const proxyAttrMatch = attrName.match(/^data-fl-pxy-(.*)/);
      if (proxyAttrMatch != null && proxyAttrMatch.length >= 2) {
        newEl.setAttribute(proxyAttrMatch[1], getAttr(node, proxyAttrMatch[0]));
      } else {
        newEl.setAttribute(attrName, getAttr(node, attrName));
      }
    }

    const childNodes = Array.prototype.slice.call(node.childNodes, 0);
    newEl.append(...childNodes);

    const parent = node.parentElement;
    if (parent) {
      parent.removeChild(node);
      parent.appendChild(newEl);
    } else {
      console.log('Parent not found for node', node.outerHTML);
    }
  }
}

let domInteractionManager: DomInteractionManager | null = null;
registerMsgListener(InboundMessageTypes.EditModeStart, (data: typeof EmptyMsg) => {
  domInteractionManager = new DomInteractionManager(document);
  domInteractionManager.reg();
});

registerMsgListener(InboundMessageTypes.EditModeEnd, (data: typeof EmptyMsg) => {
  domInteractionManager?.unreg();
});

function init() {
  /*
   * The html documents are when recorded in Fable are edited in flight and the content is edited.
   * The inflight edit changes the <script src="..."></script> tag to <script data-fl-pxy-src="..."></script>
   * The value of src attr and data-fl-pxy-src attr is same.
   *
   * After fetching the html content in client side and post ServiceWorker installation
   * We findout all the scripts that have data-fl-pxy-* attrs and create a new tag with and replace
   * data-fl-pxy-src with src tag.
   *
   * NOTE: we have to create new script / link tag, we can't just change the attr on the same node from
   * src to data-fl-pxy-src. As browser won't be executing the js in this case. (This is part of specification)
   *
   * NOTE: While calling replaceProxyTags we can't pass the doc.getElementsByTagName("...") directly as any mutation
   * inside the function would changes the collection while the iteration is in place
   */
  replaceProxyTags([].slice.call(document.getElementsByTagName('link'), 0), 'link');
  replaceProxyTags([].slice.call(document.getElementsByTagName('script'), 0), 'script');

  // Send a message to the parent window (host of iframe) that the embed is ready.
  // NOTE: this does not mean the page is fully rendered, it merely means the proxy activation
  // and script restoration is done
  sendMessageToParent({
    type: OutboundMessageTypes.EmbedReady,
    data: EmptyMsg,
  });
}

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/api/v1/asset/cmn/js/sw.js', { scope: '/' });
      if (reg.installing || reg.waiting) {
        const sw = (reg.installing || reg.waiting) as ServiceWorker;
        sw.onstatechange = () => {
          if (sw.state === 'activated') {
            // If the worker is now in activated stage then replace the proxy tags
            init();
          }
        };
      } else if (reg.active) {
        // If the worker is already active then replace the proxy tags
        init();
      }
    } catch (error) {
      console.error(`ServiceWorker Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();
