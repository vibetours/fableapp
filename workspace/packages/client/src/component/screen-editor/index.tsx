import {
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  LoadingOutlined,
  PictureOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SelectOutlined,
  CloudUploadOutlined
} from '@ant-design/icons';
import { IAnnotationConfig, ITourDataOpts, ScreenData, TourData, TourScreenEntity } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import Switch from 'antd/lib/switch';
import React from 'react';
import Modal from 'antd/lib/modal';
import Collapse from 'antd/lib/collapse';
import { ScreenType } from '@fable/common/dist/api-contract';
import MaskIcon from '../../assets/creator-panel/mask-icon.png';
import { advancedElPickerHelpText, annotationTabHelpText, editTabHelpText } from './helptexts';
import ExpandArrowFilled from '../../assets/creator-panel/expand-arrow-filled.svg';
import * as GTags from '../../common-styled';
import { P_RespScreen, P_RespTour, remoteToLocalAnnotationConfig } from '../../entity-processor';
import { uploadImgToAws } from './utils/upload-img-to-aws';
import ExpandIcon from '../../assets/creator-panel/expand-arrow.svg';
import {
  AllEdits,
  AnnotationPerScreen,
  EditItem,
  EditValueEncoding,
  ElEditType,
  FrameAssetLoadFn,
  IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeMask,
  NavFn
} from '../../types';
import ActionPanel from './action-panel';
import ListActionBtn from './list-action-btn';
import {
  cloneAnnotation,
  getDefaultTourOpts,
  getSampleConfig,
  replaceAnnotation
} from '../annotation/annotation-config-utils';
import AnnotationCreatorPanel from './annotation-creator-panel';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import PreviewWithEditsAndAnRO from './preview-with-edits-and-annotations-readonly';
import * as Tags from './styled';
import AdvanceElementPicker from './advance-element.picker';
import TabBar from './components/tab-bar';
import TabItem from './components/tab-bar/tab-item';
import TimelineScreen from './components/timeline/screen';
import { addImgMask, hideChildren, restrictCrtlType, unhideChildren } from './utils/creator-actions';
import UploadButton from './components/upload-button';
import ScreenImageBrusher from './screen-image-brushing';

const { confirm } = Modal;

const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Mixed = 'm',
  None = 'n',
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

export interface ITimelineConfig {
  currentScreenAnnotations: IAnnotationConfig[];
  nextScreen: P_RespScreen | undefined;
  prevScreen: P_RespScreen | undefined;
  nextAnnotation: string | null;
  prevAnnotation: string | null;
}

enum TabList {
  Annotations,
  Edits
}

interface IOwnProps {
  screen: P_RespScreen;
  navigate: NavFn;
  screenData: ScreenData;
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  tourDataOpts: ITourDataOpts;
  createDefaultAnnotation: (config: IAnnotationConfig, opts: ITourDataOpts) => void;
  timelineConfig: ITimelineConfig;
  onAnnotationCreateOrChange: (
    screenId: number | null,
    config: IAnnotationConfig,
    actionType: 'upsert' | 'delete',
    opts: ITourDataOpts | null
  ) => void;
  onScreenEditStart: () => void;
  toAnnotationId: string;
  onScreenEditFinish: () => void;
  onScreenEditChange: (editChunks: AllEdits<ElEditType>) => void;
  allAnnotationsForTour: AnnotationPerScreen[];
}

const enum ElSelReqType {
  NA = 0,
  EditEl,
  AnnotateEl,
}

interface IOwnStateProps {
  isInElSelectionMode: boolean;
  elSelRequestedBy: ElSelReqType;
  selectedEl: HTMLElement | null;
  selectedElAnnFwd: string;
  selectedElsParents: Node[];
  selectedAnnotationId: string;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
  editItemSelected: string;
  selectedHotspotEl: HTMLElement | null;
  selectionMode: 'hotspot' | 'annotation';
  activeTab: TabList;
}

