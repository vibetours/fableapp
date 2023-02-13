import { ScreenData, SerNode } from '@fable/common/dist/types';
import { trimSpaceAndNewLine } from '@fable/common/dist/utils';
import React from 'react';
import { P_RespScreen } from '../../entity-processor';
import * as Tags from './styled';

export interface IOwnProps {
  screen: P_RespScreen;
  screenData: ScreenData;
  divPadding: number;
  innerRefs?: React.MutableRefObject<HTMLIFrameElement | null>[];
  onBeforeFrameBodyDisplay: () => void;
  onFrameAssetLoad: () => void;
}

interface DeSerProps {
  partOfSvgEl: number;
}

function calculateScrollTopFromScrollFactor(scrollFactor: string, el: Element):number {
  return parseFloat(scrollFactor) * (el.scrollHeight - el.clientHeight);
}

function calculateScrollLeftFromScrollFactor(scrollFactor: string, el: Element):number {
  return parseFloat(scrollFactor) * (el.scrollWidth - el.clientWidth);
}

export default class ScreenPreview extends React.PureComponent<IOwnProps> {
  static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private assetLoadingPromises: Promise<unknown>[] = [];

  // eslint-disable-next-line react/no-unused-class-component-methods
  scaleFactor: number = 1;

  embedFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

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

    let attrKey;
    let attrValue;
    for ([attrKey, attrValue] of Object.entries(node.attrs)) {
      try {
        if (props.partOfSvgEl) {
          el.setAttributeNS(null, attrKey, attrValue === null ? 'true' : attrValue);
        } else {
          if (node.name === 'iframe' && attrKey === 'src') {
            el.setAttribute(attrKey, 'about:blank');
          }
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
      const p = new Promise((resolve) => {
        el.onload = resolve;
      });
      this.assetLoadingPromises.push(p);
    }

    return el;
  };

  deser = (serNode: SerNode, doc: Document, version: string, props: DeSerProps = { partOfSvgEl: 0 }) => {
    const newProps: DeSerProps = {
      // For svg and all the child nodes of svg set a flag
      partOfSvgEl: props.partOfSvgEl | (serNode.name === 'svg' ? 1 : 0),
    };

    let node;
    switch (serNode.type) {
      case Node.TEXT_NODE:
        node = doc.createTextNode(trimSpaceAndNewLine(serNode.props.textContent!));
        break;
      case Node.ELEMENT_NODE:
        node = this.createHtmlElement(serNode, doc, version, newProps);
        break;
      default:
        break;
    }
    for (const child of serNode.chldrn) {
      // Meta tags are not used in rendering and can be harmful if cors + base properties are altered
      // hence we altogether ignore those tags
      if (child.name === 'meta') {
        continue;
      }
      const childNode = this.deser(child, doc, version, newProps);
      if (childNode && node) {
        node.appendChild(childNode);
      }
    }
    return node;
  };

  deserDomIntoFrame = (frame: HTMLIFrameElement) => {
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
    const origFrameViewPort = frame.getBoundingClientRect();
    const scaleX = origFrameViewPort.width / this.props.screenData.vpd.w;
    const scaleY = origFrameViewPort.height / this.props.screenData.vpd.h;
    const scale = Math.min(scaleX, scaleY);
    // eslint-disable-next-line react/no-unused-class-component-methods
    this.scaleFactor = scale;
    const divPadding = this.props.divPadding;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = '0 0';
    frame.style.position = 'absolute';
    frame.style.width = `${this.props.screenData.vpd.w}px`;
    frame.style.height = `${this.props.screenData.vpd.h}px`;
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
        frameBody.style.display = 'none';
        const rootHTMLEl = this.deser(this.props.screenData.docTree, doc, this.props.screenData.version) as HTMLElement;
        const childNodes = doc.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
          if (((childNodes[i] as any).tagName || '').toLowerCase() === 'html') {
            doc.replaceChild(rootHTMLEl, childNodes[i]);
            break;
          }
        }
        if (frame && frame.contentDocument && frame.contentDocument.body) {
          frame.contentDocument.body.style.display = 'none';
        }
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
      this.deserDomIntoFrame(frame);
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
            this.props.onBeforeFrameBodyDisplay();
            frameBody.style.display = '';
            this.props.onFrameAssetLoad();

            switch (this.props.screenData.version) {
              case '2023-01-10': {
                // Apply original scroll positins to elements
                const allDocEls = doc.querySelectorAll('*');
                for (let i = 0; i < allDocEls.length; i++) {
                  const el = allDocEls[i];
                  const scrollTopFactor = allDocEls[i].getAttribute('fable-stf') || '0';
                  const scrollLeftFactor = allDocEls[i].getAttribute('fable-slf') || '0';
                  const scrollTop = calculateScrollTopFromScrollFactor(scrollTopFactor, el);
                  const scrollLeft = calculateScrollLeftFromScrollFactor(scrollLeftFactor, el);
                  allDocEls[i].removeAttribute('fable-stf');
                  allDocEls[i].removeAttribute('fable-slf');
                  el.scroll({ top: scrollTop, left: scrollLeft });
                }
                break;
              }

              default:
                break;
            }
          }
        });
        // this is a puma number for the following code to wait for the css to be aplied
        // (not downloaded) we already wait for css downlod
        // TODO Fix this deterministically
      }, 300);
    };
  }

  render() {
    return (
      <Tags.EmbedFrame
        src="about:blank"
        title={this.props.screen.displayName}
        ref={ref => {
          this.embedFrameRef.current = ref;
          if (this.props.innerRefs) {
            this.props.innerRefs.forEach(r => r.current = ref);
          }
        }}
        srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
      />
    );
  }
}
