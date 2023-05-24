import {
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  LoadingOutlined,
  PictureOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { IAnnotationConfig, ITourDataOpts, ScreenData, TourData, TourScreenEntity } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import Switch from 'antd/lib/switch';
import React from 'react';
import Modal from 'antd/lib/modal';
import Collapse from 'antd/lib/collapse';
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
  NavFn
} from '../../types';
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

const { confirm } = Modal;
const { Panel } = Collapse;

const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Mixed = 'm',
  None = 'n',
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

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
  tourData: TourData;
  currentTour: P_RespTour | null;
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
  currentScreenAnnotations: IAnnotationConfig[];
  prevScreen: P_RespScreen | null;
  nextScreen: P_RespScreen | null;
  prevAnn: string | null;
  nextAnn: string | null;
}

interface IAnnotationConfigWithScreenId extends IAnnotationConfig {
  screenId?: string;
}

interface AnnotationGroup {
  screenId: number;
  annotations: IAnnotationConfigWithScreenId[]
}

export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private readonly frameConRef: React.MutableRefObject<HTMLDivElement | null>;

  private domElPicker: DomElPicker | null = null;

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
      currentScreenAnnotations: [],
      prevScreen: null,
      nextScreen: null,
      prevAnn: null,
      nextAnn: null,
    };
  }

  getBoundaryAnnotations = () => {
    const anns = this.props.allAnnotationsForScreen;

    let first: IAnnotationConfig | null = null;
    let last: IAnnotationConfig | null = null;

    for (let i = 0; i < anns.length; i++) {
      const config = anns[i];
      const prevBtn = config.buttons.filter((btn) => btn.type === 'prev')[0];

      if (!prevBtn.hotspot) {
        first = config;
      } else {
        const prevScreenId = +prevBtn.hotspot.actionValue.split('/')[0];
        if (prevScreenId !== this.props.screen.id) {
          first = config;
        }
      }

      const nextBtn = config.buttons.filter((btn) => btn.type === 'next')[0];

      if (!nextBtn.hotspot) {
        last = config;
      } else if (nextBtn.hotspot.actionType === 'open') {
        last = config;
      } else {
        last = config;
      }
    }

    return [first, last];
  };

  // eslint-disable-next-line class-methods-use-this
  getNextScreenAnnQId = (lastAnnOfCurrScreen: IAnnotationConfig) => {
    const nextBtn = lastAnnOfCurrScreen.buttons.filter((btn) => btn.type === 'next')[0];

    if (!nextBtn.hotspot) {
      return null;
    }

    if (nextBtn.hotspot.actionType === 'open') {
      return null;
    }

    return nextBtn.hotspot.actionValue;
  };

  getCurrentScreenAnnotations = () => {
    const [firstAnn, lastAnn] = this.getBoundaryAnnotations();

    if (!firstAnn || !lastAnn) {
      return [];
    }

    const firstAnnPtr = `${this.props.screen.id}/${firstAnn.refId}`;
    const nextScreenAnnQId = this.getNextScreenAnnQId(lastAnn);

    let curr: string | null = firstAnnPtr || null;

    const annotations = [];
    while (curr !== null && curr !== nextScreenAnnQId) {
      const [screenId, refId] = curr!.split('/');
      const annConfig = Object.values((this.props.tourData.entities[screenId] as TourScreenEntity).annotations)
        .find(val => val.refId === refId)!;
      annotations.push({ ...remoteToLocalAnnotationConfig(annConfig), screenId });
      const configHotspot = annConfig.buttons.find(btn => btn.type === 'next')!.hotspot;
      if (!configHotspot) {
        curr = null;
      } else if (configHotspot.actionType === 'open') {
        curr = null;
      } else {
        curr = configHotspot.actionValue;
      }
    }

    return annotations;
  };

  getPrevScreen = (currentScreenAnnotations: IAnnotationConfig[]) => {
    const prevScreenId = currentScreenAnnotations[0].buttons
      .find(btn => btn.type === 'prev')?.hotspot?.actionValue.split('/')[0] || '';

    return this.props.currentTour?.screens?.find(screen => screen.id === +prevScreenId);
  };

  getNextScreen = (currentScreenAnnotations: IAnnotationConfig[]) => {
    const nextScreenId = currentScreenAnnotations[currentScreenAnnotations.length - 1].buttons
      .find(btn => btn.type === 'next')?.hotspot?.actionValue.split('/')[0] || '';

    return this.props.currentTour?.screens?.find(screen => screen.id === +nextScreenId);
  };

  // eslint-disable-next-line class-methods-use-this
  getPrevAnn = (currentScreenAnnotations: IAnnotationConfig[]) => {
    const ann = currentScreenAnnotations[0].buttons
      .find(btn => btn.type === 'prev')?.hotspot?.actionValue.split('/')[1] || null;
    return ann;
  };

  // eslint-disable-next-line class-methods-use-this
  getNextAnn = (currentScreenAnnotations: IAnnotationConfig[]) => {
    const ann = currentScreenAnnotations[currentScreenAnnotations.length - 1].buttons
      .find(btn => btn.type === 'next')?.hotspot?.actionValue.split('/')[1] || null;
    return ann;
  };

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

    const path = this.domElPicker!.elPath(imgEl);
    const attrName = `${ScreenEditor.ATTR_ORIG_VAL_SAVE_ATTR_NAME}-${ElEditType.Image}`;
    let origVal = imgEl.getAttribute(attrName);
    if (origVal === null) {
      origVal = originalImgSrc || '';
      imgEl.setAttribute(attrName, origVal);
    }
    this.addToMicroEdit(path, ElEditType.Image, [getCurrentUtcUnixTime(), origVal, newImageUrl, dimH, dimW]);
  };

  componentWillUnmount(): void {
    this.disposeDomPicker();
    document.removeEventListener('keydown', this.onKeyDown);
    if (this.frameConRef.current) {
      this.frameConRef.current.removeEventListener('click', this.goToSelectionMode);
    }
  }

  componentDidMount(): void {
    if (this.frameConRef.current) {
      this.frameConRef.current.addEventListener('click', this.goToSelectionMode);
    }
    document.addEventListener('keydown', this.onKeyDown);

    // if we go to a screen, create a new tour from there
    if (!this.props.toAnnotationId && !this.props.tourData.entities[this.props.screen.id]) {
      return;
    }

    const currentScreenAnnotations = this.getCurrentScreenAnnotations() as IAnnotationConfig[];
    if (currentScreenAnnotations.length === 0) {
      this.setState({
        selectedAnnotationId: this.props.toAnnotationId,
      });
      return;
    }
    const prevScreen = this.getPrevScreen(currentScreenAnnotations) || null;
    const nextScreen = this.getNextScreen(currentScreenAnnotations) || null;

    const prevAnn = this.getPrevAnn(currentScreenAnnotations) || null;
    const nextAnn = this.getNextAnn(currentScreenAnnotations) || null;

    this.setState({
      selectedAnnotationId: this.props.toAnnotationId,
      currentScreenAnnotations,
      prevScreen,
      nextScreen,
      prevAnn,
      nextAnn,
    });
  }

  async componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>) {
    if (prevProps.screen.id !== this.props.screen.id || prevProps.tourData !== this.props.tourData) {
      const currentScreenAnnotations = this.getCurrentScreenAnnotations() as IAnnotationConfig[];

      if (this.props.toAnnotationId && this.props.tourData.entities[this.props.screen.id]) {
        if (currentScreenAnnotations.length === 0) {
          this.setState({
            selectedAnnotationId: this.props.toAnnotationId,
          });
        } else {
          const prevScreen = this.getPrevScreen(currentScreenAnnotations) || null;
          const nextScreen = this.getNextScreen(currentScreenAnnotations) || null;
          this.setState({ currentScreenAnnotations, prevScreen, nextScreen });
        }
      }
    }

    if (prevProps.toAnnotationId !== this.props.toAnnotationId) {
      this.setState({ selectedAnnotationId: this.props.toAnnotationId });
    }

    if (prevState.isInElSelectionMode !== this.state.isInElSelectionMode) {
      if (this.state.isInElSelectionMode) {
        this.props.onScreenEditStart();
        this.domElPicker?.enable();
      } else {
        this.domElPicker?.disable();
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
            conf = getSampleConfig(this.domElPicker!.elPath(state.selectedEl!));
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
    const path = this.domElPicker?.elPath(el);
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
      this.domElPicker?.selectElement(this.getIframeBody(), HighlightMode.Pinned, true);
    } else {
      const path = this.getAnnotationPathFromRefId(this.state.selectedAnnotationId);
      if (path) {
        const el = this.domElPicker?.elFromPath(path) as HTMLElement | null;
        if (el) {
          this.domElPicker?.selectElement(el, HighlightMode.Pinned, true);
        }
      }
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
              const path = this.domElPicker!.elPath(refEl);
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
              const path = this.domElPicker!.elPath(refEl);
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
                  const path = this.domElPicker!.elPath(refEl);
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

  downArrow = () => <img src={ExpandIcon} width={12} height={6} />;

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
          <Collapse
            style={{
              margin: '1.5rem',
              background: 'none',
              border: '1px solid #E8E8E8',
            }}
            expandIconPosition="end"
            expandIcon={() => this.downArrow()}
          >

            <Panel
              header="Advanced element picker"
              key="1"
              style={{
                fontSize: '14px',
                lineHeight: '20px',
                fontWeight: 400,
                borderWidth: 0
              }}
            >
              {this.state.selectedEl ? (
                <AdvanceElementPicker
                  elements={this.state.selectedElsParents}
                  domElPicker={this.domElPicker}
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
                        const replaceWithAnn = cloneAnnotation(this.domElPicker?.elPath(newSelEl)!, annOnOldEl);
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
                : <p>Please select an element</p>}
            </Panel>

          </Collapse>

          {/* this is top menu */}
          <TabBar>
            <TabItem
              title="Annotations"
              active={this.state.activeTab === TabList.Annotations}
              onClick={() => this.handleTabOnClick(TabList.Annotations)}
            />
            <TabItem
              title="Edit"
              active={this.state.activeTab === TabList.Edits}
              onClick={() => this.handleTabOnClick(TabList.Edits)}
            />
          </TabBar>

          <div style={{}}>
            <Tags.EditPanelSec>
              {/* this is annotations timeline */}
              {this.state.activeTab === TabList.Annotations && (
                <div>
                  <Tags.InfoText>
                    Annotations are guide to your product mean to get your user acquiented with your product.
                  </Tags.InfoText>
                  <Tags.CreateCoverAnnotationBtn onClick={() => { this.createCoverAnnotation(); }}>
                    Create cover annotation
                  </Tags.CreateCoverAnnotationBtn>
                  <Tags.AnnTimelineCon>
                    {this.state.prevScreen
                      && <TimelineScreen
                        navigate={this.navigateToAnnotation}
                        isLastScreen={false}
                        screen={this.state.prevScreen}
                        annotationId={this.state.prevAnn}
                      />}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {this.state.currentScreenAnnotations.map((config, idx) => (
                        <Tags.AnnotationLI
                          key={config.refId}
                        >
                          <Tags.AnotCrtPanelSecLabel
                            style={{ display: 'flex' }}
                            onClick={() => {
                              if (this.state.selectedAnnotationId === config.refId) {
                                this.setState({ selectedAnnotationId: '', selectedEl: null });
                                this.goToSelectionMode();
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
                            <div style={{ color: 'black', marginTop: '1rem' }}>
                              <AnnotationCreatorPanel
                                config={config}
                                opts={this.props.tourDataOpts}
                                allAnnotationsForTour={this.props.allAnnotationsForTour}
                                screen={this.props.screen}
                                selectedHotspotEl={this.state.selectedHotspotEl}
                                setSelectionMode={(mode: 'annotation' | 'hotspot') => {
                                  this.setState({ selectionMode: mode });
                                }}
                                domElPicker={this.domElPicker}
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
                          {idx < this.state.currentScreenAnnotations.length - 1 && <Tags.VerticalBar />}
                        </Tags.AnnotationLI>
                      ))}
                    </div>

                    {this.state.nextScreen
                      && <TimelineScreen
                        navigate={this.navigateToAnnotation}
                        isLastScreen
                        screen={this.state.nextScreen}
                        annotationId={this.state.nextAnn}
                      />}
                  </Tags.AnnTimelineCon>
                </div>
              )}

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
    const el = this.domElPicker!.elFromPath(path) as HTMLElement;
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

  private onMouseOutOfIframe = (_: MouseEvent) => {
    this.domElPicker?.disable();
  };

  private onMouseEnterOnIframe = (_: MouseEvent) => {
    this.state.isInElSelectionMode && this.domElPicker?.enable();
  };

  private onKeyDown = () => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // TODO handle pin mode and annotation selection
      if (this.domElPicker && this.domElPicker.getMode() === HighlightMode.Pinned) {
        this.domElPicker.getOutOfPinMode();
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

  private goToSelectionMode = () => () => {
    // todo[now] repeated code with onKeyDown method
    if (this.domElPicker && this.domElPicker.getMode() === HighlightMode.Pinned) {
      this.domElPicker.getOutOfPinMode();
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

  private onElSelect = (el: HTMLElement, parents: Node[]) => {
    this.domElPicker!.elPath(el);

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

  private initDomPicker(nestedFrames: HTMLIFrameElement[]) {
    const el = this.embedFrameRef?.current;
    let doc;
    if (doc = el?.contentDocument) {
      if (!this.domElPicker) {
        this.domElPicker = new DomElPicker(doc, nestedFrames, {
          onElSelect: this.onElSelect,
          onElDeSelect: this.onElDeSelect,
        });
        this.domElPicker.addEventListener('keydown', this.onKeyDown);
        this.domElPicker.addEventListener('click', this.goToSelectionMode);
        this.domElPicker.setupHighlighting();

        el.addEventListener('mouseout', this.onMouseOutOfIframe);
        el.addEventListener('mouseenter', this.onMouseEnterOnIframe);
        this.selectElementIfAnnoted();
      }
    } else {
      throw new Error("Can't init dompicker as iframe document is null");
    }
  }
}
