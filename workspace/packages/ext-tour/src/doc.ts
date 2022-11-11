export function getSearializedDom() {
  function getRep(el: HTMLElement, rep: Array<any>) {
    if (el.childNodes.length === 0) {
      rep.push({ [el.tagName || 'text']: el.textContent });
    } else {
      const rep2: Array<any> = [];
      rep.push({ [el.nodeName]: rep2 });
      for (let i = 0; i < el.childNodes.length; i++) {
        getRep(el.childNodes[i] as HTMLElement, rep2);
      }
    }
  }

  const rep: Array<any> = [];
  getRep(document.body, rep);
  return rep;
}
