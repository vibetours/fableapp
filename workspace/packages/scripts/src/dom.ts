function saveCurrentProperty(el: any, propertyName: string, defaultValue: any) {
  const props = propertyName.split('.');
  const fullPropName = `__fab_${props.join('_')}__`;
  let e = el;
  for (const prop of props) {
    if (e !== null && e !== undefined && prop in e) {
      e = e[prop];
    } else {
      e = defaultValue;
      break;
    }
  }

  el[fullPropName] = e;
}

function restoreSavedProperty(el: any, propertyName: string) {
  const props = propertyName.split('.');
  const fullPropName = `__fab_${props.join('_')}__`;
  let e = el;
  for (let i = 0; i < props.length - 1; i++) {
    const prop = props[i];
    if (prop in e) {
      e = e[props[i]];
    } else {
      break;
    }
  }
  const lastProp = props[props.length - 1];
  if (lastProp in e) {
    e[lastProp] = el[fullPropName];
  }
  delete el[fullPropName];
}

export const pointDOMElsWhenHovered: {
  __lastEl: HTMLElement | null;
  reg: (doc: HTMLDocument) => void;
  unreg: (doc: HTMLDocument) => void;
} = {
  __lastEl: null,

  reg: (doc: HTMLDocument) => {
    saveCurrentProperty(doc.body, 'onmousemove', null);
    doc.body.onmousemove = function (e) {
      const that = pointDOMElsWhenHovered;
      const el = doc.elementFromPoint(e.clientX, e.clientY) as HTMLStyleElement;
      if (el) {
        if (el !== that.__lastEl) {
          if (that.__lastEl) {
            restoreSavedProperty(that.__lastEl, 'style.boxShadow');
          }
          if (el.style) {
            saveCurrentProperty(el, 'style.boxShadow', 'initial');
            el.style.boxShadow = 'inset 0px 0px 0px 2px black';
          }
        }
        that.__lastEl = el;
      }
    };
  },
  unreg: (doc: HTMLDocument) => {
    const that = pointDOMElsWhenHovered;
    if (that.__lastEl) {
      restoreSavedProperty(that.__lastEl, 'style.boxShadow');
    }
    restoreSavedProperty(doc.body, 'onmousemove');
    restoreSavedProperty(doc.body, 'onmouseout');
  },
};

// Just for testing where unit testing would require creating complex dom creation
export const __testables__ = {
  saveCurrentProperty,
  restoreSavedProperty,
};
