import { ScreenData, SerNode } from '@fable/common/dist/types';
import { trimSpaceAndNewLine } from '@fable/common/dist/utils';
import React from 'react';
import { P_RespScreen } from '../../entity-processor';
import { scrollIframeEls } from './scroll-util';
import * as Tags from './styled';

export interface IOwnProps {
  screen: P_RespScreen;
  screenData: ScreenData;
  divPadding: number;
  hidden?: boolean;
  innerRefs?: React.MutableRefObject<HTMLIFrameElement | null>[];
  onBeforeFrameBodyDisplay: (params: { nestedFrames: HTMLIFrameElement[] }) => void;
  onFrameAssetLoad: () => void;
  isScreenPreview: boolean;
}

interface DeSerProps {
  partOfSvgEl: number;
  shadowRoot?: ShadowRoot;
  shadowParent: ShadowRoot | null;
}

const IFRAME_DEFAULT_DOC = '<!DOCTYPE html><html><head></head><body></body></html>';

export const ROOT_EMBED_IFRAME_ID = `fab-reifi-${Math.random() * (10 ** 4) | 0}`;

export default class ScreenPreview extends React.PureComponent<IOwnProps> {
  static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  // eslint-disable-next-line react/no-unused-class-component-methods
  scaleFactor: number = 1;

  embedFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  nestedFrames: Array<HTMLIFrameElement> = [];

  private assetLoadingPromises: Promise<unknown>[] = [];

  private frameLoadingPromises: Promise<unknown>[] = [];

  deser = (
    serNode: SerNode,
    doc: Document,
    version: string,
    props: DeSerProps = { partOfSvgEl: 0, shadowParent: null }
  ) => {
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
          node = this.createHtmlElement(serNode, doc, version, newProps);
          newProps.shadowParent = (node as HTMLElement).shadowRoot;
        }
        break;

      case Node.COMMENT_NODE:
        node = doc.createComment('');
        break;

      case Node.DOCUMENT_FRAGMENT_NODE:
        node = newProps.shadowParent;
        break;

