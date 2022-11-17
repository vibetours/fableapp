interface Rep {
  attrs: Record<string, string | null>;
  chldrn: Rep[];
  tag?: string;
  node?: string;
  nodeVal?: string;
  css?: string;
  type: number;
}

/*
 * This function will be used from testcases and from chrome content script exectution context
 * If it's being run from content script execution context then we don't pass the parameters to
 * the function. That's how the function behaves based on the fact the testInjectedParams is passed
 * or not. This makes the module unit testable.
 */

export function getSearializedDom(
  params?: any,
  testInjectedParams?: {
    doc: Document;
  }
) {
  function isCaseInsensitiveEqual(str1: string | null | undefined, str2: string | null | undefined): boolean {
    if (str1 && str2 && str1.toLowerCase() === str2.toLowerCase()) {
      return true;
    }

    return false;
  }

  function isContentEmpty(node: HTMLElement): boolean {
    if (node.nodeValue) {
      let content = node.nodeValue;
      content = content.replace(/[\s\n+]/g, '');
      if (content === '') {
        return true;
      }
    }

    return false;
  }

  function getRep(node: HTMLElement): Rep {
    const obj = { type: node.nodeType } as Rep;

    if (node.tagName) {
      obj.tag = node.tagName.toLowerCase();
    } else if (node.nodeName) {
      obj.node = node.nodeName.toLowerCase();
    }

    if (
      isCaseInsensitiveEqual(node.tagName, 'LINK')
      && isCaseInsensitiveEqual(node.getAttribute('rel'), 'stylesheet')
    ) {
      const rules = (node as HTMLLinkElement).sheet?.cssRules!;
      for (let i = 0; i < rules?.length; i++) {
        obj.css += rules[i].cssText;
      }
    }

    if (node.nodeValue) {
      obj.nodeVal = node.nodeValue;
    }

    let attrKeys: Array<string> = [];
    if (node.nodeType === 1) {
      attrKeys = node.getAttributeNames();
    }

    if (attrKeys.length) {
      obj.attrs = {};
      for (const key of attrKeys) {
        obj.attrs[key] = node.getAttribute(key);
      }
    }

    let childNodes = node.childNodes;

    if (isCaseInsensitiveEqual(node.tagName, 'IFRAME')) {
      const iframe = node as HTMLIFrameElement;
      if (iframe.contentDocument) {
        childNodes = iframe.contentDocument.childNodes;
      }
    }

    if (childNodes.length) {
      obj.chldrn = [];
      for (let i = 0; i < childNodes.length; i++) {
        // const childNode: ChildNode = childNodes[i];
        // const htmlElNode = childNode as HTMLElement;
        const htmlElNode = childNodes[i] as HTMLElement;
        // if (childNode.nodeType === Node.ELEMENT_NODE) {
        if (htmlElNode.nodeType === 1) {
          if (htmlElNode.tagName !== 'SCRIPT' && htmlElNode.tagName !== 'NOSCRIPT') {
            obj.chldrn.push(getRep(htmlElNode));
          }
        } else if (htmlElNode.nodeType === 3) {
          if (!isContentEmpty(htmlElNode)) {
            obj.chldrn.push(getRep(htmlElNode));
          }
        }
      }
    }
    return obj;
  }

  if (testInjectedParams && testInjectedParams.doc) {
    return getRep(testInjectedParams.doc.documentElement);
  }

  return getRep(document.documentElement);
}
