// export function getRep(el: HTMLElement) {
//   const rep = [];
//   if (el.childNodes.length === 0) {
//     rep.push({ [el.tagName || 'text']: el.textContent });
//     return rep;
//   }
//   const rep2: Array<any> = [];
//   for (let i = 0; i < el.childNodes.length; i++) {
//     rep2.push(getRep(el.childNodes[i] as HTMLElement));
//   }
//   rep.push({ [el.nodeName]: rep2 });
//   return rep;
// }

function isCaseInsensitiveEqual(str1: string | null | undefined, str2: string | null | undefined): boolean {
  if (str1 && str2 && str1.toLowerCase() === str2.toLowerCase()) {
    return true;
  }

  return false;
}

interface Rep {
  attrs: Record<string, string | null>;
  chldrn: Rep[];
  tag?: string;
  node?: string;
  nodeVal?: string;
  css?: string;
}

const getRep = (node: HTMLElement): Rep => {
  const obj = {} as Rep;

  if (node.tagName) {
    obj.tag = node.tagName.toLowerCase();
  } else if (node.nodeName) {
    obj.node = node.nodeName.toLowerCase();
  }

  if (node.tagName === 'LINK' && node.getAttribute('rel') === 'stylesheet') {
    const rules: Array<CSSRule> = [].slice.call((node as HTMLLinkElement).sheet?.cssRules, 0);
    obj.css = rules.map((r) => r.cssText).join('');
  }

  if (node.nodeValue) {
    obj.nodeVal = node.nodeValue;
  }

  const attrKeys = node.getAttributeNames();
  let childNodes = node.childNodes;

  if (node.tagName === 'IFRAME') {
    const iframe = node as HTMLIFrameElement;
    if (iframe.contentDocument) {
      childNodes = iframe.contentDocument.documentElement.childNodes;
    } else {
      // ...
    }
  }

  for (const key of attrKeys) {
    obj.attrs[key] = node.getAttribute(key);
  }

  if (childNodes) {
    obj.chldrn = [];
    for (let i = 0; i < childNodes.length; i++) {
      const childNode: ChildNode = childNodes[i];
      if (childNode.nodeType === Node.ELEMENT_NODE) {
        const htmlElNode = childNode as HTMLElement;
        htmlElNode.tagName;
      }
      if (childNode.tagName !== 'SCRIPT' && childNode.tagName !== 'NOSCRIPT') {
        obj.chldrn.push(getRep(childNode));
      }
    }
  }
  return obj;
};

export function getSearializedDom() {
  return getRep(document.body);
}