export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private readonly frameConRef: React.MutableRefObject<HTMLDivElement | null>;

  private iframeElManager: DomElPicker | null = null;

  private microEdits: AllEdits<ElEditType>;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.frameConRef = React.createRef();
    this.microEdits = {};
    this.state = {
      isInElSelectionMode: true,
      elSelRequestedBy: ElSelReqType.AnnotateEl,
      selectedElAnnFwd: '',
      selectedEl: null,
      selectedElsParents: [],
      targetEl: null,
      editTargetType: EditTargetType.None,
      editItemSelected: '',
      selectedAnnotationId: '',
      selectedHotspotEl: null,
      selectionMode: 'annotation',
      activeTab: TabList.Annotations,
    };
  }

  showDeleteConfirm = (e: EditItem) => {
    const path = e[IdxEditItem.PATH];
    const elType = e[IdxEditItem.TYPE];
    const encoding = e[IdxEditItem.ENCODING];
    const el = this.state.selectedEl;

    if (el) {
      el.dataset.deleted = 'true';
    }

    confirm({
      title: 'Are you sure you want to delete this edit?',
      icon: <ExclamationCircleOutlined />,
      okText: 'Yes',
      okType: 'danger',
      onOk: () => {
        switch (elType) {
          case ElEditType.Text: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Text];
            this.addToMicroEdit(path, ElEditType.Text, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEditEncodingText.OLD_VALUE],
              null,
            ]);
            this.flushMicroEdits();
            el!.textContent = tEncoding[IdxEditEncodingText.OLD_VALUE];
            break;
          }
          case ElEditType.Image: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Image];
            this.addToMicroEdit(path, ElEditType.Image, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeImage.OLD_VALUE],
              null,
              encoding[IdxEncodingTypeImage.HEIGHT]!,
              encoding[IdxEncodingTypeImage.WIDTH]!,
            ]);
            this.flushMicroEdits();
            (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.OLD_VALUE];
            (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.OLD_VALUE];
            break;
          }

          case ElEditType.Blur: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Blur];
            this.addToMicroEdit(path, ElEditType.Blur, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeBlur.OLD_BLUR_VALUE],
              null,
              tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!,
              null
            ]);
            this.flushMicroEdits();
            el!.style.filter = tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!;
            break;
          }

          case ElEditType.Display: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Display];
            this.addToMicroEdit(path, ElEditType.Display, [
              getCurrentUtcUnixTime(),
              tEncoding[IdxEncodingTypeDisplay.OLD_VALUE],
              null
            ]);
            this.flushMicroEdits();
            el!.style.display = tEncoding[IdxEncodingTypeDisplay.OLD_VALUE]!;
            break;
          }

          case ElEditType.Mask: {
            const tEncoding = encoding as EditValueEncoding[ElEditType.Mask];
            this.addToMicroEdit(path, ElEditType.Mask, [
              getCurrentUtcUnixTime(),
              null,
              tEncoding[IdxEncodingTypeMask.OLD_STYLE]!
            ]);
            this.flushMicroEdits();

            el?.setAttribute('style', tEncoding[IdxEncodingTypeMask.OLD_STYLE]);
            unhideChildren(el!);
            break;
          }

          default:
            break;
        }
      },
    });
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

      case ElEditType.Mask:
        return (
          <Tags.EditLICon>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <img src={MaskIcon} alt="" width={16} />
              <div style={{ marginLeft: '0.5rem', flexShrink: 0 }}>Mask added</div>
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

  handleSelectedImageChange = (imgEl: HTMLElement) => async (e: any): Promise<void> => {
    const originalImgSrc = ScreenEditor.getOriginalImgSrc(imgEl);
    const selectedImage = e.target.files[0];
    if (!selectedImage) {
      return;
    }
    const newImageUrl = await uploadImgToAws(selectedImage);
    const [dimH, dimW] = ScreenEditor.changeSelectedImage(imgEl, newImageUrl);

    const path = this.iframeElManager!.elPath(imgEl);
    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    let origVal = imgEl.getAttribute(attrName);
    if (origVal === null) {
      origVal = originalImgSrc || '';
      imgEl.setAttribute(attrName, origVal);
    }
    this.addToMicroEdit(path, ElEditType.Image, [getCurrentUtcUnixTime(), origVal, newImageUrl, dimH, dimW]);
  };

  handleUploadMaskImgChange = (el: HTMLElement) => async (e: any): Promise<void> => {
    const selectedImage = e.target.files[0];
    if (!selectedImage) {
      return;
    }

    const newImageUrl = await uploadImgToAws(selectedImage);

    hideChildren(el);

    const oldElInlineStyles = el.getAttribute('style') || '';
    const newElInlineStyles = addImgMask(el, newImageUrl);

    const path = this.iframeElManager!.elPath(el);

    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Mask}`;
    let origVal = el.getAttribute(attrName);
    if (origVal === null) {
      origVal = oldElInlineStyles;
      el.setAttribute(attrName, origVal);
    }

    this.addToMicroEdit(path, ElEditType.Mask, [getCurrentUtcUnixTime(), newElInlineStyles, oldElInlineStyles]);
  };

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener('keydown', this.onKeyDownHandler);
    if (this.frameConRef.current) {
      this.frameConRef.current.removeEventListener('click', this.goToSelectionMode);
    }
  }

  componentDidMount(): void {
    if (this.frameConRef.current) {
      this.frameConRef.current.addEventListener('click', this.goToSelectionMode);
    }
    document.addEventListener('keydown', this.onKeyDownHandler);
    this.setState({ selectedAnnotationId: this.props.toAnnotationId });
  }

  async componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>) {
    if (prevProps.toAnnotationId !== this.props.toAnnotationId) {
      this.setState({ selectedAnnotationId: this.props.toAnnotationId });
    }

    if (prevState.isInElSelectionMode !== this.state.isInElSelectionMode) {
      if (this.state.isInElSelectionMode) {
        this.props.onScreenEditStart();
        this.iframeElManager?.enable();
      } else {
        this.iframeElManager?.disable();
        this.props.onScreenEditFinish();
      }
    }

    let elJustSelected = false;
    if (prevState.selectedEl !== this.state.selectedEl) {
      if (this.state.selectedEl) {
        if (!this.isFullPageAnnotation(this.state.selectedEl)) {
          elJustSelected = true;
          const editTargetType = ScreenEditor.getEditTargetType(this.state.selectedEl);
          this.setState((state) => ({
            editTargetType: editTargetType.targetType,
            targetEl: editTargetType.target || state.selectedEl,
            selectedAnnotationId: this.getAnnotatonIdForEl(state.selectedEl!)
          }));
        }
      } else {
        this.setState(() => ({
          editTargetType: EditTargetType.None,
          targetEl: null,
          selectedAnnotationId: '',
        }));
      }
    } else {
      // TODO same el is set twice???
    }

    if ((this.state.selectedEl
      && prevState.elSelRequestedBy !== this.state.elSelRequestedBy
      && this.state.elSelRequestedBy === ElSelReqType.AnnotateEl
      && !this.isFullPageAnnotation(this.state.selectedEl)
      // If elment is already selected and user just clicked on the "Add an annotaiton" button after
      // the element is slected. This happens when user clicks on "Edit an element" first >> select
      // the element >> click on "Add an annotaiton" button
    ) || (
      elJustSelected
        && this.state.selectedEl !== this.getIframeBody() // for default annotation (not full page annotatons)
        && this.state.elSelRequestedBy === ElSelReqType.AnnotateEl
        // this happens when user clicks on "Add an annotation" first
    )) {
      this.setState(state => {
        let opts: ITourDataOpts = this.props.tourDataOpts;
        let conf = this.getAnnnotationFromEl(state.selectedEl!);
        let selectedAnnotationId;
        if (!conf) {
          if (state.selectedElAnnFwd) {
            // Annotation is being replaced, this happens from advanced anntoation selector
            selectedAnnotationId = state.selectedElAnnFwd;
          } else {
            conf = getSampleConfig(this.iframeElManager!.elPath(state.selectedEl!));
            opts = this.props.tourDataOpts || getDefaultTourOpts();
            this.props.createDefaultAnnotation(
              conf,
              opts
            );
            selectedAnnotationId = conf.refId;
          }
        } else {
          selectedAnnotationId = conf.refId;
        }
        return { selectedAnnotationId, selectedElAnnFwd: '' };
      });
    }

    if (prevState.selectedAnnotationId !== this.state.selectedAnnotationId && this.state.selectedAnnotationId) {
      this.selectElementIfAnnoted();
      this.setState({ elSelRequestedBy: ElSelReqType.AnnotateEl });
    }
  }

  getAnnnotationFromEl(el: HTMLElement): IAnnotationConfig | null {
    const path = this.iframeElManager?.elPath(el);
    const existingAnnotaiton = this.props.allAnnotationsForScreen.filter(an => an.id === path);
    let conf: IAnnotationConfig | null = null;
    if (existingAnnotaiton.length) {
      conf = existingAnnotaiton[0];
    }
    return conf;
  }

  getAnnotationPathFromRefId(refId: string): string {
    const an = this.props.allAnnotationsForScreen.filter(a => a.refId === refId);
    return an.length >= 1 ? an[0].id : '';
  }

  getAnnotationTypeFromRefId(refId: string): string {
    const an = this.props.allAnnotationsForScreen.filter(a => a.refId === refId);
    return an.length >= 1 ? an[0].type : 'default';
  }

  getAnnotatonIdForEl(el: HTMLElement): string {
    const ann = this.getAnnnotationFromEl(el);
    return ann ? ann.refId : '';
  }

  getIframeBody() {
    return this.embedFrameRef.current?.contentDocument?.body!;
  }

  isFullPageAnnotation(el: HTMLElement) {
    return this.getIframeBody() === el;
  }

  selectElementIfAnnoted() {
    if (!this.state.selectedAnnotationId) return;
    const type = this.getAnnotationTypeFromRefId(this.state.selectedAnnotationId);

    if (type === 'cover') {
      this.iframeElManager?.selectElement(this.getIframeBody(), HighlightMode.Pinned, true);
      return;
    }

    const annId = this.getAnnotationPathFromRefId(this.state.selectedAnnotationId);

    if (!annId) {
      return;
    }

    if (this.props.screen.type === ScreenType.Img && type === 'default') {
      const [x, y, width, height] = annId.split('-');
      this.iframeElManager?.selectBoxInDoc({ x: +x, y: +y, width: +width, height: +height });
      return;
    }

    if (this.props.screen.type === ScreenType.SerDom && type === 'default') {
      const el = this.iframeElManager?.elFromPath(annId) as HTMLElement | null;
      if (el) {
        this.iframeElManager?.selectElement(el, HighlightMode.Pinned, true);
      }
    }
  }

  getEditingCtrlForElType(type: EditTargetType) {
    if (!this.state.selectedEl) {
      return <></>;
    }

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
              const path = this.iframeElManager!.elPath(refEl);
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
              const path = this.iframeElManager!.elPath(refEl);
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

        {restrictCrtlType(this.state.selectedEl!, ['img'])
          && (
            <Tags.EditCtrlLI>
              <Tags.EditCtrlLabel>Mask Element</Tags.EditCtrlLabel>
              <UploadButton
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={this.handleUploadMaskImgChange(this.state.selectedEl!)}
              />
            </Tags.EditCtrlLI>
          )}
      </>
    );
    switch (type) {
      case EditTargetType.Img:
        return (
          <Tags.EditCtrlCon>
            <Tags.EditCtrlLI>
              <Tags.EditCtrlLabel>Replace image</Tags.EditCtrlLabel>
              <UploadButton
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={this.handleSelectedImageChange(this.state.selectedEl!)}
              />
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
                  const path = this.iframeElManager!.elPath(refEl);
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

  static downArrow = () => <img src={ExpandIcon} width={12} height={6} alt="expand icon" />;

  flushMicroEdits() {
    const hasEdits = Object.keys(this.microEdits).length !== 0;
    if (hasEdits) {
      this.props.onScreenEditChange(this.microEdits);
      this.microEdits = {};
    }
  }

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }) => {
    this.initDomPicker(params.nestedFrames);
  };

  // eslint-disable-next-line class-methods-use-this
  onFrameAssetLoad: FrameAssetLoadFn = ({ foundAnnotation }) => {
    this.setState(state => ({
      isInElSelectionMode: true,
      elSelRequestedBy: state.elSelRequestedBy === ElSelReqType.NA
        ? ElSelReqType.EditEl
        : state.elSelRequestedBy
    }));
  };

  createCoverAnnotation = () => {
    const conf = getSampleConfig('$');
    const opts = this.props.tourDataOpts || getDefaultTourOpts();
    this.props.createDefaultAnnotation(
      conf,
      opts
    );
    this.setState({ selectedAnnotationId: conf.refId });
  };

  handleTabOnClick = (tab: TabList): void => {
    switch (tab) {
      case TabList.Annotations:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.AnnotateEl,
          isInElSelectionMode: true,
          activeTab: tab,
        }));
        break;
      case TabList.Edits:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.EditEl,
          isInElSelectionMode: true,
          activeTab: tab
        }));
        break;
      default:
        break;
    }
  };

  navigateToAnnotation = (uri: string) => {
    this.props.navigate(uri, 'annotation-hotspot');
  };

  render(): React.ReactNode {
    return (
      <GTags.PreviewAndActionCon>
        <GTags.EmbedCon style={{ overflow: 'hidden', position: 'relative' }} ref={this.frameConRef}>
          <PreviewWithEditsAndAnRO
            key={this.props.screen.rid}
            screen={this.props.screen}
            screenData={this.props.screenData}
            divPadding={18}
            navigate={this.props.navigate}
            innerRef={this.embedFrameRef}
            playMode={false}
            onBeforeFrameBodyDisplay={this.onBeforeFrameBodyDisplay}
            allAnnotationsForScreen={this.props.allAnnotationsForScreen}
            tourDataOpts={this.props.tourDataOpts}
            allEdits={this.props.allEdits}
            toAnnotationId={this.state.selectedAnnotationId}
            onFrameAssetLoad={this.onFrameAssetLoad}
          />
        </GTags.EmbedCon>

        {/* this is the annotation creator panel */}
        <GTags.EditPanelCon style={{ overflowY: 'auto' }}>
          {/* this is advanced element picker */}
          {
            this.props.screen.type === ScreenType.SerDom && (
              <ActionPanel
                icon={<SelectOutlined />}
                title="Advanced Element Picker"
                helpText={advancedElPickerHelpText}
                withGutter
              >
                {this.state.selectedEl ? (
                  <AdvanceElementPicker
                    elements={this.state.selectedElsParents}
                    domElPicker={this.iframeElManager}
                    selectedEl={this.state.selectedEl!}
                    count={this.state.selectedElsParents.length}
                    setSelectedEl={(newSelEl: HTMLElement, oldSelEl: HTMLElement) => {
                      let fwdAnnotation = '';
                      const annOnNewEl = this.getAnnnotationFromEl(newSelEl);
                      if (!annOnNewEl) {
                        // If there is annotation on top of new element then don't do anything
                        const annOnOldEl = this.getAnnnotationFromEl(oldSelEl);
                        if (annOnOldEl) {
                          this.props.onAnnotationCreateOrChange(null, annOnOldEl, 'delete', null);
                          const replaceWithAnn = cloneAnnotation(this.iframeElManager?.elPath(newSelEl)!, annOnOldEl);
                          const updates = replaceAnnotation(
                            this.props.allAnnotationsForTour,
                            annOnOldEl,
                            replaceWithAnn,
                            this.props.screen.id
                          );
                          fwdAnnotation = replaceWithAnn.refId;
                          updates.forEach(update => this.props.onAnnotationCreateOrChange(...update, null));
                        }
                      }
                      this.setState({ selectedEl: newSelEl, selectedElAnnFwd: fwdAnnotation });
                    }}
                    mouseLeaveHighlightMode={HighlightMode.Pinned}
                  />
                )
                  : <p style={{ margin: 0 }}>Please select an element</p>}
              </ActionPanel>
            )
          }
          {/* this is top menu */}
          <TabBar>
            <TabItem
              title="Annotations"
              helpText={annotationTabHelpText}
              active={this.state.activeTab === TabList.Annotations}
              onClick={() => this.handleTabOnClick(TabList.Annotations)}
            />
            {
              this.props.screen.type === ScreenType.SerDom && (
                <TabItem
                  title="Edit"
                  helpText={editTabHelpText}
                  active={this.state.activeTab === TabList.Edits}
                  onClick={() => this.handleTabOnClick(TabList.Edits)}
                />
              )
            }
          </TabBar>

          <div style={{}}>
            <Tags.EditPanelSec>
              {/* this is annotations timeline */}
              {this.state.activeTab === TabList.Annotations && (
                <div>
                  <Tags.InfoText style={{ textAlign: 'center' }}>
                    Select an element on the screen on the left <em>or</em>
                  </Tags.InfoText>
                  <Tags.CreateCoverAnnotationBtn onClick={() => { this.createCoverAnnotation(); }}>
                    <PlusOutlined />
                    &nbsp;
                    Create cover annotation
                  </Tags.CreateCoverAnnotationBtn>
                  <Tags.AnnTimelineCon>
                    {this.props.timelineConfig.prevScreen
                      && <TimelineScreen
                        navigate={this.navigateToAnnotation}
                        isLastScreen={false}
                        screen={this.props.timelineConfig.prevScreen}
                        annotationId={this.props.timelineConfig.prevAnnotation}
                      />}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {this.props.timelineConfig.currentScreenAnnotations.map((config, idx) => (
                        <Tags.AnnotationLI
                          key={config.refId}
                          style={{
                            paddingBottom: this.state.selectedAnnotationId === config.refId ? '0.25rem' : '0.65rem',
                            opacity: this.state.selectedAnnotationId === config.refId ? 1 : 0.65
                          }}
                        >
                          <Tags.AnotCrtPanelSecLabel
                            style={{ display: 'flex' }}
                            onClick={() => {
                              if (this.state.selectedAnnotationId === config.refId) {
                                this.setState({ selectedAnnotationId: '', selectedEl: null });
                                this.goToSelectionMode()();
                              } else {
                                this.setState({ selectedAnnotationId: config.refId });
                              }
                            }}
                          >
                            <Tags.AnnDisplayText>{config.displayText}</Tags.AnnDisplayText>
                            {
                              config.syncPending && (<LoadingOutlined />)
                            }
                            <img src={ExpandArrowFilled} height={20} width={20} alt="" />
                          </Tags.AnotCrtPanelSecLabel>
                          {this.state.selectedAnnotationId === config.refId && (
                            <div style={{ color: 'black' }}>
                              <AnnotationCreatorPanel
                                config={config}
                                opts={this.props.tourDataOpts}
                                allAnnotationsForTour={this.props.allAnnotationsForTour}
                                screen={this.props.screen}
                                selectedHotspotEl={this.state.selectedHotspotEl}
                                setSelectionMode={(mode: 'annotation' | 'hotspot') => {
                                  this.setState({ selectionMode: mode });
                                }}
                                domElPicker={this.iframeElManager}
                                onSideEffectConfigChange={
                                  (screenId: number, c: IAnnotationConfig, actionType: 'upsert' | 'delete') => {
                                    this.props.onAnnotationCreateOrChange(screenId, c, actionType, null);
                                  }
                                }
                                onConfigChange={async (conf, actionType, opts) => {
                                  if (actionType === 'upsert') {
                                    this.setState({ selectedAnnotationId: conf.refId });
                                  }
                                  this.props.onAnnotationCreateOrChange(null, conf, actionType, opts);
                                }}
                              />
                            </div>
                          )}
                          {idx < this.props.timelineConfig.currentScreenAnnotations.length - 1 && <Tags.VerticalBar />}
                        </Tags.AnnotationLI>
                      ))}
                    </div>

                    {this.props.timelineConfig.nextScreen
                      && <TimelineScreen
                        navigate={this.navigateToAnnotation}
                        isLastScreen
                        screen={this.props.timelineConfig.nextScreen}
                        annotationId={this.props.timelineConfig.nextAnnotation}
                      />}
                  </Tags.AnnTimelineCon>
                </div>
              )}

              {/* this is edits panel */}
              {this.state.activeTab === TabList.Edits && (
                <>
                  <Tags.InfoText>
                    Edits are applied on the recorded screen. Select an element to edit.
                  </Tags.InfoText>
                  <Tags.EditTabCon>
                    {/* this show the edit controls like toggles for blur/hide
                      and textarea for changing text content */}
                    {this.getEditingCtrlForElType(this.state.editTargetType)}
                  </Tags.EditTabCon>
                  {/* this is edits list */}
                  {this.props.screen.parentScreenId !== 0
                    && this.props.allEdits
                      .map((editEncoding) => (
                        <Tags.EditLIPCon
                          key={editEncoding[IdxEditItem.KEY]}
                          onClick={((edit) => (evt): void => {
                            this.setState({
                              editItemSelected: editEncoding[IdxEditItem.KEY],
                              isInElSelectionMode: true,
                              elSelRequestedBy: ElSelReqType.EditEl,
                            });
                            this.highlightElementForPath(edit[IdxEditItem.PATH]);
                          })(editEncoding)}
                        >
                          {ScreenEditor.getEditTypeComponent(editEncoding, editEncoding[IdxEditItem.EDIT_TYPE_LOCAL])}
                          {editEncoding[IdxEditItem.KEY] === this.state.editItemSelected && (
                            <div style={{ display: 'flex' }}>
                              <ListActionBtn edit={editEncoding} element={this.state.selectedEl!} />
                              &nbsp;&nbsp;|&nbsp;&nbsp;
                              <Tags.ListActionBtn onClick={() => this.showDeleteConfirm(editEncoding)}>
                                Delete
                              </Tags.ListActionBtn>
                            </div>
                          )}
                        </Tags.EditLIPCon>
                      ))}
                </>
              )}
            </Tags.EditPanelSec>
          </div>
        </GTags.EditPanelCon>
      </GTags.PreviewAndActionCon>
    );
  }

  highlightElementForPath(path: string) {
    const doc = this.embedFrameRef.current?.contentDocument;
    if (!doc) {
      throw new Error('Iframe doc is not found while resolving element from path');
    }
    const el = this.iframeElManager!.elFromPath(path) as HTMLElement;
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
      this.iframeElManager?.selectElement(el, HighlightMode.Pinned);
    }, 3 * 16);
  }

  private onMouseOutOfIframe = (_: MouseEvent) => {
    this.iframeElManager?.disable();
  };

  private onMouseEnterOnIframe = (_: MouseEvent) => {
    this.state.isInElSelectionMode && this.iframeElManager?.enable();
  };

  private onKeyDown = () => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // TODO handle pin mode and annotation selection
      if (this.iframeElManager && this.iframeElManager.getMode() === HighlightMode.Pinned) {
        this.iframeElManager.getOutOfPinMode();
        this.setState({ elSelRequestedBy: ElSelReqType.NA });
      } else {
        // this.setState({ isInElSelectionMode: false, elSelRequestedBy: ElSelReqType.NA });
      }
      this.setState({ selectedAnnotationId: '' });

      if (this.state.editItemSelected !== '') {
        this.setState({ editItemSelected: '' });
      }
    }
  };

  private onKeyDownHandler = (e: KeyboardEvent) => {
    this.onKeyDown()(e);
  };

  private goToSelectionMode = () => () => {
    // todo[now] repeated code with onKeyDown method
    if (this.iframeElManager && this.iframeElManager.getMode() === HighlightMode.Pinned) {
      this.iframeElManager.getOutOfPinMode();
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
    if (this.iframeElManager) {
      this.iframeElManager.dispose();
      this.iframeElManager = null;
    }
  }

  private onElSelect = (el: HTMLElement, parents: Node[]) => {
    this.iframeElManager!.elPath(el);

    if (this.state.selectionMode === 'hotspot') {
      this.setState({ selectedHotspotEl: el, selectedElsParents: parents, selectionMode: 'annotation' });
      return;
    }

    this.setState({ selectedEl: el, selectedElsParents: parents });
  };

  private onElDeSelect = (_: HTMLElement) => {
    this.flushMicroEdits();
    this.setState({ selectedEl: null });
  };

  private onBoxSelect = (coordsStr: string) => {
    const opts: ITourDataOpts = this.props.tourDataOpts || getDefaultTourOpts();
    const conf = getSampleConfig(coordsStr);

    this.props.createDefaultAnnotation(
      conf,
      opts
    );

    this.setState({ selectedAnnotationId: conf.refId, selectedElAnnFwd: '' });
  };

  private onBoxDeSelect = () => {
    this.setState({ selectedAnnotationId: '' });
  };

  private initDomPicker(nestedFrames: HTMLIFrameElement[]) {
    const el = this.embedFrameRef?.current;
    let doc;
    if (doc = el?.contentDocument) {
      if (!this.iframeElManager) {
        if (this.props.screen.type === ScreenType.SerDom) {
          this.iframeElManager = new DomElPicker(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
          }, this.props.screen.type);
          this.iframeElManager!.addEventListener('click', this.goToSelectionMode);
        }

        if (this.props.screen.type === ScreenType.Img) {
          this.iframeElManager = new ScreenImageBrusher(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
            onBoxSelect: this.onBoxSelect,
            onBoxDeSelect: this.onBoxDeSelect,
          }, this.props.screen.type);
        }

        if (!this.props.toAnnotationId) {
          this.iframeElManager!.getOutOfPinMode();
        }

        this.iframeElManager!.addEventListener('keydown', this.onKeyDown);
        this.iframeElManager!.setupHighlighting();

        el.addEventListener('mouseout', this.onMouseOutOfIframe);
        el.addEventListener('mouseenter', this.onMouseEnterOnIframe);
        this.selectElementIfAnnoted();
      }
    } else {
      throw new Error("Can't init dompicker as iframe document is null");
    }
  }
}
