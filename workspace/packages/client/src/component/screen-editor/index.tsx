import { ApiResp, ResponseStatus, RespScreen, RespUploadUrl } from '@fable/common/dist/api-contract';
import { ScreenData, SerNode } from '@fable/common/dist/types';
import api from '@fable/common/dist/api';
import { getCurrentUtcUnixTime, trimSpaceAndNewLine } from '@fable/common/dist/utils';
import React from 'react';
import { detect } from '@fable/common/dist/detect-browser';
import Switch from 'antd/lib/switch';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  FontSizeOutlined,
  PictureOutlined,
  LoadingOutlined,
  EditOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import Btn from '../btn';
import {
  AllEdits,
  EditItem,
  EditValueEncoding,
  ElEditType,
  EncodingTypeBlur,
  EncodingTypeDisplay,
  EncodingTypeImage,
  EncodingTypeText,
  IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeText,
} from '../../types';

const browser = detect();

const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Mixed = 'm',
  None = 'n',
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

interface IOwnProps {
  screen: RespScreen;
  screenData: ScreenData;
  allEdits: EditItem[];
  onScreenEditStart: () => void;
  onScreenEditFinish: () => void;
  onScreenEditChange: (editChunks: AllEdits<ElEditType>) => void;
}
interface IOwnStateProps {
  isInEditMode: boolean;
  selectedEl: HTMLElement | null;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
  editItemSelected: string;
}

interface DeSerProps {
  partOfSvgEl: number;
}

/*
 * This component should only be loaded once all the screen data is available.
 */
