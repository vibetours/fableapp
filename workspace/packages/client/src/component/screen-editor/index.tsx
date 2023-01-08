import { RespScreen } from "@fable/common/dist/api-contract";
import { ScreenData, SerNode } from "@fable/common/dist/types";
import React from "react";
import * as Tags from "./styled";
import { detect } from "@fable/common/dist/detect-browser";

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
  private embedFrameRef: React.RefObject<HTMLIFrameElement>;
  private assetLoadingPromises: Promise<unknown>[] = [];

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

  deser = (parent: Element, serNode: SerNode, doc: Document, props: DeSerProps = { partofSvgEl: 0 }) => {
    const newProps: DeSerProps = {
      // For svg and all the child nodes of svg set a flag
      partofSvgEl: props.partofSvgEl | (serNode.name === "svg" ? 1 : 0),
    };

    const el = this.createHtmlElement(serNode, doc, newProps);
    for (const child of serNode.chldrn) {
      switch (child.type) {
        case Node.TEXT_NODE:
          if (child.props.textContent) {
            el.appendChild(doc.createTextNode(child.props.textContent));
          }
          break;

        case Node.ELEMENT_NODE:
          this.deser(el, child, doc, newProps);
          break;

        default:
          break;
      }
    }

    parent.appendChild(el);
  };

  deserDomIntoFrame = (frame: HTMLIFrameElement) => {
    // This calculation is to make transform: scale work like zoom property.
    // We can't use zoom property as it's only supported by chrome and some version of ie.
    //
    // There might be pages (google analytics) that are not responsive and while capturing from extension it was
    // captured from a differnet dimension than a screen that is used to preview the screen.
    //
    // To support screen dimension interchangeably, we have to zoom in / zoom out the screen keeping the aspect ration
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
    if (doc) {
      if (frameBody) {
        frameBody.style.display = "none";
        // Add <!DOCTYPE html> for iframe
        const docTypeHtml5 = doc.implementation.createDocumentType("html", "", "");
        if (doc.doctype) {
          doc.replaceChild(docTypeHtml5, doc.doctype);
        } else {
          doc.insertBefore(docTypeHtml5, doc.childNodes[0]);
        }

        this.deser(frameBody, this.props.screenData.docTree, doc);

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

    // The behaviour of iframe loading in firefox and chrome is very different.
    // Firefox fires an onload event even when src="about:blank" and destroys any layout that was previously created.
    // That means in firefox if we run js to dynamically populate the iframe from parent frame, it gets cleared during
    // the onload call. I't obvious in profiling render in firefox, it says `Layout tree destruction about:blank` in
    // flame graph
    // On the other side in chrome / safari, the onload event never gets fired for about:blank iframe
    // The following check starts the dom deserialization based on browser
    if (browser?.name === "firefox") {
      frame.onload = () => {
        this.deserDomIntoFrame(frame);
      };
    } else {
      this.deserDomIntoFrame(frame);
    }
  }

  render(): React.ReactNode {
    return (
      <Tags.Con>
        <Tags.EmbedCon style={{ overflow: "hidden" }}>
          <Tags.EmbedFrame
            src="about:blank"
            title={this.props.screen.displayName}
            ref={this.embedFrameRef}
          ></Tags.EmbedFrame>
        </Tags.EmbedCon>
        <Tags.EditPanelCon></Tags.EditPanelCon>
      </Tags.Con>
    );
  }
}
