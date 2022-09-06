function replaceProxyTags(nodes: Array<HTMLElement>, newTagName: string) {
  let i = 0;
  for (; i < nodes.length; i++) {
    const node = nodes[i];
    const parent = node.parentElement;
    if (parent) {
      const newEl = document.createElement(newTagName);
      const attrKeys = node.getAttributeNames();
      for (const key of attrKeys) {
        newEl.setAttribute(key, node.getAttribute(key) as string);
      }
      const childNodes = Array.prototype.slice.call(node.childNodes, 0);
      for (const child of childNodes) {
        newEl.appendChild(child);
      }

      parent.removeChild(node);
      parent.appendChild(newEl);
    } else {
      console.error('parent is null for ', node);
    }
  }
}

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/api/v1/asset/cmn/js/sw.js', { scope: '/' });
      if (registration.active) {
        replaceProxyTags(Array.prototype.slice.call(document.getElementsByTagName('fab-proxy-link'), 0), 'link');
        replaceProxyTags(Array.prototype.slice.call(document.getElementsByTagName('fab-proxy-script'), 0), 'script');
      }
    } catch (error) {
      console.error(`Registration failed with ${error}`);
    }
  }
};

registerServiceWorker();
