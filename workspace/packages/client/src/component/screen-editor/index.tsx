import {
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  HomeOutlined,
  LoadingOutlined,
  PictureOutlined, PlusOutlined
} from '@ant-design/icons';
import { ScreenType } from '@fable/common/dist/api-contract';
import { CmnEvtProp, IAnnotationConfig, ITourDataOpts, ScreenData } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime, getDefaultTourOpts, getSampleConfig } from '@fable/common/dist/utils';
import Modal from 'antd/lib/modal';
import Switch from 'antd/lib/switch';
import React from 'react';
import { nanoid } from 'nanoid';
import { traceEvent } from '@fable/common/dist/amplitude';
import { Tooltip } from 'antd';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import ExpandIcon from '../../assets/creator-panel/expand-arrow.svg';
import MaskIcon from '../../assets/creator-panel/mask-icon.png';
import NewAnnotation from '../../assets/creator-panel/new-annotation.svg';
import NewCoverAnnotation from '../../assets/creator-panel/new-cover-annotation.svg';
import * as GTags from '../../common-styled';
import * as TimelineTags from '../timeline/styled';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import {
  AllEdits,
  AnnotationPerScreen,
  ConnectedOrderedAnnGroupedByScreen, DestinationAnnotationPosition, EditItem,
  EditValueEncoding,
  ElEditType,
  FrameAssetLoadFn, IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeMask,
  NavFn,
  ScreenPickerData,
  onAnnCreateOrChangeFn
} from '../../types';
import {
  shallowCloneAnnotation,
  IAnnotationConfigWithScreenId,
} from '../annotation/annotation-config-utils';
import { AnnotationSerialIdMap, addNewAnn, getAnnotationBtn } from '../annotation/ops';
import { getAnnotationByRefId } from '../annotation/utils';
import Timeline from '../timeline';
import { AnnUpdateType } from '../timeline/types';
import AEP from './advanced-element-picker';
import AnnotationCreatorPanel from './annotation-creator-panel';
import ImageMaskUploadModal from './components/image-mask-modal';
import TabBar from './components/tab-bar';
import TabItem from './components/tab-bar/tab-item';
import UploadButton from './components/upload-button';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import { annotationTabHelpText, editTabHelpText } from './helptexts';
import ListActionBtn from './list-action-btn';
import PreviewWithEditsAndAnRO from './preview-with-edits-and-annotations-readonly';
import ScreenImageBrusher from './screen-image-brushing';
import * as Tags from './styled';
import { addImgMask, hideChildren, restrictCrtlType, unhideChildren } from './utils/creator-actions';
import { ImgResolution, resizeImg } from './utils/resize-img';
import { uploadFileToAws } from './utils/upload-img-to-aws';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import {
  AEP_HEIGHT,
  ANN_EDIT_PANEL_WIDTH,
  getAnnotationWithScreenAndIdx,
  isNavigateHotspot,
  isNextBtnOpensALink
} from '../../utils';
import SelectorComponent from '../../user-guides/selector-component';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { amplitudeNewAnnotationCreated, amplitudeScreenEdited, propertyCreatedFromWithType } from '../../amplitude';
import Loader from '../loader';
import { UpdateScreenFn } from '../../action/creator';
import CaretOutlined from '../icons/caret-outlined';
import ScreenEditorGuide from '../../user-guides/screen-editor-guide';
import FocusBubble from './focus-bubble';

const { confirm } = Modal;

const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Mixed = 'm',
  None = 'n',
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

export interface ITimelineConfig {
  currentScreenAnnotations: IAnnotationConfigWithScreenId[];
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
  annotationSerialIdMap: AnnotationSerialIdMap;
  screen: P_RespScreen;
  navigate: NavFn;
  screenData: ScreenData;
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  tour: P_RespTour;
  tourDataOpts: ITourDataOpts;
  timeline: ConnectedOrderedAnnGroupedByScreen,
  onAnnotationCreateOrChange: onAnnCreateOrChangeFn;
  onScreenEditStart: () => void;
  toAnnotationId: string;
  onScreenEditFinish: () => void;
  onScreenEditChange: (editChunks: AllEdits<ElEditType>) => void;
  allAnnotationsForTour: AnnotationPerScreen[];
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void;
  commitTx: (tx: Tx) => void;
  setAlert: (msg?: string) => void;
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData)=> void;
  isScreenLoaded: boolean;
  showEntireTimeline: boolean;
  onDeleteAnnotation?: (deletedAnnRid: string) => void;
  updateScreen: UpdateScreenFn;
  newAnnPos: null | DestinationAnnotationPosition;
  resetNewAnnPos: ()=>void;
}

const enum ElSelReqType {
  NA = 0,
  EditEl,
  AnnotateEl,
  ElPicker
}

interface IOwnStateProps {
  isInElSelectionMode: boolean;
  elSelRequestedBy: ElSelReqType;
  selectedEl: HTMLElement | null;
  aepSyncing: boolean;
  selectedAnnotationId: string;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
  editItemSelected: string;
  stashAnnIfAny: boolean;
  selectedHotspotEl: HTMLElement | null;
  selectedAnnReplaceEl: HTMLElement | null;
  selectionMode: 'hotspot' | 'annotation' | 'replace';
  activeTab: TabList;
  showImageMaskUploadModal: boolean;
  imageMaskUploadModalError: string;
  imageMaskUploadModalIsUploading: boolean;
  selectedAnnotationCoords: string | null;
  isAssetLoaded: boolean;
  selectedCoords: string | null;
}

