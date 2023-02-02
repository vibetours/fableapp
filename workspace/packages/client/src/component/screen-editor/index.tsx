import {
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  FontSizeOutlined,
  LoadingOutlined,
  PictureOutlined,
  RightOutlined
} from '@ant-design/icons';
import api from '@fable/common/dist/api';
import { ApiResp, ResponseStatus, RespUploadUrl } from '@fable/common/dist/api-contract';
import { detect } from '@fable/common/dist/detect-browser';
import { IAnnotationConfig, ITourDataOpts, ScreenData } from '@fable/common/dist/types';
import { getCurrentUtcUnixTime } from '@fable/common/dist/utils';
import Switch from 'antd/lib/switch';
import React from 'react';
import * as GTags from '../../common-styled';
import { P_RespScreen } from '../../entity-processor';
import {
  AllEdits,
  AnnotationPerScreen,
  EditItem,
  EditValueEncoding,
  ElEditType,
  IdxEditEncodingText,
  IdxEditItem,
  NavFn
} from '../../types';
import { getDefaultTourOpts, getSampleConfig } from '../annotation/annotation-config-utils';
import Btn from '../btn';
import AnnotationCreatorPanel from './annotation-creator-panel';
import DomElPicker, { HighlightMode } from './dom-element-picker';
import PreviewWithEditsAndAnRO from './preview-with-edits-and-annotations-readonly';
import * as Tags from './styled';

const browser = detect();

const enum EditTargetType {
  Text = 't',
  Img = 'i',
  Mixed = 'm',
  None = 'n',
}
type EditTargets = Record<string, Array<HTMLElement | Text | HTMLImageElement>>;

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
  selectedAnnotationId: string;
  targetEl: HTMLElement | null;
  editTargetType: EditTargetType;
  editItemSelected: string;
}

