import { EditFile, IAnnotationConfig, ITourDataOpts, ScreenData } from '@fable/common/dist/types';
import React from 'react';
import { ScreenType } from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';
import { P_RespScreen, P_RespTour, convertEditsToLineItems } from '../../entity-processor';
import {
  AllEdits,
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
import { AnnotationSerialIdMap, getAnnotationBtn, getAnnotationByRefId } from '../annotation/ops';
import { isVideoAnnotation } from '../../utils';
import { deser } from './utils/deser';
import { getAddDiffs, getDelDiffs, getReorderDiffs, getReplaceDiffs, getUpdateDiffs } from './utils/diffs/get-diffs';
import {
  applyAddDiffsToSerDom,
  applyDelDiffsToSerDom,
  applyReplaceDiffsToSerDom,
  applyUpdateDiffsToSerDom
} from './utils/diffs/apply-diffs-to-serdom';
import { applyFadeInTransitionToNode } from './utils/diffs/utils';
import { AddDiff, DelDiff, ReorderDiff, ReplaceDiff, ToBeUpdatedNode, UpdateDiff } from './utils/diffs/types';
import { showOrHideEditsFromEl } from './utils/edits';
import { playVideoAnn } from '../annotation/utils';
import { SCREEN_DIFFS_SUPPORTED_VERSION } from '../../constants';

export interface IOwnProps {
  annotationSerialIdMap: AnnotationSerialIdMap;
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
  tour: P_RespTour;
  allScreensData?: Record<string, ScreenData>;
  allScreens?: P_RespScreen[];
  editsAcrossScreens?: Record<string, EditItem[]>;
  preRenderNextScreen?: (rid: string) => void;
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

  private frameLoadingPromises: Promise<unknown>[] = [];

  private assetLoadingPromises: Promise<unknown>[] = [];

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

    const existingLinks = Array.from(
      doc.querySelectorAll(`link[${ScreenPreviewWithEditsAndAnnotationsReadonly.GF_FONT_FAMILY_LINK_ATTR}]`)
    ) as HTMLLinkElement[];
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

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }): void => {
    this.initAnnotationLCM(params.nestedFrames);
    this.applyEdits(this.props.allEdits);
    this.addFont();
    this.props.onBeforeFrameBodyDisplay(params);
  };

  private applyEdits(allEdits: EditItem[]): void {
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

  private removeEdits(allEdits: EditItem[]): void {
    const mem: Record<string, Node> = {};
    for (const edit of allEdits) {
      const path = edit[IdxEditItem.PATH];
      let el: Node;
      if (path in mem) el = mem[path];
      else {
        el = this.annotationLCM!.elFromPath(path) as HTMLElement;
        mem[path] = el;
      }

      showOrHideEditsFromEl(edit, false, el as HTMLElement);
    }
  }

  onFrameAssetLoad = async (): Promise<void> => {
    await scrollIframeEls(this.props.screenData.version, this.embedFrameRef.current?.contentDocument!);
    const foundAnnotation = this.reachAnnotation(this.props.toAnnotationId);
    this.props.onFrameAssetLoad({ foundAnnotation });
  };

  private initAnnotationLCM(nestedFrames: HTMLIFrameElement[]):void {
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
          this.props.tour.id,
          this.props.annotationSerialIdMap,
          highlighterBaseConfig,
          this.applyDiffAndGoToAnn,
        );
      }
    } else {
      throw new Error('Annoation document not found while initing annotationlcm');
    }
  }

  private disposeAndAnnotationLCM(): void {
    if (this.annotationLCM) {
      this.annotationLCM.dispose();
      this.annotationLCM = null;
    }
  }

  timer: number = 0;

  reachAnnotation(id: string): boolean {
    if (id) {
      const an = getAnnotationByRefId(id, this.props.allAnnotationsForTour);
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

  async showAnnotation(conf: IAnnotationConfig, opts: ITourDataOpts): Promise<void> {
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

  async componentDidUpdate(prevProps: IOwnProps): Promise<void> {
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

  getScreenById = (id: number): P_RespScreen | undefined => this.props.allScreens!.find(screen => screen.id === id);

  applyDiffToDOM = (
    diffs: ReplaceDiff[] | DelDiff[] | UpdateDiff[] | AddDiff[] | ReorderDiff[],
    diffType: 'replace' | 'delete' | 'update' | 'add' | 'reorder',
    screenDataVersion: string,
  ): void => {
    const doc = this.annotationLCM!.getDoc();

    diffs.forEach(diff => {
      if (diff.parentElPath === '-1') {
        const htmlEl = this.annotationLCM!.elFromPath('1')!;

        switch (diffType) {
          case 'update': {
            const updateDiff = diff as UpdateDiff;
            updateDiff.toBeUpdatedNodes.forEach(toBeUpdatedNode => {
              applyUpdateDiff(toBeUpdatedNode, htmlEl);
            });
            break;
          }
          case 'replace': {
            const replaceDiff = diff as ReplaceDiff;

            replaceDiff.toBeReplacedNodes.forEach(toBeReplacedNode => {
              const replacedNode = deser(
                diff.parentSerNode.chldrn[toBeReplacedNode.replaceNodeIdx],
                doc,
                screenDataVersion,
                this.frameLoadingPromises,
                this.assetLoadingPromises,
                {
                  partOfSvgEl: toBeReplacedNode.isPartOfSVG ? 1 : 0,
                  shadowParent: null
                }
              )!;
              htmlEl.replaceWith(replacedNode);
              applyFadeInTransitionToNode(replacedNode);
            });
            break;
          }
          default:
            break;
        }

        return;
      }

      let parentEl = this.annotationLCM!.elFromPath(diff.parentElPath) as Node;

      if (parentEl?.nodeName.toLowerCase() === 'head') {
        deletePrependStylesFromHead(parentEl);
      }

      if (parentEl!.nodeName.toLowerCase() === 'iframe' || parentEl!.nodeName.toLowerCase() === 'object') {
        parentEl = (parentEl as HTMLIFrameElement).contentDocument as Node;
      }

      if (diff.isPartOfShadowHost || diffType === 'reorder') {
        const newParentEl = deser(
          diff.parentSerNode,
          parentEl.ownerDocument! || doc,
          screenDataVersion,
          this.frameLoadingPromises,
          this.assetLoadingPromises,
          {
            partOfSvgEl: 0,
            /**
           * TODO: Confirm what should be here for shadow root
           */
            shadowParent: (parentEl as HTMLElement).shadowRoot,
          }
        )!;
        (parentEl as HTMLElement).replaceWith(newParentEl);
      } else {
        switch (diffType) {
          case 'replace': {
            const replaceDiff = diff as ReplaceDiff;
            replaceDiff.toBeReplacedNodes.forEach(toBeReplacedNode => {
              const replacedNode = deser(
                diff.parentSerNode.chldrn[toBeReplacedNode.replaceNodeIdx],
                parentEl.ownerDocument! || doc,
                screenDataVersion,
                this.frameLoadingPromises,
                this.assetLoadingPromises,
                {
                  partOfSvgEl: toBeReplacedNode.isPartOfSVG ? 1 : 0,
                  shadowParent: null
                }
              )!;
              parentEl!.replaceChild(replacedNode, parentEl!.childNodes[toBeReplacedNode.idx]);
              applyFadeInTransitionToNode(replacedNode);
            });
            break;
          }

          case 'delete': {
            const delDiff = diff as DelDiff;

            delDiff.toBeDeletedNodes.forEach(toBeDeletedNode => {
              if (toBeDeletedNode.type === 'textcomment') {
                parentEl!.childNodes[toBeDeletedNode.idx + 1]?.remove();
              }
              const node = parentEl!.childNodes[toBeDeletedNode.idx];
              node?.remove();
            });
            break;
          }

          case 'update': {
            const updateDiff = diff as UpdateDiff;

            updateDiff.toBeUpdatedNodes.forEach(toBeUpdatedNode => {
              const el = parentEl!.childNodes[toBeUpdatedNode.idx];
              applyUpdateDiff(toBeUpdatedNode, el);
            });
            break;
          }

          case 'add': {
            const addDiff = diff as AddDiff;

            addDiff.toBeAddedNodes.forEach(toBeAddedNode => {
              const addedNode = deser(
                diff.parentSerNode.chldrn[toBeAddedNode.idx],
                parentEl.ownerDocument! || doc,
                screenDataVersion,
                this.frameLoadingPromises,
                this.assetLoadingPromises,
                {
                  partOfSvgEl: toBeAddedNode.isPartOfSVG ? 1 : 0,
                  shadowParent: null
                }
              )!;

              const pivotEl = parentEl!.childNodes[toBeAddedNode.idx];

              parentEl!.insertBefore(addedNode, pivotEl);

              if (toBeAddedNode.type === 'textcomment') {
                const addedTextNode = deser(
                  diff.parentSerNode.chldrn[toBeAddedNode.idx + 1],
                  parentEl.ownerDocument! || doc,
                  screenDataVersion,
                  this.frameLoadingPromises,
                  this.assetLoadingPromises,
                  {
                    partOfSvgEl: toBeAddedNode.isPartOfSVG ? 1 : 0,
                    shadowParent: null
                  }
                )!;

                parentEl!.insertBefore(addedTextNode, pivotEl);
              }

              applyFadeInTransitionToNode(addedNode);
            });
            break;
          }

          default:
            break;
        }
      }
    });

    function deletePrependStylesFromHead(head: Node): void {
      for (let i = head.childNodes.length - 1; i >= 0; i--) {
        const node = head.childNodes[i] as Element;
        if (node.nodeType !== Node.TEXT_NODE && node.nodeType !== Node.COMMENT_NODE
          && !node.getAttribute('f-id')
          && node.getAttribute('data-rc-order') === 'prependQueue'
        ) {
          node.remove();
        }
      }
    }

    function applyUpdateDiff(toBeUpdatedNode: ToBeUpdatedNode, el: Node): void {
      if (el?.nodeType !== Node.TEXT_NODE && el?.nodeType !== Node.COMMENT_NODE) {
        toBeUpdatedNode.updates.forEach(update => {
          if (update.attrKey === 'style') {
            const allStyles = update.attrNewVal.split(';').filter(prop => !prop.match(/\s*transition/));
            update.attrNewVal = allStyles.join(' ; ');
          }
          (el as Element).setAttribute(update.attrKey, update.attrNewVal);
        });
        (el as HTMLElement).style.transition = 'all 0.2s ease-out';
      }
    }
  };

  applyDiffAndGoToAnn = async (
    currAnnId: string,
    goToAnnIdWithScreenId: string,
    isGoToVideoAnn: boolean
  ): Promise<void> => {
    const [goToScreenId, goToAnnId] = goToAnnIdWithScreenId.split('/');

    const { screenId: currScreenId } = getAnnotationByRefId(currAnnId, this.props.allAnnotationsForTour)!;

    /**
     * If the annotation is on the same screen,
     * no diffs will be required to apply.
     * Thus, directly go to annotation
     */
    if (+goToScreenId === currScreenId) {
      this.reachAnnotation(goToAnnId);
      if (isGoToVideoAnn) {
        playVideoAnn(goToScreenId, goToAnnId);
      }
      return;
    }

    const goToScreen = this.getScreenById(+goToScreenId)!;
    const currScreen = this.getScreenById(+currScreenId)!;

    this.props.preRenderNextScreen!(goToScreen.rid);

    /**
     * If either of the screen type is image,
     * OR
     * If the two screens have different url  host,
     * We will navigate to that screen id and annotation id
     */
    if ((goToScreen.type === ScreenType.Img || currScreen.type === ScreenType.Img)
    || (goToScreen.urlStructured.host !== currScreen.urlStructured.host)
    ) {
      this.navigateAndGoToAnn(goToAnnIdWithScreenId, isGoToVideoAnn);
      return;
    }

    /**
     * Getting Screen data
     */

    const currScreenData = this.props.allScreensData![currScreenId];

    const goToScreenData = this.props.allScreensData![goToScreenId];

    /**
     *  We are prerendering the next screens,
     *  But the data fetching of the next screen might take time if the user has slow net or the data is big
     *  For this reason, we are adding this check.
     *  TODO:// Wait until data is present instead of using navigate
     */
    if (!currScreenData || !goToScreenData) {
      this.props.navigate(goToAnnIdWithScreenId, 'annotation-hotspot');
      return;
    }

    /**
     * If either of the screen type doesn't support screen diff version,
     * We navigate to that screen with annotation id
     */
    if (currScreenData.version !== SCREEN_DIFFS_SUPPORTED_VERSION
      || goToScreenData.version !== SCREEN_DIFFS_SUPPORTED_VERSION) {
      this.navigateAndGoToAnn(goToAnnIdWithScreenId, isGoToVideoAnn);
      return;
    }

    /**
     * Getting Screen edits
     */

    const goToScreenEdits = this.props.editsAcrossScreens![goToScreenId];

    const currScreenEdits = this.props.editsAcrossScreens![currScreenId];

    this.removeEdits(currScreenEdits);

    /**
     * Getting and applying diffs
     */

    const doc = this.annotationLCM!.getDoc();

    try {
      this.reachAnnotation('');

      const replaceDiffs = getReplaceDiffs(currScreenData.docTree, goToScreenData.docTree);
      const afterReplaceSerDom = applyReplaceDiffsToSerDom(replaceDiffs, currScreenData.docTree);

      this.applyDiffToDOM(replaceDiffs, 'replace', goToScreenData.version);

      const delDiffs = getDelDiffs(afterReplaceSerDom, goToScreenData.docTree);
      const afterDelSerDom = applyDelDiffsToSerDom(delDiffs, afterReplaceSerDom);

      this.applyDiffToDOM(delDiffs, 'delete', goToScreenData.version);

      const updateDiffs = getUpdateDiffs(afterDelSerDom, goToScreenData.docTree);
      const afterUpdateSerDom = applyUpdateDiffsToSerDom(updateDiffs, afterDelSerDom);

      this.applyDiffToDOM(updateDiffs, 'update', goToScreenData.version);

      const addDiffs = getAddDiffs(afterUpdateSerDom, goToScreenData.docTree);
      const afterAddSerDom = applyAddDiffsToSerDom(addDiffs, afterUpdateSerDom);

      this.applyDiffToDOM(addDiffs, 'add', goToScreenData.version);

      const reorderDiffs = getReorderDiffs(afterAddSerDom, goToScreenData.docTree);
      this.applyDiffToDOM(reorderDiffs, 'reorder', goToScreenData.version);

      while (this.frameLoadingPromises.length) {
        await this.frameLoadingPromises.shift();
      }

      while (this.assetLoadingPromises.length) {
        await this.assetLoadingPromises.shift();
      }

      this.annotationLCM!.resetCons();
      await scrollIframeEls(currScreenData.version, doc);

      this.applyEdits(goToScreenEdits);

      // go to next annotation
      setTimeout(() => {
        this.reachAnnotation(goToAnnId);
      }, 200);
    } catch (err) {
      captureException(err);
      this.props.navigate(goToAnnIdWithScreenId, 'annotation-hotspot');
    }
  };

  navigateAndGoToAnn = (goToAnnIdWithScreenId: string, isGoToVideoAnn: boolean): void => {
    const [goToScreenId, goToAnnId] = goToAnnIdWithScreenId.split('/');

    this.props.navigate(goToAnnIdWithScreenId, 'annotation-hotspot');
    if (isGoToVideoAnn) {
      playVideoAnn(goToScreenId, goToAnnId);
    }
  };

  render(): JSX.Element {
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