const userGuides = [ScreenEditorGuide];

export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private readonly frameConRef: React.MutableRefObject<HTMLDivElement | null>;

  private iframeElManager: DomElPicker | null = null;

  private microEdits: AllEdits<ElEditType>;

  private lastSelectedAnnId = '';

  private animateHelpText = false;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.frameConRef = React.createRef();
    this.microEdits = {};

    this.state = {
      isInElSelectionMode: true,
      elSelRequestedBy: ElSelReqType.AnnotateEl,
      selectedEl: null,
      stashAnnIfAny: false,
      targetEl: null,
      editTargetType: EditTargetType.None,
      editItemSelected: '',
      aepSyncing: false,
      selectedAnnotationId: '',
      selectedHotspotEl: null,
      selectedAnnReplaceEl: null,
      selectedAnnotationCoords: null,
      selectionMode: 'annotation',
      activeTab: TabList.Annotations,
      showImageMaskUploadModal: false,
      imageMaskUploadModalError: '',
      imageMaskUploadModalIsUploading: false,
      isAssetLoaded: false,
      selectedCoords: null,
    };
  }

  showDeleteConfirm = (e: EditItem): void => {
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

  static updateBlurValueToFilter(filterStr: string, value: number): string {
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

  static getEditTypeComponent(edit: EditItem, shouldShowLoading = false): JSX.Element {
    const encoding = edit[IdxEditItem.ENCODING];
    if (edit[IdxEditItem.TYPE] === ElEditType.Text && shouldShowLoading) {
      amplitudeScreenEdited('text', encoding[IdxEditEncodingText.NEW_VALUE] as string);
    }

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
    const newImageUrl = await uploadFileToAws(selectedImage);
    const [dimH, dimW] = ScreenEditor.changeSelectedImage(imgEl, newImageUrl);

    const path = this.iframeElManager!.elPath(imgEl);
    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    let origVal = imgEl.getAttribute(attrName);
    if (origVal === null) {
      origVal = originalImgSrc || '';
      imgEl.setAttribute(attrName, origVal);
    }
    this.addToMicroEdit(path, ElEditType.Image, [getCurrentUtcUnixTime(), origVal, newImageUrl, dimH, dimW]);
    amplitudeScreenEdited('replace_image', '');
    this.flushMicroEdits();
  };

  uploadImgMask = async (maskImgFile: File, resolution: ImgResolution): Promise<void> => {
    const el = this.state.selectedEl!;

    this.setState({ imageMaskUploadModalIsUploading: true, imageMaskUploadModalError: '' });

    try {
      const newImageUrl = await uploadFileToAws(maskImgFile);
      const resizedImgUrl = maskImgFile.type === 'image/gif'
        ? ''
        : await resizeImg(newImageUrl, this.props.screen.rid, resolution);

      hideChildren(el);

      const oldElInlineStyles = el.getAttribute('style') || '';
      const newElInlineStyles = addImgMask(el, resizedImgUrl, newImageUrl);

      const path = this.iframeElManager!.elPath(el);

      const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Mask}`;
      let origVal = el.getAttribute(attrName);
      if (origVal === null) {
        origVal = oldElInlineStyles;
        el.setAttribute(attrName, origVal);
      }

      this.addToMicroEdit(path, ElEditType.Mask, [getCurrentUtcUnixTime(), newElInlineStyles, oldElInlineStyles]);
      this.flushMicroEdits();
      amplitudeScreenEdited('mask_el', '');
    } catch (err) {
      this.setState({ imageMaskUploadModalError: 'Something went wrong' });
    } finally {
      this.setState({ imageMaskUploadModalIsUploading: false, showImageMaskUploadModal: false });
    }
  };

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener('keydown', this.onKeyDownHandler);
    if (this.frameConRef.current) {
      this.frameConRef.current.removeEventListener('click', this.goToSelectionMode);
    }
  }

  componentDidMount(): void {
    this.animateHelpText = true;
    if (this.frameConRef.current) {
      this.frameConRef.current.addEventListener('click', this.goToSelectionMode);
    }
    document.addEventListener('keydown', this.onKeyDownHandler);
    this.setState(() => {
      let selectedAnnotationId = this.props.toAnnotationId;
      if (this.props.newAnnPos !== null) {
        selectedAnnotationId = '';
        this.lastSelectedAnnId = this.props.toAnnotationId;
      }
      return { selectedAnnotationId };
    });
  }

  findPositionToAddAnnotation(): [IAnnotationConfig, DestinationAnnotationPosition, boolean] {
    const lastAnnId = this.lastSelectedAnnId;
    let validAnn = null;
    if (lastAnnId) {
      validAnn = getAnnotationByRefId(lastAnnId, this.props.allAnnotationsForTour);
    }

    if (validAnn) {
      if (isNextBtnOpensALink(validAnn)) {
        // If the annotation's next button open a new url on click of next
        return [validAnn, DestinationAnnotationPosition.prev, false];
      }
      return [validAnn, DestinationAnnotationPosition.next, true];
    }

    const ann = this.props.allAnnotationsForScreen.slice(0).reverse().at(-1)!;
    if (isNextBtnOpensALink(ann)) {
      return [ann, DestinationAnnotationPosition.prev, false];
    }
    return [ann, DestinationAnnotationPosition.next, true];
  }

  async componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>): Promise<void> {
    if (prevProps.toAnnotationId !== this.props.toAnnotationId || prevProps.newAnnPos !== this.props.newAnnPos) {
      // Clear any previous left over mask
      this.iframeElManager?.clearMask();
      this.setState(() => {
        let selectedAnnotationId = this.props.toAnnotationId;
        if (this.props.newAnnPos !== null) {
          selectedAnnotationId = '';
          this.lastSelectedAnnId = this.props.toAnnotationId;
        }
        return { selectedAnnotationId, activeTab: TabList.Annotations };
      });
      setTimeout(() => {
        this.animateHelpText = false;
      }, 3000);

      if (this.props.newAnnPos !== null) {
        this.setState({ selectedEl: null });
        this.goToSelectionMode()();
      }
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

    if (this.state.activeTab === TabList.Annotations) {
      if (!this.state.selectedAnnotationId
        && prevState.selectedEl !== this.state.selectedEl
        && this.state.selectedEl
        && !this.isFullPageAnnotation(this.state.selectedEl)
      ) {
        // If an element from screen is selected an no selectedAnnotationId is in state i.e. element is selected by
        // clicking on screen; probable intent is to create a new annotaiton or edit element
        const annId = this.getAnnotatonIdForEl(this.state.selectedEl!);
        if (annId) {
          // Check if an existing annotation is attached to the element, if yes then don't create new annotation,
          // instead navigate to already created annotation. As we don't support adding multiple annotation to same
          // element
          this.navigateToAnnotation(`${this.props.screen.id}/${annId}`);
          this.setState({ selectedAnnotationId: annId });
        }
      }

      if (prevState.selectedAnnotationId !== this.state.selectedAnnotationId) {
        if (this.state.selectedAnnotationId) {
          this.selectElementIfAnnoted();
          this.setState({ elSelRequestedBy: ElSelReqType.AnnotateEl });
          if (this.props.newAnnPos) this.props.resetNewAnnPos();
        } else {
          this.animateHelpText = true;
        }
        this.lastSelectedAnnId = this.state.selectedAnnotationId || prevState.selectedAnnotationId;
      }
    }

    if (this.state.activeTab === TabList.Edits
      && this.state.selectedEl !== prevState.selectedEl
      && this.state.selectedEl) {
      this.highlightEditElIfSelected(this.state.selectedEl);
    }

    if (prevProps.tourDataOpts.annotationSelectionColor !== this.props.tourDataOpts.annotationSelectionColor) {
      this.iframeElManager?.updateConfig('selectionColor', this.props.tourDataOpts.annotationSelectionColor);
    }

    if (prevState.activeTab !== this.state.activeTab) {
      this.animateHelpText = false;
      traceEvent(
        AMPLITUDE_EVENTS.SCREEN_TAB_SELECTED,
        { screen_tab: this.state.activeTab === 0 ? 'annotation' : 'edit' },
        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
      );
    }
  }

  createNewDefaultAnnotation(id: string): IAnnotationConfig | null {
    let conf = null;
    const opts: ITourDataOpts = this.props.tourDataOpts;
    if (this.props.allAnnotationsForScreen.length) {
      const [destAnn, pos, shouldAddAnn] = this.findPositionToAddAnnotation();
      if (shouldAddAnn) {
        conf = addNewAnn(
          this.props.allAnnotationsForTour,
          {
            position: this.props.newAnnPos || pos,
            refId: destAnn.refId,
            screenId: this.props.screen.id,
            grpId: destAnn.grpId
          },
          opts,
          this.props.setAlert,
          this.props.applyAnnButtonLinkMutations,
          id
        );
        this.props.resetNewAnnPos();
      } else {
        this.props.setAlert('Cannot add annotation as link is present');
      }
    } else {
      conf = getSampleConfig(id, nanoid());
      this.createAnnotationForTheFirstTime(conf);
    }
    if (conf) this.navigateToAnnotation(`${this.props.screen.id}/${conf.refId}`);
    return conf;
  }

  createNewCoverAnnotation(): void {
    let conf;
    if (this.props.allAnnotationsForScreen.length) {
      // check if position is present, if yes create new ann wrt that position
      const currentAnn = getAnnotationByRefId(this.props.toAnnotationId, this.props.allAnnotationsForTour);

      if (isNextBtnOpensALink(currentAnn!)) {
        this.props.setAlert('Cannot add annotation as this annotaiton contains a link');
        return;
      }
      conf = addNewAnn(
        this.props.allAnnotationsForTour,
        {
          position: this.props.newAnnPos || DestinationAnnotationPosition.next,
          grpId: currentAnn!.grpId,
          screenId: this.props.screen.id,
          refId: currentAnn!.refId
        },
        this.props.tourDataOpts,
        this.props.setAlert,
        this.props.applyAnnButtonLinkMutations
      );
      this.props.resetNewAnnPos();
    } else {
      conf = getSampleConfig('$', nanoid());
      this.createCoverAnnotationForTheFirstTime(conf);
    }
    this.navigateToAnnotation(`${this.props.screen.id}/${conf.refId}`);
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

  getIframeBody(): HTMLElement {
    return this.embedFrameRef.current?.contentDocument?.body!;
  }

  isFullPageAnnotation(el: HTMLElement): boolean {
    return this.getIframeBody() === el;
  }

  selectElementIfAnnoted(): void {
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

  getEditingCtrlForElType(type: EditTargetType): JSX.Element {
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
              amplitudeScreenEdited('show_or_hide_el', checked);
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
              amplitudeScreenEdited('blur_el', checked);
            })(this.state.selectedEl!)}
            size="small"
          />
        </Tags.EditCtrlLI>

        {restrictCrtlType(this.state.selectedEl!, ['img'])
          && (
            <Tags.EditCtrlLI>
              <Tags.EditCtrlLabel>Mask Element</Tags.EditCtrlLabel>
              <button
                onClick={() => this.setState({ showImageMaskUploadModal: true })}
                type="button"
                style={{
                  backgroundColor: '#DDD',
                  border: '1px solid transparent',
                  boxShadow: '0 2px #00000004',
                  padding: '4px 15px',
                  borderRadius: '2px',
                  color: '#000000d9',
                  borderColor: '#DDDDDD',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Upload Mask
              </button>
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

  static downArrow = (): JSX.Element => <img src={ExpandIcon} width={12} height={6} alt="expand icon" />;

  flushMicroEdits(): void {
    const hasEdits = Object.keys(this.microEdits).length !== 0;
    if (hasEdits) {
      this.props.onScreenEditChange(this.microEdits);
      this.microEdits = {};
    }
  }

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }): void => {
    this.initDomPicker(params.nestedFrames);
  };

  // eslint-disable-next-line class-methods-use-this
  onFrameAssetLoad: FrameAssetLoadFn = ({ foundAnnotation }) => {
    this.setState(state => ({
      isInElSelectionMode: true,
      elSelRequestedBy: state.elSelRequestedBy === ElSelReqType.NA
        ? ElSelReqType.EditEl
        : state.elSelRequestedBy,
      isAssetLoaded: true
    }));
  };

  createAnnotationForTheFirstTime = (ann: IAnnotationConfig): void => {
    const opts = this.props.tourDataOpts || getDefaultTourOpts();
    opts.main = `${this.props.screen.id}/${ann.refId}`;
    this.props.onAnnotationCreateOrChange(null, ann, 'upsert', opts);
  };

  createCoverAnnotationForTheFirstTime = (conf: IAnnotationConfig): void => {
    this.createAnnotationForTheFirstTime(conf);
    this.setState({ selectedAnnotationId: conf.refId });
  };

  handleTabOnClick = (tab: TabList): void => {
    switch (tab) {
      case TabList.Annotations:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.AnnotateEl,
          isInElSelectionMode: true,
          activeTab: tab,
          selectedEl: null
        }));
        break;
      case TabList.Edits:
        this.setState((state) => ({
          elSelRequestedBy: ElSelReqType.EditEl,
          isInElSelectionMode: true,
          activeTab: tab,
          selectedAnnotationId: '',
          editItemSelected: ''
        }));
        break;
      default:
        break;
    }
    this.goToSelectionMode()();
  };

  navigateToAnnotation = (uri: string): void => {
    this.props.navigate(uri, 'annotation-hotspot');
  };

  handleImageMaskUploadModalOnCancel = (): void => {
    this.setState({ showImageMaskUploadModal: false });
  };

  isScreenAndAssetLoaded = (): boolean => this.state.isAssetLoaded && this.props.isScreenLoaded;

  showCreateDefaultAnnButton = (): boolean => {
    if (this.props.screen.type === ScreenType.Img) {
      return Boolean(!this.state.selectedAnnotationId && this.state.selectedCoords);
    }
    return Boolean(!this.state.selectedAnnotationId && this.state.selectedEl);
  };

  createDefaultAnnotation = () : void => {
    if (this.props.screen.type === ScreenType.Img) {
      amplitudeNewAnnotationCreated(propertyCreatedFromWithType.IMG_DRAG_RECT);
      this.setState(state => {
        const conf = this.createNewDefaultAnnotation(state.selectedCoords!);
        if (conf) { return { selectedAnnotationId: conf.refId }; }
        return { selectedAnnotationId: state.selectedAnnotationId };
      });
    } else {
      this.setState(state => {
        let conf = this.getAnnnotationFromEl(state.selectedEl!);
        let selectedAnnotationId = state.selectedAnnotationId;
        if (!conf) {
          amplitudeNewAnnotationCreated(propertyCreatedFromWithType.DOM_EL_PICKER);
          try {
            const path = this.iframeElManager!.elPath(state.selectedEl!);
            conf = this.createNewDefaultAnnotation(path);
          } catch (e) {
            sentryCaptureException(e as Error);
            throw e;
          }
          if (conf) selectedAnnotationId = conf.refId;
        }
        return { selectedAnnotationId };
      });
    }
  };

  highlightEditElIfSelected = (selectedEl: HTMLElement | null) : void => {
    if (selectedEl && !this.isFullPageAnnotation(selectedEl)) {
      this.iframeElManager!.selectElement(selectedEl, HighlightMode.Pinned);
      const editTargetType = ScreenEditor.getEditTargetType(selectedEl);
      this.setState({
        editTargetType: editTargetType.targetType,
        targetEl: editTargetType.target || selectedEl,
      });
    }
  };

  editExistOnEl(el: HTMLElement): boolean {
    const path = this.iframeElManager?.elPath(el);
    const existingEdit = this.props.allEdits.filter(edit => edit[IdxEditItem.PATH] === path);
    return existingEdit.length !== 0;
  }

  aepElSelect(newSelEl: HTMLElement, oldSelEl: HTMLElement, selectedOnClick: boolean): void {
    // don't call when in edits tab or while using AEP during creating new ann
    if (!selectedOnClick || this.state.selectedAnnotationId) {
      this.iframeElManager!.clearMask(HighlightMode.Pinned);
    }
    if (newSelEl === oldSelEl) {
      if (!this.state.selectedAnnotationId || this.state.activeTab === TabList.Edits) {
        this.highlightEditElIfSelected(newSelEl);
      }
      this.setState({ stashAnnIfAny: false });
      return;
    }

    if (this.state.activeTab === TabList.Annotations) {
      const annOnOldEl = this.getAnnnotationFromEl(oldSelEl);
      const annOnNewEl = this.getAnnnotationFromEl(newSelEl);
      // If there is annotation on top of new element then don't do anything
      if (!annOnNewEl) {
        traceEvent(AMPLITUDE_EVENTS.ADVANCED_EL_PICKER_USED, {}, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);

        if (annOnOldEl) {
          const newElPath = this.iframeElManager!.elPath(newSelEl)!;
          const replaceWithAnn = shallowCloneAnnotation(newElPath, annOnOldEl);
          const tx = new Tx();
          tx.start();
          const updates: Array<
          [
            screenId: number | null,
            config: IAnnotationConfig,
            actionType: 'upsert' | 'delete'
          ]
        > = [
          [this.props.screen.id, annOnOldEl, 'delete'],
          [this.props.screen.id, replaceWithAnn, 'upsert']
        ];
          this.setState({ aepSyncing: true });
          updates.forEach(update => this.props.onAnnotationCreateOrChange(...update, null, tx));
          this.props.commitTx(tx);
          setTimeout(() => {
          // TODO From the time something is selected via aep to the time view update happens,
          // it takes few moment.
          // This is just a temporary guard for user to wait while the view gets updated.
          // The proper fix would
          // be create a unidirectional flow via reducer (not local state)
            this.setState({ aepSyncing: false });
          }, 1500);
        }
      } else if (annOnNewEl) {
        this.navigateToAnnotation(`${this.props.screen.id}/${annOnNewEl.refId}`);
      }
    } else {
      const editOnOldEl = this.editExistOnEl(oldSelEl);
      const editOnNewEl = this.editExistOnEl(newSelEl);
      if (editOnNewEl || editOnOldEl) {
        return;
      }
    }
    this.setState({
      stashAnnIfAny: false,
      selectedEl: newSelEl,
      elSelRequestedBy: ElSelReqType.ElPicker
    });
  }

  resetSelectedAnnotation(): void {
    this.setState({ selectedAnnotationId: '', selectedEl: null });
  }

  resetSelectedEdits(): void {
    this.setState({ editItemSelected: '', targetEl: null, editTargetType: EditTargetType.None });
  }

  render(): React.ReactNode {
    let startAnnotaitonId = '';
    if (this.props.tourDataOpts && this.props.tourDataOpts.main) {
      startAnnotaitonId = this.props.tourDataOpts.main.split('/')[1] || startAnnotaitonId;
    }

    const configOfParamsAnnId = getAnnotationWithScreenAndIdx(this.props.toAnnotationId, this.props.timeline);
    const showAnnCreatorPanel = this.props.toAnnotationId === this.state.selectedAnnotationId && configOfParamsAnnId;
    // configOfSelectedAnn is required for timeline.
    // if we deprecate timeline we don't need to keep two states
    const configOfSelectedAnn = getAnnotationWithScreenAndIdx(this.state.selectedAnnotationId, this.props.timeline);

    let helpText = '';
    if (this.state.selectedAnnotationId) {
      helpText = 'Click on the screen on left to select an element';
    } else if ((this.props.screen.type === ScreenType.SerDom && this.state.selectedEl)
      || (this.props.screen.type === ScreenType.Img && this.state.selectedCoords)) {
      helpText = 'Click again to reselect. Or else create';
    } else {
      helpText = this.props.screen.type === ScreenType.Img
        ? 'Drag to select an area on the image or create'
        : 'Select an element from the screen on left or create';
    }

    return (
      <>
        <GTags.PreviewAndActionCon style={{ borderRadius: '20px' }}>
          {this.props.screen.type === ScreenType.SerDom && this.state.selectedEl && (
            <div
              id="AEP-wrapper"
              style={{
                position: 'absolute',
                width: `calc(100% - ${ANN_EDIT_PANEL_WIDTH}px)`,
                height: `${AEP_HEIGHT}px`,
                bottom: '0',
                left: '0',
                borderRadius: '2px',
                zIndex: '100'
              }}
            >
              <AEP
                selectedEl={this.state.selectedEl}
                domElPicker={this.iframeElManager!}
                disabled={this.state.aepSyncing}
                onOverElPicker={() => {
                  this.setState({ stashAnnIfAny: true });
                }}
                onElSelect={(newSelEl: HTMLElement, oldSelEl: HTMLElement, selectedOnClick?: boolean) => {
                  this.aepElSelect(newSelEl, oldSelEl, selectedOnClick || false);
                }}
              />
            </div>
          )}
          <GTags.EmbedCon
            style={{
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '20px',
              height: `calc(100% - ${AEP_HEIGHT}px - 2rem)`
            }}
            ref={this.frameConRef}
          >
            {this.props.isScreenLoaded && <PreviewWithEditsAndAnRO
              annotationSerialIdMap={this.props.annotationSerialIdMap}
              key={this.props.screen.rid}
              screen={this.props.screen}
              screenData={this.props.screenData}
              navigate={this.props.navigate}
              innerRef={this.embedFrameRef}
              playMode={false}
              onBeforeFrameBodyDisplay={this.onBeforeFrameBodyDisplay}
              allAnnotationsForScreen={this.props.allAnnotationsForScreen}
              tourDataOpts={this.props.tourDataOpts}
              allEdits={this.props.allEdits}
              toAnnotationId={this.state.selectedAnnotationId}
              stashAnnIfAny={this.state.stashAnnIfAny}
              onFrameAssetLoad={this.onFrameAssetLoad}
              allAnnotationsForTour={this.props.allAnnotationsForTour}
              tour={this.props.tour}
              hidden={!this.state.isAssetLoaded}
              onDispose={() => {
                this.embedFrameRef?.current!.removeEventListener('mouseout', this.onMouseOutOfIframe);
                this.embedFrameRef?.current!.removeEventListener('mouseenter', this.onMouseEnterOnIframe);
              }}
              allFlows={[]}
              currentFlowMain=""
              updateCurrentFlowMain={(main: string) => {}}
              updateJourneyProgress={(annRefid: string) => {}}
            />}
            {!this.isScreenAndAssetLoaded() && <Loader width="80px" txtBefore="Loading screen" />}
          </GTags.EmbedCon>
          {/* this is the annotation creator panel */}
          <div style={{
            overflow: 'hidden',
            borderTopRightRadius: '20px',
            borderBottomRightRadius: '20px',
            width: `${ANN_EDIT_PANEL_WIDTH}px`,
          }}
          >
            <GTags.EditPanelCon
              id="ann-creator-panel"
              style={{
                overflowY: 'auto',
                borderTopRightRadius: '20px',
                borderBottomRightRadius: '20px',
                width: `${ANN_EDIT_PANEL_WIDTH}px`,
              }}
            >
              {/* this is top menu */}
              <TabBar>
                <TabItem
                  title="Annotation"
                  helpText={annotationTabHelpText}
                  active={this.state.activeTab === TabList.Annotations}
                  onClick={() => this.handleTabOnClick(TabList.Annotations)}
                  id="SE-guide-step-1"
                />
                <TabItem
                  title="Edit"
                  helpText={editTabHelpText}
                  active={this.state.activeTab === TabList.Edits}
                  onClick={() => this.handleTabOnClick(TabList.Edits)}
                  id="SE-guide-step-2"
                />
              </TabBar>

              <div style={{ height: '100%' }}>
                <Tags.EditPanelSec style={{ height: '100%' }}>
                  {/* this is annotations timeline */}
                  {this.state.activeTab === TabList.Annotations && (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                    className="t1"
                  >
                    <div style={{ paddingTop: '1rem' }}>
                      <div>
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                          <FocusBubble />
                          <Tags.AnimatedInfoText key="info">{helpText}</Tags.AnimatedInfoText>
                        </div>
                      </div>
                      <Tags.AnnotationBtnCtn>
                        {this.showCreateDefaultAnnButton() && (
                        <Tags.CreateNewAnnotationBtn
                          onClick={this.createDefaultAnnotation}
                        >
                          <img src={NewAnnotation} alt="new default annotation" />
                          New Guide Annotation
                        </Tags.CreateNewAnnotationBtn>)}
                        {!this.state.selectedAnnotationId && (
                        <Tags.CreateNewAnnotationBtn
                          id="cover-annotation-btn"
                          onClick={() => {
                            amplitudeNewAnnotationCreated(propertyCreatedFromWithType.COVER_ANN_BTN);
                            this.createNewCoverAnnotation();
                          }}
                        >
                          <img src={NewCoverAnnotation} alt="new default annotation" style={{ height: '57px !important', width: '57px' }} />
                          New Cover Annotation
                        </Tags.CreateNewAnnotationBtn>
                        )}
                      </Tags.AnnotationBtnCtn>
                    </div>
                    {this.props.showEntireTimeline && (
                      <Timeline
                        shouldShowScreenPicker={this.props.shouldShowScreenPicker}
                        timeline={this.props.timeline}
                        navigate={this.navigateToAnnotation}
                        screen={this.props.screen}
                        applyAnnButtonLinkMutations={this.props.applyAnnButtonLinkMutations}
                        allAnnotationsForTour={this.props.allAnnotationsForTour}
                        tourDataOpts={this.props.tourDataOpts}
                        setSelectedAnnotationId={(annId: string) => this.setState({ selectedAnnotationId: annId })}
                        resetSelectedAnnotationId={this.resetSelectedAnnotation}
                        selectedAnnotationId={this.state.selectedAnnotationId}
                        goToSelectionMode={this.goToSelectionMode}
                        setAlertMsg={this.props.setAlert}
                      >
                        <AnnotationCreatorPanel
                          setAlertMsg={this.props.setAlert}
                          opts={this.props.tourDataOpts}
                          selectedEl={this.state.selectedEl}
                          allAnnotationsForTour={this.props.allAnnotationsForTour}
                          screen={this.props.screen}
                          onAnnotationCreateOrChange={this.props.onAnnotationCreateOrChange}
                          config={configOfSelectedAnn!}
                          busy={!this.props.isScreenLoaded}
                          tour={this.props.tour}
                          applyAnnButtonLinkMutations={this.props.applyAnnButtonLinkMutations}
                          selectedHotspotEl={this.state.selectedHotspotEl}
                          selectedAnnReplaceEl={this.state.selectedAnnReplaceEl}
                          selectedAnnotationCoords={this.state.selectedAnnotationCoords}
                          setSelectionMode={(mode: 'annotation' | 'hotspot' | 'replace') => {
                            this.setState({ selectionMode: mode });
                          }}
                          domElPicker={this.iframeElManager}
                          onConfigChange={async (conf, actionType, opts) => {
                            if (actionType === 'upsert') {
                              this.setState({ selectedAnnotationId: conf.refId });
                            }
                            this.props.onAnnotationCreateOrChange(null, conf, actionType, opts);
                          }}
                          onDeleteAnnotation={this.resetSelectedAnnotation}
                          resetSelectedAnnotationElements={() => {
                            this.setState({ selectedAnnReplaceEl: null, selectedAnnotationCoords: null });
                          }}
                        />
                      </Timeline>
                    )}
                    {
                    !this.props.showEntireTimeline && this.props.toAnnotationId && configOfParamsAnnId && (
                      <TimelineTags.AnnotationLI
                        className="fable-li"
                        style={{
                          paddingBottom: '0.25rem',
                          opacity: 1,
                          width: '100%',
                          marginTop: '1rem',
                        }}
                      >
                        <TimelineTags.AnotCrtPanelSecLabel
                          className="fable-label"
                          style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}
                          onClick={() => {
                            if (this.state.selectedAnnotationId) {
                              this.resetSelectedAnnotation();
                              this.goToSelectionMode()();
                            } else {
                              this.setState({ selectedAnnotationId: this.props.toAnnotationId });
                            }
                          }}
                        >
                          <TimelineTags.AnnDisplayText>
                            <span className="steps">
                              {this.props.tourDataOpts.main.split('/')[1] === this.state.selectedAnnotationId && (
                              <Tooltip title="Tour starts here!" overlayStyle={{ fontSize: '0.75rem' }}>
                                <HomeOutlined style={{ background: 'none' }} />&nbsp;
                              </Tooltip>
                              )}
                              Step {configOfParamsAnnId.index}
                            </span>
                          </TimelineTags.AnnDisplayText>
                          {configOfParamsAnnId.syncPending && (<LoadingOutlined />)}
                          {
                            showAnnCreatorPanel ? (
                              <CaretOutlined dir="down" />
                            ) : (
                              <CaretOutlined dir="up" />
                            )
                          }
                        </TimelineTags.AnotCrtPanelSecLabel>
                        {
                           showAnnCreatorPanel && (
                           <AnnotationCreatorPanel
                             setAlertMsg={this.props.setAlert}
                             opts={this.props.tourDataOpts}
                             selectedEl={this.state.selectedEl}
                             busy={!this.props.isScreenLoaded}
                             allAnnotationsForTour={this.props.allAnnotationsForTour}
                             screen={this.props.screen}
                             onAnnotationCreateOrChange={this.props.onAnnotationCreateOrChange}
                             config={configOfParamsAnnId}
                             tour={this.props.tour}
                             applyAnnButtonLinkMutations={this.props.applyAnnButtonLinkMutations}
                             selectedHotspotEl={this.state.selectedHotspotEl}
                             selectedAnnReplaceEl={this.state.selectedAnnReplaceEl}
                             selectedAnnotationCoords={this.state.selectedAnnotationCoords}
                             setSelectionMode={(mode: 'annotation' | 'hotspot' | 'replace') => {
                               this.setState({ selectionMode: mode });
                             }}
                             domElPicker={this.iframeElManager}
                             onConfigChange={async (conf, actionType, opts) => {
                               if (actionType === 'upsert') {
                                 this.setState({ selectedAnnotationId: conf.refId });
                               }
                               this.props.onAnnotationCreateOrChange(null, conf, actionType, opts);
                             }}
                             onDeleteAnnotation={(deletedAnnRid: string) => {
                               this.props.onDeleteAnnotation && this.props.onDeleteAnnotation(deletedAnnRid);
                             }}
                             resetSelectedAnnotationElements={() => {
                               this.setState({ selectedAnnReplaceEl: null, selectedAnnotationCoords: null });
                             }}
                           />
                           )
                        }

                      </TimelineTags.AnnotationLI>
                    )
                  }
                  </div>
                  )}

                  {/* this is edits panel */}
                  {this.state.activeTab === TabList.Edits && (
                  <>
                    {this.props.screen.type === ScreenType.SerDom && (
                      <>
                        <FocusBubble />
                        <Tags.InfoText>
                          Click on an element to edit. Click again to reselect.
                        </Tags.InfoText>
                      </>
                    )}
                    {
                    this.props.screen.type === ScreenType.SerDom && (
                      <>
                        <Tags.ScreenResponsiveIpCon>
                          <GTags.Txt className="title" style={{ fontSize: '1rem' }}>Responsive Screen</GTags.Txt>
                          <Tags.StyledSwitch
                            style={{ backgroundColor: this.props.screen.responsive ? '#7567FF' : '#BDBDBD' }}
                            defaultChecked={this.props.screen.responsive}
                            onChange={(e) => this.props.updateScreen(this.props.screen, 'responsive', e)}
                          />
                        </Tags.ScreenResponsiveIpCon>
                        <Tags.InfoText>
                          A webpage can be made responsive for different viewport sizes by making
                          use of web technologies.
                          Turn this on to check if your application is made responsive.
                        </Tags.InfoText>
                      </>
                    )
                  }
                    {
                    this.props.screen.type === ScreenType.Img && (
                      <>
                        <Tags.ScreenResponsiveIpCon>
                          <GTags.Txt className="title" style={{ fontSize: '1rem' }}>Fit to screen</GTags.Txt>
                          <div style={{ padding: '0.3rem 0', display: 'flex', gap: '0.5rem' }}>
                            <label htmlFor="default">
                              <input
                                id="default"
                                type="radio"
                                checked={!this.props.screen.responsive}
                                onChange={(e) => {
                                  this.props.updateScreen(this.props.screen, 'responsive', false);
                                }}
                              />
                              Width
                            </label>

                            <label htmlFor="full-width">
                              <input
                                id="full-width"
                                type="radio"
                                checked={this.props.screen.responsive}
                                onChange={(e) => {
                                  this.props.updateScreen(this.props.screen, 'responsive', true);
                                }}
                              />
                              Height
                            </label>
                          </div>
                        </Tags.ScreenResponsiveIpCon>
                      </>
                    )
                  }
                    {
                    this.props.screen.type === ScreenType.SerDom && (
                      <>
                        <Tags.EditTabCon style={{ margin: '0 1rem 1rem 1rem' }}>
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
                    )
                  }
                  </>
                  )}
                </Tags.EditPanelSec>
              </div>
            </GTags.EditPanelCon>
          </div>
          <ImageMaskUploadModal
            open={this.state.showImageMaskUploadModal}
            onCancel={this.handleImageMaskUploadModalOnCancel}
            uploadImgMask={this.uploadImgMask}
            error={this.state.imageMaskUploadModalError}
            isUploading={this.state.imageMaskUploadModalIsUploading}
          />
        </GTags.PreviewAndActionCon>
        <SelectorComponent userGuides={userGuides} />
      </>
    );
  }

  highlightElementForPath(path: string): void {
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

  private onMouseOutOfIframe = (_: MouseEvent): void => {
    this.iframeElManager?.disable();
  };

  private onMouseEnterOnIframe = (_: MouseEvent): void => {
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

  private onKeyDownHandler = (e: KeyboardEvent): void => {
    this.onKeyDown()(e);
  };

  private goToSelectionMode = () => () => {
    // todo[now] repeated code with onKeyDown method
    if (this.iframeElManager) {
      if (this.iframeElManager.getMode() === HighlightMode.Pinned) {
        this.iframeElManager.getOutOfPinMode();
      } else {
        this.iframeElManager.setSelectionMode();
      }
    }
  };

  private addToMicroEdit<K extends keyof EditValueEncoding>(
    path: string,
    editType: K,
    edit: EditValueEncoding[K]
  ): void {
    if (!(path in this.microEdits)) {
      this.microEdits[path] = {};
    }
    const edits = this.microEdits[path];
    edits[editType] = edit;
  }

  private disposeDomPicker(): void {
    if (this.iframeElManager) {
      this.iframeElManager.dispose();
      this.iframeElManager = null;
    }
  }

  private onElSelect = (el: HTMLElement): void => {
    if (this.state.selectionMode === 'hotspot') {
      if (this.iframeElManager!.isElInBoundedEl(el)) {
        this.setState({ selectedHotspotEl: el, selectionMode: 'annotation' });
      }
      return;
    }

    if (this.state.selectionMode === 'replace') {
      this.setState({ selectedAnnReplaceEl: el, selectionMode: 'annotation' });
      return;
    }
    this.setState({ selectedEl: el });
  };

  private onElDeSelect = (_: HTMLElement): void => {
    this.flushMicroEdits();
    this.resetSelectedAnnotation();
    if (this.state.editItemSelected || this.state.targetEl) {
      this.resetSelectedEdits();
    }
  };

  private onBoxSelect = (coordsStr: string): void => {
    if (this.state.selectionMode === 'replace') {
      this.setState({ selectedAnnotationCoords: coordsStr, selectionMode: 'annotation' });
      return;
    }
    this.setState({ selectedCoords: coordsStr });
  };

  private onBoxDeSelect = (): void => {
    this.setState({ selectedAnnotationId: '', selectedCoords: '' });
  };

  private initDomPicker(nestedFrames: HTMLIFrameElement[]): void {
    const el = this.embedFrameRef?.current;

    const an = this.props.allAnnotationsForScreen.find(antn => antn.refId === this.props.toAnnotationId);
    const highlighterBaseConfig = {
      selectionColor: this.props.tourDataOpts.annotationSelectionColor,
      showOverlay: an?.showOverlay || true
    };

    let doc;
    if (doc = el?.contentDocument) {
      if (!this.iframeElManager) {
        if (this.props.screen.type === ScreenType.SerDom) {
          this.iframeElManager = new DomElPicker(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
          }, this.props.screen.type, highlighterBaseConfig);
          this.iframeElManager!.addEventListener('click', this.goToSelectionMode);
        }

        if (this.props.screen.type === ScreenType.Img) {
          this.iframeElManager = new ScreenImageBrusher(doc, nestedFrames, {
            onElSelect: this.onElSelect,
            onElDeSelect: this.onElDeSelect,
            onBoxSelect: this.onBoxSelect,
            onBoxDeSelect: this.onBoxDeSelect,
          }, this.props.screen.type, highlighterBaseConfig);
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
