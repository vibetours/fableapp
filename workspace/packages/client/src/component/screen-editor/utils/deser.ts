import { SerNode } from '@fable/common/dist/types';
import { trimSpaceAndNewLine } from '@fable/common/dist/utils';
import { DeSerProps } from '../preview';

export const deser = (
  serNode: SerNode,
  doc: Document,
  version: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
  // isPartOfSVG: boolean,
  // isShadowRoot: ShadowRoot | null = null,
  props: DeSerProps = { partOfSvgEl: 0, shadowParent: null }
): Node | null | undefined => {
  const newProps: DeSerProps = {
    // For svg and all the child nodes of svg set a flag
    partOfSvgEl: props.partOfSvgEl | (serNode.name === 'svg' ? 1 : 0),
    shadowParent: props.shadowParent,
  };

  let node;
  switch (serNode.type) {
    case Node.TEXT_NODE:
      node = doc.createTextNode(trimSpaceAndNewLine(serNode.props.textContent!));
      break;
    case Node.ELEMENT_NODE:
      if (serNode.name === 'meta') {
        node = doc.createComment('meta');
      } else {
        node = createHtmlElement(serNode, doc, version, newProps, assetLoadingPromises);
        newProps.shadowParent = (node as HTMLElement).shadowRoot;
      }
      break;

    case Node.COMMENT_NODE:
      node = doc.createComment(serNode.props.textContent || '');
      break;

    case Node.DOCUMENT_FRAGMENT_NODE:
      node = newProps.shadowParent;
      break;

    default:
      break;
  }

  if (!serNode.props.isHidden && !(serNode.name === 'iframe' || serNode.name === 'object')) {
    for (const child of serNode.chldrn) {
      const childNode = deser(
        child,
        doc,
        version,
        frameLoadingPromises,
        assetLoadingPromises,
        newProps
      );
      if (childNode && node && !child.props.isShadowRoot) {
        node.appendChild(childNode);
        if (child.name === 'iframe' || child.name === 'object') {
          const tNode = childNode as HTMLIFrameElement;
          // WARN[#doctypenode]
          // Mostly new html5 document would have <!doctype html><html>...</html> tag
          // older html document would not have <!doctype html> it might have transitional header or might not have
          // anything at all.
          // <!dotype html> is called DOCUMENT_TYPE_NODE
          // While serializaiton we carefully parse the dom and see if DOCUMENT_TYPE_NODE node is present or not.
          // If present, we add it in serializaiton logic.
          // However during deserialization we don't check DOCUMENT_TYPE_NODE's existence.
          // This might create issues for older document where DOCUMENT_TYPE_NODE is not present but deserialization
          // assumes document type node is present. ElPath might not match as well.
          const htmlNode = child.chldrn.find(n => n.type === Node.ELEMENT_NODE && n.name === 'html');
          if (htmlNode) {
            const p = new Promise(resolve => {
              tNode.onabort = () => {
                console.error('Iframe loading aborted');
                resolve(1);
              };
              tNode.onerror = () => {
                console.error('Iframe loading failed');
                resolve(1);
              };

              tNode.onload = () => {
                const newDoc = tNode.contentDocument!;
                deserFrame(htmlNode, newDoc, version, frameLoadingPromises, assetLoadingPromises);
                resolve(1);
              };
            });
            frameLoadingPromises.push(p);
          } else {
            console.warn('Iframe nodes are not as expected', child.chldrn);
          }
        } else if (serNode.name === 'select') {
          // For select node the value property need to be set after the child is attached
          for (const [nodePropKey, nodePropValue] of Object.entries(serNode.props.nodeProps || {})) {
            (node as any)[nodePropKey] = nodePropValue;
          }
        }
      }
    }
  } else {
    // if it's iframe, the previous iteration wold call deserFrame.
    // Iframe's contentDocument is available after it's attached to body and is loaded
  }
  return node;
};

