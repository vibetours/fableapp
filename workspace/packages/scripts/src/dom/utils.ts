export function getRandomNo(): string {
  const msStr = (+new Date()).toString();
  return msStr.substring(4) + ((Math.random() * 1000000) | 0);
}

/*
 * When a property value is set via this script, old property value is stored
 * as part of the dom object property with a default value.
 * Like if we are changing the border of an HTMLElement then old value of el.style.border
 * is saved as el.__fab_style_border__
 * This is required as often time we dynamically change property value of a dom and we restore
 * it back later
 */
export function saveCurrentProperty(el: any, propertyName: string, defaultValue: any) {
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

/*
 * After the property value is changed some ops is performed, we restore the old property value
 * back that was stored earlier. In that case we pass (el, 'style.border') to restore the prev value
 */
export function restoreSavedProperty(el: any, propertyName: string) {
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

export function classNameExists(el: HTMLElement, clsName: string) {
  const cls = el.getAttribute('class');
  if (!cls) {
    return false;
  }
  const clsNames = cls.split(/\s+/);
  for (const cl of clsNames) {
    if (cl.toLowerCase() === clsName) {
      return true;
    }
  }
  return false;
}
