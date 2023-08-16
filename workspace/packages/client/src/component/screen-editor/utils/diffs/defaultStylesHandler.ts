export function getDefaultStyleEls(doc: Document): Element[] {
  const antDStyleTags = [];
  const head = doc.head;
  for (let i = 0; i < head.childNodes.length; i++) {
    const el = head.childNodes[i];
    if (el.nodeName.toLowerCase() === 'style' && !(el as Element).getAttribute('f-id')) {
      antDStyleTags.push(el as Element);
    }
  }
  return antDStyleTags;
}

export function removeDefaultStyleEls(styleNodes: Element[]): void {
  styleNodes.forEach((el) => el.remove());
}

export function addDefaultStyleEls(doc: Document, styleNodes: Element[]): void {
  styleNodes.forEach((el) => doc.head.appendChild(el));
}