export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement>;

  private assetLoadingPromises: Promise<unknown>[] = [];

  private domElPicker: DomElPicker | null = null;

  private microEdits: AllEdits<ElEditType>;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.microEdits = {};
    this.state = {
      isInEditMode: false,
      selectedEl: null,
      targetEl: null,
      editTargetType: EditTargetType.None,
      editItemSelected: '',
    };
  }

  static getImageUploadUrl = async (type: string): Promise<string> => {
    const res = await api<null, ApiResp<RespUploadUrl>>(`/getuploadlink?te=${btoa(type)}`, {
      auth: true,
    });
    return res.status === ResponseStatus.Failure ? '' : res.data.url;
  };

  static setDimensionAttributes = (selectedImageEl: HTMLElement): [dimH: string, dimW: string] => {
    const styles = getComputedStyle(selectedImageEl);
    const originalHeight = styles.height;
    const originalWidth = styles.width;

    const originalStyleAttrs = selectedImageEl.getAttribute('style');
    selectedImageEl.setAttribute(
      'style',
      `${originalStyleAttrs || ''}; 
        height: ${originalHeight} !important; 
        width: ${originalWidth} !important; 
        object-fit: cover !important;`
    );
    return [originalHeight, originalWidth];
  };

  static changeSelectedImage = (selectedImageEl: HTMLElement, uploadedImageSrc: string): [string, string] => {
    if (selectedImageEl.nodeName.toUpperCase() === 'SVG') {
      const newImgEl = document.createElement('img');
      newImgEl.src = uploadedImageSrc;
      newImgEl.srcset = uploadedImageSrc;
      const dimensions = ScreenEditor.setDimensionAttributes(selectedImageEl);
      selectedImageEl.replaceWith(newImgEl);
      return dimensions;
    }
    if (selectedImageEl.nodeName.toUpperCase() === 'IMG') {
      const el = selectedImageEl as HTMLImageElement;
      el.src = uploadedImageSrc;
      el.srcset = uploadedImageSrc;
      return ScreenEditor.setDimensionAttributes(selectedImageEl);
    }
    return ['', ''];
    // TODO https://github.com/sharefable/app/issues/48 #2
  };

  static uploadImageAsBinary = async (selectedImage: any, awsSignedUrl: string): Promise<string> => {
    const uploadedImageSrc = awsSignedUrl.split('?')[0];

    const reader = new FileReader();
    reader.readAsArrayBuffer(selectedImage);
    return new Promise((resolve) => {
      reader.addEventListener('load', async () => {
        const binaryData = reader.result;
        // TODO our api utility is should ideally be able to address this. Fix later.
        const res = await fetch(awsSignedUrl, {
          method: 'PUT',
          body: binaryData,
          headers: { 'Content-Type': selectedImage.type },
        });

        if (res.status === 200) {
          // this.changeSelectedImage(uploadedImageSrc);
          resolve(uploadedImageSrc);
        }
      });
    });
  };

  // TODO Use this utility to extract imgSrc from different kinds of
  // elements such as div (where imgSrc is assigned to background-image prop
  // of css) or img (where imgSrc is found in src attr of the tag)
  static getOriginalImgSrc = (imgEl: HTMLElement): string => {
    if (imgEl.nodeName.toUpperCase() === 'IMG') {
      const el = imgEl as HTMLImageElement;
      return el.src;
    }
    return '';
  };

  handleSelectedImageChange = (imgEl: HTMLElement) => async (e: any): Promise<void> => {
    const originalImgSrc = ScreenEditor.getOriginalImgSrc(imgEl);
    const selectedImage = e.target.files[0];
    if (!selectedImage) {
      return;
    }
    const awsSignedUrl = await ScreenEditor.getImageUploadUrl(selectedImage.type);
    if (!awsSignedUrl) {
      //  TODO[error-handling] show error to user that something has gone wrong, try again later
      return;
    }
    const newImageUrl = await ScreenEditor.uploadImageAsBinary(selectedImage, awsSignedUrl);
    const [dimH, dimW] = ScreenEditor.changeSelectedImage(imgEl, newImageUrl);

    const path = ScreenEditor.elPath(imgEl, this.embedFrameRef?.current?.contentDocument!);
    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    let origVal = imgEl.getAttribute(attrName);
    if (origVal === null) {
      origVal = originalImgSrc || '';
      imgEl.setAttribute(attrName, origVal);
    }
    this.addToMicroEdit(path, ElEditType.Image, [getCurrentUtcUnixTime(), origVal, newImageUrl, dimH, dimW]);
  };

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
    } else if (filterStr === 'none') {
      newFilter = `blur(${value}px)`;
    } else {
      newFilter = filterStr ? `${filterStr} blur(${value}px)` : `blur(${value}px)`;
    }
    return newFilter;
  }

  static getEditTypeComponent(edit: EditItem, shouldShowLoading = false) {
    const encoding = edit[IdxEditItem.ENCODING];
    switch (edit[IdxEditItem.TYPE]) {
      case ElEditType.Text:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <FontSizeOutlined />
              <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Edited to</div>
              <GTags.Txt className="oneline subsubhead" style={{ flexShrink: 2, margin: '0 4px' }}>
                {encoding[IdxEditEncodingText.NEW_VALUE]}
              </GTags.Txt>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );
      case ElEditType.Blur:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FilterOutlined />
                <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Blured text</div>
              </div>
              {shouldShowLoading && <LoadingOutlined title="Saving..." />}
            </div>
          </Tags.EditLICon>
        );
      case ElEditType.Display:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <EyeOutlined />
                <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Hide element</div>
              </div>
              {shouldShowLoading && <LoadingOutlined title="Saving..." />}
            </div>
          </Tags.EditLICon>
        );

      case ElEditType.Image:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <PictureOutlined />
              <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Image edited</div>
            </div>
            {shouldShowLoading && <LoadingOutlined title="Saving..." />}
          </Tags.EditLICon>
        );

      default:
        return <></>;
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
        if (el2.nodeName.toLowerCase() === 'img' || el2.nodeName.toLowerCase() === 'svg') {
          return { [EditTargetType.Text]: [], [EditTargetType.Img]: [el2] };
        }
        if (el2.nodeName.toLowerCase() === 'div' || el2.nodeName.toLowerCase() === 'span') {
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
    }(el));

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

  static elFromPath(path: string, doc: Document) {
    const elIdxs = path.split('.').map((id) => +id);
    let node = doc as Node;
    for (const id of elIdxs) {
      node = node.childNodes[id];
    }
    return node;
  }

  static elPath(el: HTMLElement, doc: Document) {
    let elPath = el.getAttribute('fab-el-path');
    if (elPath === null) {
      const path = ScreenEditor.calculatePathFromEl(el, doc, []);
      elPath = path.join('.');
      el.setAttribute('fab-el-path', elPath);
    }
    return elPath;
  }

  private static calculatePathFromEl(el: Node, doc: Document, loc: number[]): number[] {
    if (!el.parentNode) {
      return loc.reverse();
    }
    const siblings = el.parentNode.childNodes;
    for (let i = 0, l = siblings.length; i < l; i++) {
      if (el === siblings[i]) {
        loc.push(i);
        return this.calculatePathFromEl(el.parentNode, doc, loc);
      }
    }
    return loc;
  }

  private static applyEdits(allEdits: EditItem[], doc: Document) {
    const mem: Record<string, Node> = {};
    const txtOrigValAttr = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Text}`;
    const imgOrigValAttr = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    const dispOrigValAttr = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Display}`;
    const blurOrigValAttr = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Blur}`;
    for (const edit of allEdits) {
      const path = edit[IdxEditItem.PATH];
      let el: Node;
      if (path in mem) el = mem[path];
      else {
        el = ScreenEditor.elFromPath(path, doc);
        mem[path] = el;
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Text) {
        const txtEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeText;
        const tEl = el as HTMLElement;
        el.textContent = txtEncodingVal[IdxEncodingTypeText.NEW_VALUE];
        tEl.setAttribute(txtOrigValAttr, txtEncodingVal[IdxEncodingTypeText.OLD_VALUE]);
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Image) {
        const imgEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeImage;
        const tEl = el as HTMLImageElement;
        tEl.src = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE];
        tEl.srcset = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE];
        tEl.setAttribute(imgOrigValAttr, imgEncodingVal[IdxEncodingTypeImage.OLD_VALUE]);
        tEl.setAttribute('height', imgEncodingVal[IdxEncodingTypeImage.HEIGHT]);
        tEl.setAttribute('width', imgEncodingVal[IdxEncodingTypeImage.WIDTH]);
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Blur) {
        const blurEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeBlur;
        const tEl = el as HTMLElement;
        tEl.setAttribute(blurOrigValAttr, blurEncodingVal[IdxEncodingTypeBlur.OLD_FILTER_VALUE]);
        tEl.style.filter = blurEncodingVal[IdxEncodingTypeBlur.NEW_FILTER_VALUE];
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Display) {
        const dispEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeDisplay;
        const tEl = el as HTMLElement;
        tEl.setAttribute(dispOrigValAttr, dispEncodingVal[IdxEncodingTypeDisplay.OLD_VALUE]);
        tEl.style.display = dispEncodingVal[IdxEncodingTypeDisplay.NEW_VALUE];
      }
    }
  }

  createHtmlElement = (node: SerNode, doc: Document, props: DeSerProps) => {
    const el = props.partOfSvgEl
      ? doc.createElementNS('http://www.w3.org/2000/svg', node.name)
      : doc.createElement(node.name);

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
      partOfSvgEl: props.partOfSvgEl | (serNode.name === 'svg' ? 1 : 0),
    };

    let node;
    switch (serNode.type) {
      case Node.TEXT_NODE:
        node = doc.createTextNode(trimSpaceAndNewLine(serNode.props.textContent!));
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
      if (child.name === 'meta') {
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
    const divPadding = 18;
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
        const rootHTMLEl = this.deser(this.props.screenData.docTree, doc) as HTMLElement;
        const childNodes = doc.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
          if (((childNodes[i] as any).tagName || '').toLowerCase() === 'html') {
            doc.replaceChild(rootHTMLEl, childNodes[i]);
            break;
          }
        }

        ScreenEditor.applyEdits(this.props.allEdits, doc);
        // Make the iframe visible after all the assets are loaded
        Promise.all(this.assetLoadingPromises).then(() => {
          frameBody.style.display = '';
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
      this.initDomPicker();
    };

    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>) {
    if (prevState.isInEditMode !== this.state.isInEditMode) {
      if (this.state.isInEditMode) {
        this.props.onScreenEditStart();
        this.domElPicker?.enable();
      } else {
        console.log('will stop editing');
        this.domElPicker?.disable();
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
        this.setState(() => ({
          editTargetType: EditTargetType.None,
          targetEl: null,
        }));
      }
    } else {
      console.log('same el is set twice???');
    }
  }

  getEditingCtrlForElType(type: EditTargetType) {
    const CommonOptions = (
      <>
        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel>Show Element</Tags.EditCtrlLabel>
          <Switch
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            defaultChecked={!!this.state.selectedEl && getComputedStyle(this.state.selectedEl).display !== 'none'}
            size="small"
            onChange={((t) => (checked) => {
              const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
              const path = ScreenEditor.elPath(refEl, this.embedFrameRef?.current?.contentDocument!);
              const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Display}`;

              const savedOrigVal = t.getAttribute(attrName);
              let newVal: string;
              let origVal = savedOrigVal;
              if (origVal === null) {
                origVal = getComputedStyle(t).display;
                t.setAttribute(attrName, origVal);
              }

              if (checked) newVal = t.style.display = origVal;
              else newVal = t.style.display = 'none';

              this.addToMicroEdit(path, ElEditType.Display, [getCurrentUtcUnixTime(), origVal, newVal]);
              this.flushMicroEdits();
            })(this.state.selectedEl!)}
          />
        </Tags.EditCtrlLI>
        <Tags.EditCtrlLI>
          <Tags.EditCtrlLabel>Blur Element</Tags.EditCtrlLabel>
          <Switch
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
            defaultChecked={
              !!this.state.selectedEl
              && ScreenEditor.getBlurValueFromFilter(getComputedStyle(this.state.selectedEl).filter) === 3
            }
            onChange={((t) => (checked) => {
              const filterStyle = getComputedStyle(t).filter;
              const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
              const path = ScreenEditor.elPath(refEl, this.embedFrameRef?.current?.contentDocument!);
              const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Blur}`;
              const origStrVal = refEl.getAttribute(attrName);

              let oldFilterStr: string;
              let newFilterStr: string;
              let oldBlurValue: number;
              let newBlurValue: number;

              if (origStrVal === null) {
                refEl.setAttribute(attrName, filterStyle);
                oldBlurValue = ScreenEditor.getBlurValueFromFilter(filterStyle);
                oldFilterStr = filterStyle;
              } else {
                oldBlurValue = ScreenEditor.getBlurValueFromFilter(origStrVal);
                oldFilterStr = origStrVal;
              }

              if (checked) {
                newBlurValue = 3;
                newFilterStr = ScreenEditor.updateBlurValueToFilter(oldFilterStr, newBlurValue);
                t.style.filter = newFilterStr;
              } else {
                newBlurValue = oldBlurValue;
                newFilterStr = oldFilterStr;
                t.style.filter = oldFilterStr;
              }
              this.addToMicroEdit(path, ElEditType.Blur, [
                getCurrentUtcUnixTime(),
                oldBlurValue,
                newBlurValue,
                oldFilterStr,
                newFilterStr,
              ]);
              this.flushMicroEdits();
            })(this.state.selectedEl!)}
            size="small"
          />
        </Tags.EditCtrlLI>
      </>
    );
    switch (type) {
      case EditTargetType.Img:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: 'column', alignItems: 'start' }}>
              <Tags.EditCtrlLabel>Replace selected image</Tags.EditCtrlLabel>
              <Tags.ImgUploadLabel>
                Click to upload
                <input
                  style={{ display: 'none' }}
                  onChange={this.handleSelectedImageChange(this.state.selectedEl!)}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/svg+xml"
                />
              </Tags.ImgUploadLabel>
            </Tags.EditCtrlLI>
            {CommonOptions}
          </Tags.EditCtrlCon>
        );

      case EditTargetType.Text:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI style={{ flexDirection: 'column', alignItems: 'start' }}>
              <Tags.EditCtrlLabel>Update Text</Tags.EditCtrlLabel>
              <Tags.CtrlTxtEditBox
                defaultValue={this.state.targetEl?.textContent!}
                autoFocus
                onBlur={() => this.flushMicroEdits()}
                onChange={((t) => (e) => {
                  const refEl = (t.nodeType === Node.TEXT_NODE ? t.parentNode : t) as HTMLElement;
                  const path = ScreenEditor.elPath(refEl, this.embedFrameRef?.current?.contentDocument!);
                  const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Text}`;
                  let origVal = refEl.getAttribute(attrName);
                  if (origVal === null) {
                    origVal = t.textContent || '';
                    refEl.setAttribute(attrName, origVal);
                  }
                  this.addToMicroEdit(path, ElEditType.Text, [getCurrentUtcUnixTime(), origVal, e.target.value]);

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

  flushMicroEdits() {
    const hasEdits = Object.keys(this.microEdits).length !== 0;
    if (hasEdits) {
      this.props.onScreenEditChange(this.microEdits);
      this.microEdits = {};
    }
  }

  render(): React.ReactNode {
    return (
      <Tags.Con>
        <Tags.EmbedCon style={{ overflow: 'hidden', position: 'relative' }}>
          <Tags.EmbedFrame
            src="about:blank"
            title={this.props.screen.displayName}
            ref={this.embedFrameRef}
            srcDoc="<!DOCTYPE html><html><head></head><body></body></html>"
          />
        </Tags.EmbedCon>
        <Tags.EditPanelCon>
          <Tags.EditPanelSec>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '1.25rem',
              }}
            >
              <GTags.Txt className="title">Edit Screen</GTags.Txt>
            </div>
            <div
              style={{
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '1.75rem',
              }}
            >
              <GTags.Txt className="subhead" style={{ marginBottom: '1rem' }}>
                {!this.state.isInEditMode ? (
                  'You can edit the screen by changing text, uploading new images, hiding or blurring elements etc.'
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
            {this.props.screen.parentScreenId !== 0
              && this.props.allEdits
                .sort((m, n) => n[IdxEditItem.TIMESTAMP] - m[IdxEditItem.TIMESTAMP])
                .map((e) => (
                  <Tags.EditLIPCon
                    key={e[IdxEditItem.KEY]}
                    onClick={((edit) => (evt) => {
                      this.setState({
                        editItemSelected: e[IdxEditItem.KEY],
                        isInEditMode: true,
                      });
                      this.highlightElementForPath(edit[IdxEditItem.PATH]);
                    })(e)}
                  >
                    {ScreenEditor.getEditTypeComponent(e, e[IdxEditItem.EDIT_TYPE_LOCAL])}
                    {e[IdxEditItem.KEY] === this.state.editItemSelected && (
                      <div style={{ display: 'flex' }}>
                        <Tags.ListActionBtn>Revert</Tags.ListActionBtn>
                        &nbsp;&nbsp;|&nbsp;&nbsp;
                        <Tags.ListActionBtn>Delete</Tags.ListActionBtn>
                      </div>
                    )}
                  </Tags.EditLIPCon>
                ))}
          </Tags.EditPanelSec>
        </Tags.EditPanelCon>
      </Tags.Con>
    );
  }

  highlightElementForPath(path: string) {
    const doc = this.embedFrameRef.current?.contentDocument;
    if (!doc) {
      throw new Error('Iframe doc is not found while resolving element from path');
    }
    const el = ScreenEditor.elFromPath(path, doc) as HTMLElement;
    if (!el) {
      throw new Error(`Could not resolve element from path ${path}`);
    }

    // This is kind of a hack that moves the element in the view instantly and then after
    // 3 frame shows the selector.
    // Caveat: if the scroll is taking time to finish then this would not work
    // TODO fix this
    // INFO Changing value of block and inline would shift the parent element to make the el in the center of the screen
    // that we don't want. So be careful with this values.
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    setTimeout(() => {
      this.domElPicker?.selectElement(el, HighlightMode.Pinned);
    }, 3 * 16);
  }

  private onMouseOutOfIframe = (e: MouseEvent) => {
    this.domElPicker?.disable();
  };

  private onMouseEnterOnIframe = (e: MouseEvent) => {
    this.state.isInEditMode && this.domElPicker?.enable();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (this.domElPicker && this.domElPicker.getMode() === HighlightMode.Pinned) {
        this.domElPicker.getOutOfPinMode();
      } else {
        this.setState({ isInEditMode: false });
      }

      if (this.state.editItemSelected !== '') {
        this.setState({ editItemSelected: '' });
      }
    }
  };

  private addToMicroEdit<K extends keyof EditValueEncoding>(path: string, editType: K, edit: EditValueEncoding[K]) {
    if (!(path in this.microEdits)) {
      this.microEdits[path] = {};
    }
    const edits = this.microEdits[path];
    edits[editType] = edit;
  }

  private disposeDomPicker() {
    this.embedFrameRef?.current!.removeEventListener('mouseout', this.onMouseOutOfIframe);
    this.embedFrameRef?.current!.removeEventListener('mouseenter', this.onMouseEnterOnIframe);
    if (this.domElPicker) {
      this.domElPicker.dispose();
      this.domElPicker = null;
    }
  }

  private onElSelect = (el: HTMLElement, doc: Document) => {
    ScreenEditor.elPath(el, doc);
    this.setState({ selectedEl: el });
  };

  private onElDeSelect = (el: HTMLElement) => {
    this.flushMicroEdits();
    this.setState({ selectedEl: null });
  };

  private initDomPicker() {
    requestAnimationFrame(() => {
      const el = this.embedFrameRef?.current;
      let doc;
      if ((doc = el?.contentDocument) && !this.domElPicker) {
        this.domElPicker = new DomElPicker(doc, {
          onElSelect: this.onElSelect,
          onElDeSelect: this.onElDeSelect,
        });
        this.domElPicker.addEventListener('keydown', this.onKeyDown);
        this.domElPicker.setupHighlighting();

        el.addEventListener('mouseout', this.onMouseOutOfIframe);
        el.addEventListener('mouseenter', this.onMouseEnterOnIframe);
      } else {
        console.error('Iframe doc not found');
      }
    });
  }
}