      default:
        break;
    }

    if (!serNode.props.isHidden && !(serNode.name === 'iframe' || serNode.name === 'object')) {
      for (const child of serNode.chldrn) {
        const childNode = this.deser(child, doc, version, newProps);
        if (childNode && node && !child.props.isShadowRoot) {
          node.appendChild(childNode);
          if (child.name === 'iframe' || child.name === 'object') {
            const tNode = childNode as HTMLIFrameElement;
            if (child.chldrn.length === 1) {
              this.frameLoadingPromises.push(
                new Promise(resolve => {
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
                    this.deserFrame(child.chldrn[0], newDoc, version);
                    if (newDoc.body) {
                      const box = tNode.getBoundingClientRect();
                      newDoc.body.setAttribute('dxdy', `${box.x},${box.y}`);
                    }
                    this.nestedFrames.push(tNode);
                    resolve(1);
                  };
                })
              );
            } else {
              console.warn('Iframe nodes are more than it could ingest', child.chldrn);
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

  deserFrame = async (docTree: SerNode, doc: Document, v: string) => {
    const rootHTMLEl = this.deser(docTree, doc, v) as HTMLElement;
    const childNodes = doc.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      if (((childNodes[i] as any).tagName || '').toLowerCase() === 'html') {
        doc.replaceChild(rootHTMLEl, childNodes[i]);
        break;
      }
    }
  };

  // eslint-disable-next-line class-methods-use-this
  stopEventBehaviour = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };

  deserDomIntoFrame = async (frame: HTMLIFrameElement) => {
    /*
     * FIXME By default assume all pages are responsive via css
     *       But there will always be pages like gmail, analytics where responsiveness is implemented via js
     *       For those cases ask user to select if the page is responsive or not.
     *       If it's responsive don't apply any scaling / zooming
     *       If it's not responsive for chrome apply zoom, for firefox apply the following logic.
     *       For scaling, always do width fitting and height should take up the whole height of parent
     */

    // This calculation is to make transform: scale work like zoom property.
    // We can't use Zoom property as it's only supported by chrome and some version of ie.
    //
    // There might be pages (Google Analytics) that are not responsive and while capturing from extension it was
    // captured from a different dimension than a screen that is used to preview the screen.
    //
    // To support screen dimension interchangeably, we have to zoom in / zoom out the screen keeping the aspect ratio
    // same. The following calculation is done >>>
    //
    // 1. Calculate the boundingRect for iframe before we scale. Ideally that's the actual dimension of the frame.
    // 2. Figure out the scale factor for the current screen vs the screen the page was captured
    // 3. Apply scale to the element (wrt origin 0, 0 ; default scaling is centered)
    // 4. Now the container is visually smaller (for scale < 1) than the original one before it was scaled
    // 5. Figure out what's the new height and width with the scale applied

    const origFrameViewPort = frame.parentElement!.getBoundingClientRect();

    let vpdW = this.props.screenData.vpd.w;
    let vpdH = this.props.screenData.vpd.h;

    if (vpdW === -1 && vpdH === -1) {
      vpdW = origFrameViewPort.width;
      vpdH = origFrameViewPort.height;
    }

    const scaleX = origFrameViewPort.width / vpdW;
    const scaleY = origFrameViewPort.height / vpdH;
    const scale = Math.min(scaleX, scaleY);
    // eslint-disable-next-line react/no-unused-class-component-methods
    this.scaleFactor = scale;
    const divPadding = this.props.divPadding;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = '0 0';
    frame.style.position = 'absolute';
    frame.style.width = `${vpdW}px`;
    frame.style.height = `${vpdH}px`;
    const viewPortAfterScaling = frame.getBoundingClientRect();
    // Bring the iframe in center
    if (origFrameViewPort.width > viewPortAfterScaling.width) {
      frame.style.left = `${(origFrameViewPort.width - viewPortAfterScaling.width) / 2 + divPadding}px`;
    }
    if (origFrameViewPort.height - viewPortAfterScaling.height) {
      frame.style.top = `${(origFrameViewPort.height - viewPortAfterScaling.height) / 2 + divPadding}px`;
    }

    const doc = frame?.contentDocument;
    const frameBody = doc?.body;
    const frameHtml = doc?.documentElement;
    if (doc) {
      if (frameHtml && frameBody) {
        this.deserFrame(this.props.screenData.docTree, doc, this.props.screenData.version);
        frame.contentDocument.body.style.visibility = 'hidden';
        while (this.frameLoadingPromises.length) {
          await this.frameLoadingPromises.shift();
        }
        frame.contentDocument.body.setAttribute('dxdy', '0,0');
      } else {
        throw new Error("Can't find body of embed iframe");
      }
    } else {
      throw new Error("Can't find document of embed iframe");
    }
  };

  componentDidMount() {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      throw new Error("Can't find embed iframe");
    }

    frame.onload = () => {
      setTimeout(async () => {
        await this.deserDomIntoFrame(frame);
        /* requestAnimationFrame */setTimeout(() => {
          const doc = frame.contentDocument;
          const frameBody = doc?.body;
          // Make the iframe visible after all the assets are loaded
          Promise.all(this.assetLoadingPromises).then(() => {
            // create a elative container that would contain all the falbe related els
            if (frameBody) {
              let umbrellaDiv = doc.getElementsByClassName('fable-rt-umbrl')[0] as HTMLDivElement;
              if (!umbrellaDiv) {
                umbrellaDiv = doc.createElement('div');
                umbrellaDiv.setAttribute('class', 'fable-rt-umbrl');
                umbrellaDiv.style.position = 'absolute';
                umbrellaDiv.style.left = `${0}`;
                umbrellaDiv.style.top = `${0}`;
                frameBody.appendChild(umbrellaDiv);
              }
              this.props.onBeforeFrameBodyDisplay({
                nestedFrames: this.nestedFrames,
              });
              frameBody.style.visibility = 'visible';
              this.assetLoadingPromises.length = 0;
              if (this.props.isScreenPreview) {
                scrollIframeEls(this.props.screenData.version, doc);
              }
              this.props.onFrameAssetLoad();
            }
          });
        }, 100);
      // If the screen is prerendered (hence hidden) we wait for 2seconds before we start rendering as
      // the rendered screen might do scrolling to the element and this is a arbritary time to wait so that
      // the scroll animation is closer to 60fps.
      // TODO A better way to detect scroll is to update a global variable about scrolling status.
      }, this.props.hidden ? 1000 : 16);
    };
  }

  render() {
    return (
      <Tags.EmbedFrame
        key={this.props.screen.rid}
        src="about:blank"
        title={this.props.screen.displayName}
        id={ROOT_EMBED_IFRAME_ID}
        style={{
          visibility: this.props.hidden ? 'hidden' : 'visible',
        }}
        ref={ref => {
          this.embedFrameRef.current = ref;
          if (this.props.innerRefs) {
            this.props.innerRefs.forEach(r => r.current = ref);
          }
        }}
        srcDoc={IFRAME_DEFAULT_DOC}
      />
    );
  }

  private createHtmlElement = (node: SerNode, doc: Document, version: string, props: DeSerProps) => {
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

      return element;
    }

    if (node.name === 'form') {
      el.addEventListener('submit', this.stopEventBehaviour);
    } else if (node.name === 'input') {
      el.addEventListener('click', this.stopEventBehaviour);
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
          attrValue = 'about:blank';
          el.setAttribute(attrKey, attrValue);
          el.setAttribute('srcdoc', IFRAME_DEFAULT_DOC);
          el.setAttribute('scrolling', 'yes');
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
        this.assetLoadingPromises.push(p);
      } else {
        console.warn('No href present for style node', node);
      }
    }

    if (node.props.isShadowHost) {
      el.attachShadow({ mode: 'open' });
    }

    return el;
  };
}
