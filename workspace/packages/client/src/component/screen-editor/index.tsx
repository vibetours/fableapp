import { RespScreen } from "@fable/common/dist/api-contract";
import { ScreenData, ScreenEdits, SerNode } from "@fable/common/dist/types";
import React from "react";
import { detect } from "@fable/common/dist/detect-browser";
import Switch from "antd/lib/switch";
import { EyeInvisibleOutlined, EyeOutlined } from "@ant-design/icons";
import Slider from "antd/lib/slider";
import InputNumber from "antd/lib/input-number";
import * as Tags from "./styled";
import * as GTags from "../../common-styled";
import DomElPicker, { HighlightMode } from "./dom-element-picker";
import Btn from "../btn";

const browser = detect();

const enum EditTargetType {
  Text = "t",
  Img = "i",
  Mixed = "m",
  None = "n",
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

interface IOwnProps {
  screen: RespScreen;
  screenData: ScreenData;
  screenEdits: ScreenEdits | null;
  onScreenEditStart: () => void;
  onScreenEditFinish: () => void;
}
interface IOwnStateProps {
  isInEditMode: boolean;
  selectedEl: HTMLElement | null;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
}

interface DeSerProps {
  partOfSvgEl: number;
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
    this.state = {
      isInEditMode: false,
      selectedEl: null,
      targetEl: null,
      editTargetType: EditTargetType.None,
    };
  }

  createHtmlElement = (node: SerNode, doc: Document, props: DeSerProps) => {
    const el = props.partOfSvgEl
      ? doc.createElementNS("http://www.w3.org/2000/svg", node.name)
      : doc.createElement(node.name);

    for (const [attrKey, attrValue] of Object.entries(node.attrs)) {
      try {
        if (props.partOfSvgEl) {
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

  deser = (serNode: SerNode, doc: Document, props: DeSerProps = { partOfSvgEl: 0 }) => {
    const newProps: DeSerProps = {
      // For svg and all the child nodes of svg set a flag
      partOfSvgEl: props.partOfSvgEl | (serNode.name === "svg" ? 1 : 0),
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
    };

    frame.onfocus = () => {
      console.log("focused");
      frame.blur();
    };

    document.addEventListener("keydown", this.onKeyDown);
  }

  private onMouseOutOfIframe = (e: MouseEvent) => {
    if (this.domElPicker && this.domElPicker.getMode() !== HighlightMode.Pinned) {
      this.domElPicker.disable();
    }
  };

  private onMouseEnterOnIframe = (e: MouseEvent) => {
    if (this.domElPicker && this.domElPicker.getMode() !== HighlightMode.Pinned) {
      this.domElPicker.enable();
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (this.domElPicker && this.domElPicker.getMode() === HighlightMode.Pinned) {
        this.domElPicker.getOutOfPinMode();
      } else {
        this.setState({ isInEditMode: false });
      }
    }
  };

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener("keydown", this.onKeyDown);
  }

  componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>) {
    if (prevState.isInEditMode !== this.state.isInEditMode) {
      if (this.state.isInEditMode) {
        this.props.onScreenEditStart();
        this.initDomPicker();
      } else {
        this.disposeDomPicker();
        this.props.onScreenEditFinish();
      }
    }

    if (prevState.selectedEl !== this.state.selectedEl) {
      if (this.state.selectedEl) {
        const editTargetType = ScreenEditor.getEditTargetType(this.state.selectedEl);
        this.setState((state) => ({
          editTargetType: editTargetType.targetType,
          targetEl: editTargetType.target || state.selectedEl,
        }));
      } else {
        this.setState(() => ({ editTargetType: EditTargetType.None, targetEl: null }));
      }
    }
  }

  static getBlurValueFromFilter(filterStr: string): number {
    const match = filterStr.match(/(^|\s+)blur\((\d+)(px|rem)\)(\s+|$)/);
    if (!match) {
      return 0;
    }
    return +match[2];
  }

  static updateBlurValueToFilter(filterStr: string, value: number) {
    const match = filterStr.match(/(^|\s+)blur\((\d+)(px|rem)\)(\s+|$)/);
    let newFilter;
    if (match) {
      newFilter = `${filterStr.substring(0, match.index)} blur(${value}px) ${filterStr.substring(
        match.index! + match[0].length
      )}`;
    } else if (filterStr === "none") {
      newFilter = `blur(${value}px)`;
    } else {
      newFilter = filterStr ? `${filterStr} blur(${value}px)` : `blur(${value}px)`;
    }
    return newFilter;
  }

  getEditingCtrlForElType(type: EditTargetType) {
    const CommonOptions = (
      <>
        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel>Show Element</Tags.EditCtrlLabel>
          <Switch
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            defaultChecked={!!this.state.selectedEl && getComputedStyle(this.state.selectedEl).display !== "none"}
            size="small"
            onChange={((t) => (checked) => {
              const savedOrigVal = t.getAttribute("fab-o-display");
              let origVal = savedOrigVal;
              if (origVal === null) {
                origVal = getComputedStyle(t).display;
              }

              if (checked) {
                t.style.display = origVal;
              } else {
                t.style.display = "none";
              }
            })(this.state.selectedEl!)}
          />
        </Tags.EditCtrlLI>
        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel>Blur Element</Tags.EditCtrlLabel>
          <InputNumber
            defaultValue={
              this.state.selectedEl
                ? ScreenEditor.getBlurValueFromFilter(getComputedStyle(this.state.selectedEl).filter)
                : 0
            }
            addonAfter="px"
            min={0}
            size="small"
            style={{ maxWidth: "120px" }}
            onChange={((t) => (newVal) => {
              const filterStr = ScreenEditor.updateBlurValueToFilter(
                getComputedStyle(t).filter,
                +(newVal === undefined || newVal === null ? 0 : +newVal)
              );
              t.style.filter = filterStr;
            })(this.state.selectedEl!)}
          />
        </Tags.EditCtrlLI>
      </>
    );
    switch (type) {
      case EditTargetType.Img:
        return <>image editing option</>;

      case EditTargetType.Text:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: "column", alignItems: "start" }}>
              <Tags.EditCtrlLabel>Update Text</Tags.EditCtrlLabel>
              <Tags.CtrlTxtEditBox
                defaultValue={this.state.targetEl?.textContent!}
                autoFocus
                onChange={((t) => (e) => {
                  t.textContent = e.target.value;
                })(this.state.targetEl!)}
              />
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );

      case EditTargetType.Mixed:
        return <Tags.EditCtrlCon>{CommonOptions}</Tags.EditCtrlCon>;

      default:
        return <></>;
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
          />
        </Tags.EmbedCon>
        <Tags.EditPanelCon>
          <Tags.EditPanelSec>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: "1.25rem" }}>
              <GTags.Txt className="title">Edit Screen</GTags.Txt>
            </div>
            <div
              style={{ justifyContent: "center", display: "flex", flexDirection: "column", marginBottom: "1.75rem" }}
            >
              <GTags.Txt className="subhead" style={{ marginBottom: "1rem" }}>
                {!this.state.isInEditMode ? (
                  "You can edit the screen by changing text, uploading new images, hiding or blurring elements etc."
                ) : this.state.selectedEl === null ? (
                  <>
                    Click an element in the screen to see the edit options. Press <span className="kb-key">Esc</span> to
                    exit from edit mode.
                  </>
                ) : (
                  <>
                    You are now editing the selected element. Press <span className="kb-key">Esc</span> to complete
                    editing.
                  </>
                )}
              </GTags.Txt>
              {!this.state.isInEditMode && (
                <Btn icon="plus" onClick={() => this.setState({ isInEditMode: true })}>
                  Click here to start editing
                </Btn>
              )}
              {this.getEditingCtrlForElType(this.state.editTargetType)}
            </div>
            {this.props.screen.parentScreenId !== 0 &&
              this.props.screenEdits &&
              this.props.screenEdits.edits.map((edit) => {
                console.log(edit);
                return <></>;
              })}
          </Tags.EditPanelSec>
        </Tags.EditPanelCon>
      </Tags.Con>
    );
  }

  private disposeDomPicker() {
    this.embedFrameRef?.current!.removeEventListener("mouseout", this.onMouseOutOfIframe);
    this.embedFrameRef?.current!.removeEventListener("mouseenter", this.onMouseEnterOnIframe);
    if (this.domElPicker) {
      this.domElPicker.dispose();
      this.domElPicker = null;
    }
  }

  static getEditTargetType(el: HTMLElement): {
    targetType: EditTargetType;
    target?: HTMLElement;
  } {
    const nestedEditTargetTypes = (function rec(el2: HTMLElement): EditTargets {
      if (el2.nodeType === Node.TEXT_NODE) {
        return { [EditTargetType.Text]: [el2], [EditTargetType.Img]: [] };
      }

      if (el2.nodeName) {
        if (el2.nodeName.toLowerCase() === "img" || el2.nodeName.toLowerCase() === "svg") {
          return { [EditTargetType.Text]: [], [EditTargetType.Img]: [el2] };
        }
        if (el2.nodeName.toLowerCase() === "div" || el2.nodeName.toLowerCase() === "span") {
          const bgImage = getComputedStyle(el2).backgroundImage;
          if (bgImage.search(/^url\(/) !== -1) {
            return { [EditTargetType.Text]: [], [EditTargetType.Img]: [el2] };
          }
        }
      }

      const children = Array.from(el2.childNodes);
      const targetByTypes: EditTargets = {
        [EditTargetType.Text]: [],
        [EditTargetType.Img]: [],
      };
      for (const child of children) {
        const targetType = rec(child as HTMLElement);
        for (const [tType, tTargets] of Object.entries(targetType)) {
          targetByTypes[tType].push(...tTargets);
        }
      }
      return targetByTypes;
    })(el);

    const noOfTexts = nestedEditTargetTypes[EditTargetType.Text].length;
    const noOfImgs = nestedEditTargetTypes[EditTargetType.Img].length;

    if (noOfImgs === 1 && noOfTexts === 0) {
      return {
        targetType: EditTargetType.Img,
        target: nestedEditTargetTypes[EditTargetType.Img][0] as HTMLElement,
      };
    }

    if (noOfTexts === 1 && noOfImgs === 0) {
      return {
        targetType: EditTargetType.Text,
        target: nestedEditTargetTypes[EditTargetType.Text][0] as HTMLElement,
      };
    }
    return {
      targetType: EditTargetType.Mixed,
    };
  }

  private onElSelect = (el: HTMLElement) => {
    this.setState({ selectedEl: el });
  };

  private onElDeSelect = (el: HTMLElement) => {
    this.setState({ selectedEl: null });
  };

  private initDomPicker() {
    requestAnimationFrame(() => {
      const el = this.embedFrameRef?.current;
      let doc;
      if ((doc = el?.contentDocument)) {
        this.domElPicker = new DomElPicker(doc, { onElSelect: this.onElSelect, onElDeSelect: this.onElDeSelect });
        this.domElPicker.addEventListener("keydown", this.onKeyDown);
        this.domElPicker.setupHighlighting();

        el.addEventListener("mouseout", this.onMouseOutOfIframe);
        el.addEventListener("mouseenter", this.onMouseEnterOnIframe);
      } else {
        console.error("Iframe doc not found");
      }
    });
  }
}