export const createHtmlElement = (
  node: SerNode,
  doc: Document,
  version: string,
  props: DeSerProps,
  assetLoadingPromises: Promise<unknown>[]
): Node => {
  const el = props.partOfSvgEl
    ? doc.createElementNS('http://www.w3.org/2000/svg', node.name)
    : doc.createElement(node.name);

  if (node.name === 'canvas') {
    const element = el as HTMLCanvasElement;
    element.width = +(node.attrs.width ?? 0);
    element.height = +(node.attrs.height ?? 0);
    const ctx = element.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, +node.attrs.width!, +node.attrs.height!);

      const img = document.createElement('img');
      img.src = node.attrs.src!;

      img.onload = () => {
        ctx.drawImage(img, 0, 0, +node.attrs.width!, +node.attrs.height!);
      };
    }
  }

  if (node.name === 'form') {
    el.addEventListener('submit', stopEventBehaviour);
  } else if (node.name === 'input') {
    el.addEventListener('click', stopEventBehaviour);
  }

  for (const [nodePropKey, nodePropValue] of Object.entries(node.props.nodeProps || {})) {
    if (node.name === 'input' && node.attrs.type === 'file' && nodePropKey === 'value') {
      (el as any)[nodePropKey] = '';
      continue;
    }
    (el as any)[nodePropKey] = nodePropValue;
  }

  let attrKey;
  let attrValue;
  for ([attrKey, attrValue] of Object.entries(node.attrs)) {
    try {
      if (props.partOfSvgEl) {
        el.setAttributeNS(null, attrKey, attrValue === null ? 'true' : attrValue);
      } else if (node.name === 'iframe' && attrKey === 'src') {
        // safari is a bitch. I'll write why if everything works
        attrValue = `/aboutblank?ts=${+new Date()}`;
        el.setAttribute(attrKey, attrValue);
        // el.setAttribute('srcdoc', IFRAME_DEFAULT_DOC);
      } else if (node.name === 'iframe' && (attrKey === 'sandbox' || attrKey === 'allow')) {
        continue;
      } else if (node.name === 'object' && attrKey === 'data') {
        el.setAttribute(attrKey, '/aboutblank');
      } else {
        if (node.name === 'a' && attrKey === 'href') {
          // eslint-disable-next-line no-script-url
          attrValue = 'javascript:void(0);';
        }
        el.setAttribute(attrKey, attrValue === null ? 'true' : attrValue);
      }
    } catch (e) {
      console.info(`[Stage=Deser] can't set attr key=${attrKey} value=${attrValue}`);
    }
  }

  switch (version) {
    case '2023-07-27':
    case '2023-01-10':
      if (node.name === 'style' && node.props.cssRules) el.textContent = node.props.cssRules;
      break;
    default:
      if (node.name === 'style') {
        el.textContent = node.attrs.cssRules;
      }
  }

  if (node.props.isStylesheet) {
    if (node.attrs.href) {
      const p = new Promise((resolve) => {
        // on either cases we resolve the promises so that the rendering happens
        el.onload = resolve;
        el.onerror = resolve;
        el.onabort = resolve;
      });
      assetLoadingPromises.push(p);
    } else {
      console.warn('No href present for style node', node);
    }
  }

  if (node.props.isShadowHost) {
    el.attachShadow({ mode: 'open' });
  }

  return el;
};

export const deserFrame = async (
  docTree: SerNode,
  doc: Document,
  v: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
): Promise<void> => {
  const rootHTMLEl = deser(
    docTree,
    doc,
    v,
    frameLoadingPromises,
    assetLoadingPromises,
  ) as HTMLElement;
  const childNodes = doc.childNodes;
  for (let i = 0; i < childNodes.length; i++) {
    if (((childNodes[i] as any).tagName || '').toLowerCase() === 'html') {
      doc.replaceChild(rootHTMLEl, childNodes[i]);
      break;
    }
  }
};

export const deserIframeEl = (
  serNode: SerNode,
  doc: Document,
  version: string,
  frameLoadingPromises: Promise<unknown>[],
  assetLoadingPromises: Promise<unknown>[],
  props: DeSerProps = { partOfSvgEl: 0, shadowParent: null }
): void => {
  const iframeEl = deser(serNode, doc, version, frameLoadingPromises, assetLoadingPromises, props);
  const tNode = iframeEl as HTMLIFrameElement;

  const htmlNode = serNode.chldrn.find(n => n.type === Node.ELEMENT_NODE && n.name === 'html');
  if (htmlNode) {
    const p = new Promise(resolve => {
      tNode.onabort = () => {
        console.error('Iframe loading aborted');
        resolve(1);
      };
      tNode.onerror = () => {
        console.error('Iframe loading failed');
        resolve(1);
      };

      tNode.onload = () => {
        const newDoc = tNode.contentDocument!;
        deserFrame(htmlNode, newDoc, version, frameLoadingPromises, assetLoadingPromises);
        resolve(1);
      };
    });
    frameLoadingPromises.push(p);
  }
};

const stopEventBehaviour = (e: Event): void => {
  e.preventDefault();
  e.stopPropagation();
};