export default class ScreenEditor extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private domElPicker: DomElPicker | null = null;

  private microEdits: AllEdits<ElEditType>;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.microEdits = {};
    this.state = {
      isInElSelectionMode: false,
      elSelRequestedBy: ElSelReqType.NA,
      selectedEl: null,
      targetEl: null,
      editTargetType: EditTargetType.None,
      editItemSelected: '',
      selectedAnnotationId: ''
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
    const awsSignedUrl = await ScreenEditor.getImageUploadUrl(selectedImage.type);
    if (!awsSignedUrl) {
      //  TODO[error-handling] show error to user that something has gone wrong, try again later
      return;
    }
    const newImageUrl = await ScreenEditor.uploadImageAsBinary(selectedImage, awsSignedUrl);
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
    this.disposeDomPickerAndAnnotationLCM();
    document.removeEventListener('keydown', this.onKeyDown);
  }

  componentDidMount(): void {
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
        elJustSelected = true;
        const editTargetType = ScreenEditor.getEditTargetType(this.state.selectedEl);
        this.setState((state) => ({
          editTargetType: editTargetType.targetType,
          targetEl: editTargetType.target || state.selectedEl,
          selectedAnnotationId: this.getAnnotatonIdForEl(state.selectedEl!)
        }));
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
      // If elment is already selected and user just clicked on the "Add an annotaiton" button after
      // the element is slected. This happens when user clicks on "Edit an element" first >> select
      // the element >> click on "Add an annotaiton" button
    ) || (
      elJustSelected
        && this.state.elSelRequestedBy === ElSelReqType.AnnotateEl
        // this happens when user clicks on "Add an annotation" first
    )) {
      this.setState(state => {
        const path = this.domElPicker?.elPath(state.selectedEl!);
        const existingAnnotaiton = this.props.allAnnotationsForScreen.filter(an => an.id === path);
        let conf: IAnnotationConfig;
        let opts: ITourDataOpts;
        if (existingAnnotaiton.length) {
          conf = existingAnnotaiton[0];
          opts = this.props.tourDataOpts;
          // this.showAnnotation(conf, opts);
        } else {
          conf = getSampleConfig(this.domElPicker!.elPath(state.selectedEl!));
          opts = this.props.tourDataOpts || getDefaultTourOpts();
          this.props.createDefaultAnnotation(
            conf,
            opts
          );
        }
        return { selectedAnnotationId: conf.refId };
      });
    }
  }

  getAnnotatonIdForEl(el: HTMLElement): string {
    const path = this.domElPicker?.elPath(el);
    const an = this.props.allAnnotationsForScreen.filter(a => a.id === path);
    return an.length >= 1 ? an[0].refId : '';
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

  onBeforeFrameBodyDisplay = () => {
    this.initDomPicker();
  };

  render(): React.ReactNode {
    return (
      <GTags.PreviewAndActionCon>
        <GTags.EmbedCon style={{ overflow: 'hidden', position: 'relative' }}>
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
          />
        </GTags.EmbedCon>
        <GTags.EditPanelCon style={{ overflowY: 'auto' }}>
          <Tags.EditPanelSec>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '1.25rem',
              }}
            >
              <GTags.Txt className="title">Edit Screen {this.state.selectedEl ? '' : 'or Add annotations'}</GTags.Txt>
            </div>
            <div
              style={{
                justifyContent: 'center',
                display: 'flex',
                flexDirection: 'column',
                marginBottom: '1.75rem',
              }}
            >
              {!this.state.isInElSelectionMode ? (
                <>
                  <GTags.Txt className="subhead" style={{ margin: '0rem 0 .5rem' }}>
                    You can edit the screen by changing text, uploading new images, hiding or blurring elements etc
                  </GTags.Txt>
                  <Btn
                    icon="edit"
                    type="link"
                    onClick={() => this.setState({ isInElSelectionMode: true, elSelRequestedBy: ElSelReqType.EditEl })}
                  >
                    Start Editing
                  </Btn>
                  <GTags.Txt className="subhead" style={{ margin: '1.5rem 0 .5rem' }}>
                    You can add annotation to an element to start creating a guided tour of your product
                  </GTags.Txt>
                  <Btn
                    type="primary"
                    icon="plus"
                    onClick={() => this.setState({
                      isInElSelectionMode: true,
                      elSelRequestedBy: ElSelReqType.AnnotateEl,
                    })}
                  >
                    Add an annotation
                  </Btn>
                </>
              ) : (
                <>
                  {this.state.selectedEl === null ? (
                    <GTags.Txt className="subhead">
                      {this.state.elSelRequestedBy === ElSelReqType.EditEl
                        ? 'Click an element in the screen to see the edit options.\n'
                        : 'Click an element in the screen to add annotations.'}
                      Press <span className="kb-key">Esc</span> to exit from edit mode.
                    </GTags.Txt>
                  ) : (

                    <GTags.Txt className="subhead">
                      You are now editing the selected element. Press <span className="kb-key">Esc</span> to complete
                      editing.
                    </GTags.Txt>
                  )}
                </>
              )}
              {this.getEditingCtrlForElType(this.state.editTargetType)}
            </div>
            {this.props.screen.parentScreenId !== 0
              && this.props.allEdits
                .map((e) => (
                  <Tags.EditLIPCon
                    key={e[IdxEditItem.KEY]}
                    onClick={((edit) => () => {
                      this.setState({
                        editItemSelected: e[IdxEditItem.KEY],
                        isInElSelectionMode: true,
                        elSelRequestedBy: ElSelReqType.EditEl,
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
                <Btn icon="plus" onClick={() => this.setState({ elSelRequestedBy: ElSelReqType.AnnotateEl })}>
                  Add an annotation
                </Btn>
              </div>
            </Tags.EditPanelSec>
          )}
          {this.props.allAnnotationsForScreen.length > 0 && (
            <Tags.EditPanelSec>
              <GTags.Txt>Annotations applied on page</GTags.Txt>
              {this.props.screen.parentScreenId !== 0
                && this.props.allAnnotationsForScreen.map(config => (
                  <Tags.AnnotationLI
                    key={config.id}
                  >
                    <Tags.AnotCrtPanelSecLabel
                      style={{ display: 'flex' }}
                      onClick={() => {
                        if (this.state.selectedAnnotationId === config.refId) {
                          this.setState({ selectedAnnotationId: '' });
                        } else {
                          this.setState({ selectedAnnotationId: config.refId });
                        }
                      }}
                    >

                      <GTags.Txt className="title2 oneline" style={{ marginRight: '1rem' }}>
                        {config.bodyContent}
                      </GTags.Txt>
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
                          onSideEffectConfigChange={(screenId: number, c: IAnnotationConfig) => {
                            this.props.onAnnotationCreateOrChange(screenId, c, null);
                          }}
                          onConfigChange={async (conf, opts) => {
                            this.props.onAnnotationCreateOrChange(null, conf, opts);
                            this.setState({ selectedAnnotationId: conf.refId });
                          }}
                        />
                      </div>
                    )}
                  </Tags.AnnotationLI>
                ))}
            </Tags.EditPanelSec>
          )}
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

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      // TODO handle pin mode and annotation selection
      if (this.domElPicker && this.domElPicker.getMode() === HighlightMode.Pinned) {
        this.domElPicker.getOutOfPinMode();
        this.setState({ elSelRequestedBy: ElSelReqType.NA });
      } else {
        this.setState({ isInElSelectionMode: false, elSelRequestedBy: ElSelReqType.NA });
      }
      this.setState({ selectedAnnotationId: '' });

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

  private disposeDomPickerAndAnnotationLCM() {
    this.embedFrameRef?.current!.removeEventListener('mouseout', this.onMouseOutOfIframe);
    this.embedFrameRef?.current!.removeEventListener('mouseenter', this.onMouseEnterOnIframe);
    if (this.domElPicker) {
      this.domElPicker.dispose();
      this.domElPicker = null;
    }
  }

  private onElSelect = (el: HTMLElement, _doc: Document) => {
    this.domElPicker!.elPath(el);
    this.setState({ selectedEl: el });
  };

  private onElDeSelect = (_: HTMLElement) => {
    this.flushMicroEdits();
    this.setState({ selectedEl: null });
  };

  private initDomPicker() {
    const el = this.embedFrameRef?.current;
    let doc;
    if (doc = el?.contentDocument) {
      if (!this.domElPicker) {
        this.domElPicker = new DomElPicker(doc, {
          onElSelect: this.onElSelect,
          onElDeSelect: this.onElDeSelect,
        });
        this.domElPicker.addEventListener('keydown', this.onKeyDown);
        this.domElPicker.setupHighlighting();

        el.addEventListener('mouseout', this.onMouseOutOfIframe);
        el.addEventListener('mouseenter', this.onMouseEnterOnIframe);
      }
    } else {
      throw new Error("Can't init dompicker as iframe document is null");
    }
  }
}
