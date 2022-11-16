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
  function getRep(el: HTMLElement) {
    const rep = [];
    if (el.childNodes.length === 0) {
      rep.push({ [el.tagName || 'text']: el.textContent });
      return rep;
    }
    const rep2: Array<any> = [];
    for (let i = 0; i < el.childNodes.length; i++) {
      rep2.push(getRep(el.childNodes[i] as HTMLElement));
    }
    rep.push({ [el.nodeName]: rep2 });
    return rep;
  }

  if (testInjectedParams && testInjectedParams.doc) {
    return getRep(testInjectedParams.doc.body);
  }

  return getRep(document.body);
}
