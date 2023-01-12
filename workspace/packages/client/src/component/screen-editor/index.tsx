import { RespScreen } from "@fable/common/dist/api-contract";
import { ScreenData, SerNode } from "@fable/common/dist/types";
import React from "react";
import * as Tags from "./styled";
import { detect } from "@fable/common/dist/detect-browser";
import DomElPicker from "./dom-element-picker";

const browser = detect();

interface IOwnProps {
  screen: RespScreen;
  screenData: ScreenData;
}
interface IOwnStateProps {}

interface DeSerProps {
  partofSvgEl: number;
}

/*
 * This component should only be loaded once all the screen data is available.
 */
export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement>;
  private assetLoadingPromises: Promise<unknown>[] = [];
  private domElPicker: DomElPicker | null = null;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
  }

  createHtmlElement = (node: SerNode, doc: Document, props: DeSerProps) => {
    const el = props.partofSvgEl
      ? doc.createElementNS("http://www.w3.org/2000/svg", node.name)
      : doc.createElement(node.name);

    for (const [attrKey, attrValue] of Object.entries(node.attrs)) {
      try {
        if (props.partofSvgEl) {
          el.setAttributeNS(null, attrKey, attrValue === null ? "true" : attrValue);
        } else {
          if (node.name === "iframe" && attrKey === "src") {
            el.setAttribute(attrKey, "about:blank");
          }
          el.setAttribute(attrKey, attrValue === null ? "true" : attrValue);
        }
      } catch (e) {
        console.info(`[Stage=Deser] can't set attr key=${attrKey} value=${attrValue}`);
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

  deser = (serNode: SerNode, doc: Document, props: DeSerProps = { partofSvgEl: 0 }) => {
    const newProps: DeSerProps = {
      // For svg and all the child nodes of svg set a flag
      partofSvgEl: props.partofSvgEl | (serNode.name === "svg" ? 1 : 0),
    };

    let node;
    switch (serNode.type) {
      case Node.TEXT_NODE:
        node = doc.createTextNode(serNode.props.textContent!);
        break;
      case Node.ELEMENT_NODE:
        node = this.createHtmlElement(serNode, doc, newProps);
        break;
      default:
        break;
    }
    for (const child of serNode.chldrn) {
      // Meta tags are not used in rendering and can be harmful if cors + base properties are altered
      // hence we altogether ignore those tags
      if (child.name === "meta") {
        continue;
      }
      const childNode = this.deser(child, doc, newProps);
      if (childNode && node) {
        node.appendChild(childNode);
      }
    }
    return node;

    // if (serNode.name === "html" && parent.nodeType === Node.DOCUMENT_NODE) {
    // } else {
    //   parent.appendChild(el);
    // }
  };

  deserDomIntoFrame = (frame: HTMLIFrameElement) => {
    // This calculation is to make transform: scale work like zoom property.
    // We can't use zoom property as it's only supported by chrome and some version of ie.
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
    const scale = origFrameViewPort.width / this.props.screenData.vpd.w;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = "0 0";
    const frameViewPortAfterScaling = frame.getBoundingClientRect();
    frame.style.height = `${(origFrameViewPort.height / frameViewPortAfterScaling.height) * 100}%`;
    frame.style.width = `${(origFrameViewPort.width / frameViewPortAfterScaling.width) * 100}%`;

    const doc = frame?.contentDocument;
    const frameBody = doc?.body;
    const frameHtml = doc?.documentElement;
    if (doc) {
      if (frameHtml && frameBody) {
        frameBody.style.display = "none";
        const rootHTMLEl = this.deser(this.props.screenData.docTree, doc) as HTMLElement;

        const childNodes = doc.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
          if (((childNodes[i] as any).tagName || "").toLowerCase() === "html") {
            doc.replaceChild(rootHTMLEl, childNodes[i]);
            break;
          }
        }

        // Make the iframe visible after all the assets are loaded
        Promise.all(this.assetLoadingPromises).then(() => {
          frameBody.style.display = "";
        });
      } else {
        console.error("Can't find body of embed iframe");
      }
    } else {
      console.error("Can't find document of embed iframe");
    }
  };

  componentDidMount() {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      console.warn("Can't find embed iframe");
      return;
    }

    frame.onload = () => {
      this.deserDomIntoFrame(frame);
      requestAnimationFrame(() => {
        const el = this.embedFrameRef?.current;
        let doc;
        if ((doc = el?.contentDocument)) {
          this.domElPicker = new DomElPicker(doc);
          this.domElPicker.setupHighlighting();

          el.addEventListener("mouseout", this.onMouseOutOfIframe);
          el.addEventListener("mouseenter", this.onMouseEnterOnIframe);
        } else {
          console.error("Iframe doc not found");
        }
      });
    };
  }

  onMouseOutOfIframe = (e: MouseEvent) => {
    if (this.domElPicker && this.domElPicker.isEnabled()) {
      this.domElPicker.disable();
    }
  };

  onMouseEnterOnIframe = (e: MouseEvent) => {
    if (this.domElPicker && !this.domElPicker.isEnabled()) {
      this.domElPicker.enable();
    }
  };

  componentWillUnmount(): void {
    this.embedFrameRef?.current!.removeEventListener("mouseout", this.onMouseOutOfIframe);
    this.embedFrameRef?.current!.removeEventListener("mouseenter", this.onMouseEnterOnIframe);
    if (this.domElPicker) {
      this.domElPicker.dispose();
    }
  }

  render(): React.ReactNode {
    return (
      <Tags.Con>
        <Tags.EmbedCon style={{ overflow: "hidden" }} id="haha">
          <Tags.EmbedFrame
            src="about:blank"
            title={this.props.screen.displayName}
            ref={this.embedFrameRef}
            srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
          ></Tags.EmbedFrame>
        </Tags.EmbedCon>
        <Tags.EditPanelCon>
          {this.props.screen.parentScreenId === 0 ? "Click to start editing" : "Fetch edit data"}
        </Tags.EditPanelCon>
      </Tags.Con>
    );
  }
}
