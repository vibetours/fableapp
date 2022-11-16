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

interface Rep {
  attrs: Object;
  chldrn: Rep[];
  tag?: string;
  node?: string;
  nodeVal?: string;
  css?: string
}

const getRep = (node: HTMLElement): Rep => {
  const obj = {} as Rep;

  if (node.tagName) {
    obj.tag = node.tagName.toLowerCase();
  } else if (node.nodeName) {
    obj.node = node.nodeName.toLowerCase();
  }

  if (node.tagName === 'LINK' && node.attributes.rel.nodeValue === 'stylesheet') {
    obj.css = ([...node.sheet.cssRules].map(rule => rule.cssText).join(''));
  }

  if (node.nodeValue) {
    obj.nodeVal = node.nodeValue;
  }

  const attrs = node.attributes;
  let childNodes = node.childNodes;

  if (node.tagName === 'IFRAME') {
    childNodes = iframe.contentDocument.documentElement.childNodes;
  }

  if (attrs) {
    obj.attrs = {};
    // for (let i = 0; i < attrs.length; i++) {
    //   obj.attrs[attrs[i].nodeName] = attrs[i].nodeValue;
    // }
    for (const attr of attrs) {
      obj.attrs[attr.nodeName] = attr.nodeValue;
    }
  }

  if (childNodes) {
    obj.chldrn = [];
    for (let i = 0; i < childNodes.length; i++) {
      const childNode: HTMLElement = childNodes[i];
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
