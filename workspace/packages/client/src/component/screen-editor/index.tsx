import {
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  LoadingOutlined,
  PictureOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { detect } from '@fable/common/dist/detect-browser';
import { IAnnotationConfig, ITourDataOpts, ScreenData } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import Switch from 'antd/lib/switch';
import React from 'react';
import Modal from 'antd/lib/modal';
import Collapse from 'antd/lib/collapse';
import * as GTags from '../../common-styled';
import { P_RespScreen } from '../../entity-processor';
import { uploadImgToAws } from './utils/upload-img-to-aws';
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
import Btn from '../btn';
import AnnotationCreatorPanel from './annotation-creator-panel';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import PreviewWithEditsAndAnRO from './preview-with-edits-and-annotations-readonly';
import * as Tags from './styled';
import emptyEditAnnIllustration from '../../assets/empty-edit-ann.svg';
import AdvanceElementPicker from './advance-element.picker';
import TabBar from './components/tab-bar';
import TabItem from './components/tab-bar/tab-item';

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
    this.setState({ selectedAnnotationId: this.props.toAnnotationId });
  }

  async componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<IOwnStateProps>) {
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

          <div style={{ }}>
            <Tags.EditPanelSec>
              {/* this is advanced element picker */}
              {this.state.selectedEl && this.domElPicker?.getMode() === HighlightMode.Pinned && (
                <Collapse
                  bordered={false}
                  style={{
                    marginBottom: '1rem',
                  }}
                >
                  <Panel
                    header="Advanced element picker"
                    key="1"
                    style={{
                      fontSize: '14px',
                      margin: 0,
                      padding: 0
                    }}
                  >
                    <AdvanceElementPicker
                      elements={this.state.selectedElsParents}
                      domElPicker={this.domElPicker}
                      selectedEl={this.state.selectedEl}
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
                  </Panel>
                </Collapse>
              )}
              {/* this is info and create cover annotation button */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <GTags.Txt className="title">Edit Screen {this.state.selectedEl ? '' : 'or Add annotations'}</GTags.Txt>
              </div>
              <div
                style={{
                  justifyContent: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  marginBottom: '1rem'
                }}
              >
                {this.state.isInElSelectionMode && (
                  <>
                    {(this.getAnnotationTypeFromRefId(this.state.selectedAnnotationId) === 'cover'
                      || this.state.selectedEl !== null) && (
                        <div>
                          <GTags.Txt className="subhead">
                            You are now editing the selected element. Press <span className="kb-key">Esc</span> or {' '}
                            click outside to complete editing.
                          </GTags.Txt>
                        </div>
                    )}
                    {
                      (this.state.selectedEl === null && this.state.selectedAnnotationId === '') && (
                        <>
                          <img
                            style={{ margin: '1rem' }}
                            src={emptyEditAnnIllustration}
                            alt="empty state edit annotations"
                          />
                          <GTags.Txt className="subhead">
                            Click an element in the screen to see the edit options or to add annotations.
                          </GTags.Txt>
                          <Tags.CreateCoverAnnotationBtn
                            onClick={() => { this.createCoverAnnotation(); }}
                          >
                            Create cover annotation
                          </Tags.CreateCoverAnnotationBtn>
                        </>
                      )
                    }

                  </>
                )}
                {this.getEditingCtrlForElType(this.state.editTargetType)}
              </div>

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
            </Tags.EditPanelSec>

            {/* this is add an annotation section */}
            {this.state.selectedEl && this.state.elSelRequestedBy !== ElSelReqType.AnnotateEl && (
              <Tags.EditPanelSec>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    marginBottom: '1.25rem',
                  }}
                >
                  <GTags.Txt className="title">Add an annotation</GTags.Txt>
                  <GTags.Txt className="subhead" style={{ marginBottom: '1rem' }}>
                    Annotations are guide to your product mean to get your user acquiented with your product.
                  </GTags.Txt>
                  <Btn
                    icon="plus"
                    onClick={() => this.setState({ elSelRequestedBy: ElSelReqType.AnnotateEl })}
                    type="primary"
                  >
                    Add an annotation
                  </Btn>
                </div>
              </Tags.EditPanelSec>
            )}

            {/* this lists down all the annotation applied on page */}
            {this.props.allAnnotationsForScreen.length > 0 && (
              <Tags.EditPanelSec>
                <GTags.Txt className="title2">Annotations applied on page</GTags.Txt>
                {this.props.screen.parentScreenId !== 0
                  && this.props.allAnnotationsForScreen.map(config => (
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

                        <GTags.Txt className="title2 oneline" style={{ marginRight: '1rem' }}>
                          {config.displayText}
                        </GTags.Txt>
                        {
                          config.syncPending && (<LoadingOutlined />)
                        }
                        {
                          this.state.selectedAnnotationId === config.refId
                            ? <DownOutlined style={{ fontSize: '0.8rem', color: '#16023E' }} />
                            : <RightOutlined style={{ fontSize: '0.8rem', color: '#16023E' }} />
                        }
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
                    </Tags.AnnotationLI>
                  ))}
              </Tags.EditPanelSec>
            )}
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
