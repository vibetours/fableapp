import { IAnnotationConfig, ITourDataOpts, ScreenData } from '@fable/common/dist/types';
import React from 'react';
import { ScreenType } from '@fable/common/dist/api-contract';
import { P_RespScreen } from '../../entity-processor';
import {
  AnnotationPerScreen,
  EditItem, ElEditType,
  EncodingTypeBlur,
  EncodingTypeDisplay,
  EncodingTypeImage,
  EncodingTypeMask,
  EncodingTypeText, FrameAssetLoadFn, IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  IdxEncodingTypeImage,
  IdxEncodingTypeMask,
  IdxEncodingTypeText,
  NavFn
} from '../../types';
import AnnotationLifecycleManager from '../annotation/lifecycle-manager';
import Preview from './preview';
import { scrollIframeEls } from './scroll-util';
import { hideChildren } from './utils/creator-actions';
import { isVideoAnnotation } from '../../utils';

export interface IOwnProps {
  screen: P_RespScreen;
  screenData: ScreenData;
  divPadding: number;
  navigate: NavFn;
  onBeforeFrameBodyDisplay: (params: { nestedFrames: HTMLIFrameElement[] }) => void;
  innerRef?: React.MutableRefObject<HTMLIFrameElement | null>;
  playMode: boolean;
  allAnnotationsForScreen: IAnnotationConfig[];
  tourDataOpts: ITourDataOpts;
  allEdits: EditItem[];
  toAnnotationId: string;
  hidden?: boolean;
  onFrameAssetLoad: FrameAssetLoadFn;
  allAnnotationsForTour: AnnotationPerScreen[];
}

interface IOwnStateProps {
}

