export function getRep(el: HTMLElement) {
  const rep = [];
  if (el.childNodes.length === 0) {
    rep.push({ [el.tagName || "text"]: el.textContent });
    return rep;
  }
  const rep2: Array<any> = [];
  for (let i = 0; i < el.childNodes.length; i++) {
    rep2.push(getRep(el.childNodes[i] as HTMLElement));
  }
  rep.push({ [el.nodeName]: rep2 });
  return rep;
}

export function getSearializedDom() {
  const rep = getRep(document.body);
  console.log(">>> rep", rep);
  return rep;
}