export default class ScreenPreviewWithEditsAndAnnotationsReadonly
  extends React.PureComponent<IOwnProps, IOwnStateProps> {
  private static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private static readonly GF_FONT_FAMILY_LINK_ATTR = 'fable-data-gfi';

  private static readonly FONT_FAMILY_STYLE_EL_ID = 'fable-data-cfm';

  private annotationLCM: AnnotationLifecycleManager | null = null;

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
  }

  addFont = (): void => {
    const opts = this.props.tourDataOpts;
    const el = this.embedFrameRef?.current;

    const doc = el?.contentDocument;

    if (doc !== undefined && doc !== null) {
      if (opts.annotationFontFamily === null && this.props.screen.type === ScreenType.Img) {
        // apply default font for img type screen
        this.addFontLinkToHead(doc, 'IBM Plex Sans');
        if (!doc.getElementById(ScreenPreviewWithEditsAndAnnotationsReadonly.FONT_FAMILY_STYLE_EL_ID)) {
          const style = doc.createElement('style');
          style.setAttribute('id', ScreenPreviewWithEditsAndAnnotationsReadonly.FONT_FAMILY_STYLE_EL_ID);
          style.innerHTML = "body { font-family: 'IBM Plex Sans'; }";
          doc.head.appendChild(style);
        }
      }

      if (opts.annotationFontFamily !== null) {
        this.addFontLinkToHead(doc, opts.annotationFontFamily);
      }
    }
  };

  // eslint-disable-next-line class-methods-use-this
  private addFontLinkToHead = (doc: Document, annotationFontFamily: string): void => {
    const linkHref = `https://fonts.googleapis.com/css?family=${annotationFontFamily.replace(/\s+/g, '+')}`;

    const existingLinks = Array.from(doc.querySelectorAll(`link[${ScreenPreviewWithEditsAndAnnotationsReadonly.GF_FONT_FAMILY_LINK_ATTR}]`)) as HTMLLinkElement[];
    const hasExistingLink = existingLinks.some((link) => link.href === linkHref);
    if (hasExistingLink) return;

    existingLinks.forEach((link) => {
      link.remove();
    });

    const link = doc.createElement('link');
    link.href = linkHref;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.setAttribute(ScreenPreviewWithEditsAndAnnotationsReadonly.GF_FONT_FAMILY_LINK_ATTR, '');

    doc.head.appendChild(link);
  };

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }) => {
    this.initAnnotationLCM(params.nestedFrames);
    this.applyEdits(this.props.allEdits);
    this.addFont();
    this.props.onBeforeFrameBodyDisplay(params);
  };

  private applyEdits(allEdits: EditItem[]) {
    const ATTR_NAME = ScreenPreviewWithEditsAndAnnotationsReadonly.ATTR_ORIG_VAL_SAVE_ATTR_NAME;
    const mem: Record<string, Node> = {};
    const txtOrigValAttr = `${ATTR_NAME}-${ElEditType.Text}`;
    const imgOrigValAttr = `${ATTR_NAME}-${ElEditType.Image}`;
    const dispOrigValAttr = `${ATTR_NAME}-${ElEditType.Display}`;
    const blurOrigValAttr = `${ATTR_NAME}-${ElEditType.Blur}`;
    for (const edit of allEdits) {
      const path = edit[IdxEditItem.PATH];
      let el: Node;
      if (path in mem) el = mem[path];
      else {
        el = this.annotationLCM!.elFromPath(path) as HTMLElement;
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
        tEl.src = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE]!;
        tEl.srcset = imgEncodingVal[IdxEncodingTypeImage.NEW_VALUE]!;
        tEl.setAttribute(imgOrigValAttr, imgEncodingVal[IdxEncodingTypeImage.OLD_VALUE]);
        const originalStyleAttrs = tEl.getAttribute('style');
        tEl.setAttribute(
          'style',
          `${originalStyleAttrs || ''};
          height: ${imgEncodingVal[IdxEncodingTypeImage.HEIGHT]} !important; 
          width: ${imgEncodingVal[IdxEncodingTypeImage.WIDTH]} !important; 
          object-fit: cover !important;
          `
        );
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Blur) {
        const blurEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeBlur;
        const tEl = el as HTMLElement;
        tEl.setAttribute(blurOrigValAttr, blurEncodingVal[IdxEncodingTypeBlur.OLD_FILTER_VALUE]);
        tEl.style.filter = blurEncodingVal[IdxEncodingTypeBlur.NEW_FILTER_VALUE]!;
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Display) {
        const dispEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeDisplay;
        const tEl = el as HTMLElement;
        tEl.setAttribute(dispOrigValAttr, dispEncodingVal[IdxEncodingTypeDisplay.OLD_VALUE]);
        tEl.style.display = dispEncodingVal[IdxEncodingTypeDisplay.NEW_VALUE]!;
      }

      if (edit[IdxEditItem.TYPE] === ElEditType.Mask) {
        const maskEncodingVal = edit[IdxEditItem.ENCODING] as EncodingTypeMask;
        const tEl = el as HTMLElement;
        const maskStyled = maskEncodingVal[IdxEncodingTypeMask.NEW_STYLE]!;

        hideChildren(tEl);
        tEl.setAttribute('style', maskStyled);
      }
    }
  }

  onFrameAssetLoad = async () => {
    await scrollIframeEls(this.props.screenData.version, this.embedFrameRef.current?.contentDocument!);
    const foundAnnotation = this.reachAnnotation(this.props.toAnnotationId);
    this.props.onFrameAssetLoad({ foundAnnotation });
  };

  private initAnnotationLCM(nestedFrames: HTMLIFrameElement[]) {
    const an = this.props.allAnnotationsForScreen.find(antn => antn.refId === this.props.toAnnotationId);

    const highlighterBaseConfig = {
      selectionColor: this.props.tourDataOpts.annotationSelectionColor,
      showOverlay: an?.showOverlay || true
    };

    const el = this.embedFrameRef?.current;
    let doc;
    if (doc = el?.contentDocument) {
      if (!this.annotationLCM) {
        this.annotationLCM = new AnnotationLifecycleManager(
          doc,
          nestedFrames,
          {
            navigate: this.props.navigate,
            isPlayMode: this.props.playMode,
          },
          this.props.screen.type,
          this.props.allAnnotationsForTour,
          this.props.allAnnotationsForScreen,
          this.props.tourDataOpts,
          highlighterBaseConfig
        );
      }
    } else {
      throw new Error('Annoation document not found while initing annotationlcm');
    }
  }

  private disposeAndAnnotationLCM() {
    if (this.annotationLCM) {
      this.annotationLCM.dispose();
      this.annotationLCM = null;
    }
  }

  timer: number = 0;

  reachAnnotation(id: string): boolean {
    if (id) {
      const an = this.props.allAnnotationsForScreen.find(antn => antn.refId === id);
      if (an) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.showAnnotation(an, this.props.tourDataOpts);
          this.timer = 0;
        }) as unknown as number;
        return true;
      }
      return false;
    }
    this.annotationLCM?.hide();
    return false;
  }

  async showAnnotation(conf: IAnnotationConfig, opts: ITourDataOpts) {
    if (!this.annotationLCM) return;
    let targetEl = null;
    if (conf.type === 'cover') {
      targetEl = this.embedFrameRef?.current?.contentDocument?.body!;
    } else if (this.props.screen.type === ScreenType.Img) {
      targetEl = this.embedFrameRef?.current?.contentDocument?.body.querySelector('img')!;
    } else {
      targetEl = this.annotationLCM.elFromPath(conf.id);
    }
    this.annotationLCM!.show();
    await this.annotationLCM!.addOrReplaceAnnotation(
      targetEl as HTMLElement,
      conf,
      opts,
      true,

    );
  }

  async componentDidUpdate(prevProps: IOwnProps) {
    if (this.props.playMode) {
      // In player, stop useless rerender leading to flashing
      if (this.props.toAnnotationId && prevProps.toAnnotationId !== this.props.toAnnotationId) {
        this.reachAnnotation(this.props.toAnnotationId);
      }
      if (prevProps.toAnnotationId && !this.props.toAnnotationId) {
        this.annotationLCM?.hide();
      }
    } else {
      // In creator mode we need this so that the annotation is updated with config change from creator panel
      this.reachAnnotation(this.props.toAnnotationId);
    }

    const opts = this.props.tourDataOpts;
    const prevOpts = prevProps.tourDataOpts;
    if (prevOpts.annotationFontFamily !== opts.annotationFontFamily) {
      this.addFont();
    }
  }

  componentWillUnmount(): void {
    clearTimeout(this.timer);
    this.timer = 0;
    this.disposeAndAnnotationLCM();
  }

  render() {
    const refs = [this.embedFrameRef];
    if (this.props.innerRef) {
      refs.push(this.props.innerRef);
    }
    return <Preview
      key={this.props.screen.rid}
      hidden={this.props.hidden}
      screen={this.props.screen}
      screenData={this.props.screenData}
      divPadding={this.props.divPadding}
      innerRefs={refs}
      onBeforeFrameBodyDisplay={this.onBeforeFrameBodyDisplay}
      onFrameAssetLoad={this.onFrameAssetLoad}
      isScreenPreview={false}
    />;
  }
}
