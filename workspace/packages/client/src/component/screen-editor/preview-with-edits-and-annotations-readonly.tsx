import {
  IAnnotationButtonType,
  IAnnotationConfig,
  ITourDataOpts,
  ScreenData,
  SerNode,
  JourneyFlow,
  JourneyData
} from '@fable/common/dist/types';
import React from 'react';
import { Responsiveness, ScreenType } from '@fable/common/dist/api-contract';
import { captureException, startTransaction } from '@sentry/react';
import { DEFAULT_BLUE_BORDER_COLOR } from '@fable/common/dist/constants';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import { sleep } from '@fable/common/dist/utils';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import {
  AnnotationPerScreen,
  HiddenEls,
  EditItem,
  FrameAssetLoadFn,
  ElPathKey,
  NavFn,
} from '../../types';
import AnnotationLifecycleManager from '../annotation/lifecycle-manager';
import Preview, { DeSerProps } from './preview';
import { scrollIframeEls } from './scroll-util';
import { AnnotationSerialIdMap, getAnnotationByRefId } from '../annotation/ops';
import { deser, deserIframeEl } from './utils/deser';
import { applyEditsToSerDom } from './utils/edits';
import { getAnnsOfSameMultiAnnGrp, getFableRtUmbrlDiv, playVideoAnn } from '../annotation/utils';
import { SCREEN_DIFFS_SUPPORTED_VERSION } from '../../constants';
import { getDiffsOfImmediateChildren, getSerNodesAttrUpdates, isSerNodeDifferent } from './utils/diffs/get-diffs';
import { DiffsSerNode, QueueNode } from './utils/diffs/types';
import {
  getChildElementByFid,
  getFidOfNode,
  getFidOfSerNode,
  getCurrentFlowMain,
  makeVisibleAllParentsInHierarchy,
  undoMakeVisibleAllParentsInHierarchy,
  debounce,
  isTourResponsive,
  RESP_MOBILE_SRN_WIDTH_LIMIT
} from '../../utils';
import { applyFadeInTransitionToNode, applyUpdateDiff } from './utils/diffs/apply-diffs-anims';
import { NavToAnnByRefIdFn } from './types';

export interface IOwnProps {
  resizeSignal: number;
  journey: JourneyData | null;
  annotationSerialIdMap: AnnotationSerialIdMap;
  screen: P_RespScreen;
  screenData: ScreenData;
  navigate: NavFn;
  onBeforeFrameBodyDisplay: (params: { nestedFrames: HTMLIFrameElement[] }) => void;
  innerRef?: React.MutableRefObject<HTMLIFrameElement | null>;
  playMode: boolean;
  allAnnotationsForScreen: IAnnotationConfig[];
  tourDataOpts: ITourDataOpts;
  allEdits: EditItem[];
  toAnnotationId: string;
  hidden: boolean;
  stashAnnIfAny: boolean;
  onFrameAssetLoad: FrameAssetLoadFn;
  allAnnotationsForTour: AnnotationPerScreen[];
  tour: P_RespTour;
  allScreensData?: Record<string, ScreenData>;
  allScreens?: P_RespScreen[];
  editsAcrossScreens?: Record<string, EditItem[]>;
  preRenderNextScreen?: (screen: P_RespScreen) => void;
  onDispose?: () => void;
  updateCurrentFlowMain: (btnType: IAnnotationButtonType, main?: string)=> void,
  flows: JourneyFlow[];
  closeJourneyMenu? : ()=> void;
  screenRidOnWhichDiffsAreApplied?: string;
  updateJourneyProgress: (annRefId: string)=> void;
  areDiffsAppliedSrnMap?: Map<string, boolean>;
  isResponsive: boolean;
  elpathKey: ElPathKey;
  updateElPathKey: (elPath: ElPathKey)=> void;
  handleMenuOnScreenResize?: ()=> void;
}

interface IOwnStateProps {
  resizeSignal: number;
  currentAnn: string;
}

export default class ScreenPreviewWithEditsAndAnnotationsReadonly
  extends React.PureComponent<IOwnProps, IOwnStateProps> {
  static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  private static readonly GF_FONT_FAMILY_LINK_ATTR = 'fable-data-gfi';

  private static readonly FONT_FAMILY_STYLE_EL_ID = 'fable-data-cfm';

  private annotationLCM: AnnotationLifecycleManager | null = null;

  private readonly embedFrameRef: React.RefObject<HTMLIFrameElement | null>;

  private frameLoadingPromises: Promise<unknown>[] = [];

  private assetLoadingPromises: Promise<unknown>[] = [];

  private nestedFrames: Array<HTMLIFrameElement> = [];

  private hiddenEls: HiddenEls = { displayNoneEls: [], visibilityHiddenEls: [] };

  constructor(props: IOwnProps) {
    super(props);
    this.embedFrameRef = React.createRef();
    this.state = {
      resizeSignal: this.props.resizeSignal,
      currentAnn: this.props.toAnnotationId
    };
  }

  addFont = (): void => {
    const opts = this.props.tourDataOpts;
    const el = this.embedFrameRef?.current;

    const doc = el?.contentDocument;

    if (doc !== undefined && doc !== null) {
      if (opts.annotationFontFamily === null && this.props.screen.type === ScreenType.Img) {
        // apply default font for img type screen
        this.addFontLinkToAnnContainer(doc, 'IBM Plex Sans');
        if (!doc.getElementById(ScreenPreviewWithEditsAndAnnotationsReadonly.FONT_FAMILY_STYLE_EL_ID)) {
          const style = doc.createElement('style');
          style.setAttribute('id', ScreenPreviewWithEditsAndAnnotationsReadonly.FONT_FAMILY_STYLE_EL_ID);
          style.innerHTML = "body { font-family: 'IBM Plex Sans'; }";
          getFableRtUmbrlDiv(doc).prepend(style);
        }
      }

      if (opts.annotationFontFamily !== null) {
        this.addFontLinkToAnnContainer(doc, opts.annotationFontFamily);
      }
    }
  };

  // eslint-disable-next-line class-methods-use-this
  private addFontLinkToAnnContainer = (doc: Document, annotationFontFamily: string): void => {
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

    getFableRtUmbrlDiv(doc).prepend(link);
  };

  onBeforeFrameBodyDisplay = (params: { nestedFrames: HTMLIFrameElement[] }): void => {
    this.initAnnotationLCM(params.nestedFrames);
    this.addFont();
    this.props.onBeforeFrameBodyDisplay(params);
  };

  onFrameAssetLoad = async (): Promise<void> => {
    await scrollIframeEls(this.props.screenData.version, this.embedFrameRef.current?.contentDocument!);
    const foundAnnotation = this.reachAnnotation(this.props.toAnnotationId);
    this.props.onFrameAssetLoad({ foundAnnotation });
  };

  private initAnnotationLCM(nestedFrames: HTMLIFrameElement[]):void {
    const an = this.props.allAnnotationsForScreen.find(antn => antn.refId === this.props.toAnnotationId);

    const highlighterBaseConfig = {
      selectionColor: an ? an.annotationSelectionColor : DEFAULT_BLUE_BORDER_COLOR,
      showOverlay: !!an?.showOverlay
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
            navigateToAnnByRefIdOnSameScreen: this.navigateToAnnByRefIdOnSameScreen,
          },
          this.props.screen.type,
          this.props.allAnnotationsForTour,
          this.props.allAnnotationsForScreen,
          this.props.tourDataOpts,
          this.props.tour.id,
          this.props.annotationSerialIdMap,
          highlighterBaseConfig,
          this.applyDiffAndGoToAnn,
          this.props.updateCurrentFlowMain,
          this.props.updateJourneyProgress,
          this.props.elpathKey
        );
        // WARN obviously this is not a right way of doing stuff. But for the perview feature
        // annoation creator panel needs this instance to contorl preview functionality.
        // We initially passed a callback that receives an instance of this, but uncontrolled rerender
        // created issues for annotation display. Hence we resorted to this.
        (window as any).__f_alcm__ = this.annotationLCM;
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
    let annFound = false;
    let an: IAnnotationConfig | null = null;
    if (id) {
      an = getAnnotationByRefId(id, this.props.allAnnotationsForTour);
      if (an) {
        annFound = true;
      }
    }

    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (an) this.showAnnotation(an, this.props.tourDataOpts, this.props.elpathKey);
      else if (this.props.playMode) this.annotationLCM?.hideAnnButKeepMask();
      else this.annotationLCM?.hide();
      this.timer = 0;
    }) as unknown as number;

    return annFound;
  }

  async showAnnotation(conf: IAnnotationConfig, opts: ITourDataOpts, elpathKey: ElPathKey): Promise<void> {
    if (!this.annotationLCM) return;
    let targetEl = null;
    if (conf.type === 'cover') {
      targetEl = this.embedFrameRef?.current?.contentDocument?.body!;
    } else if (this.props.screen.type === ScreenType.Img) {
      targetEl = this.embedFrameRef?.current?.contentDocument?.body.querySelector('img')!;
    } else {
      targetEl = this.annotationLCM.elFromPath(conf[elpathKey])!;
      /** if this element or its parent has display none, we change it to display block.
       * this will create a problem if the original display was other than block (eg, inline, flex) */
      this.hiddenEls = makeVisibleAllParentsInHierarchy(targetEl);
    }
    const annsofSameMultiAnnGrp = getAnnsOfSameMultiAnnGrp(conf.zId, this.props.allAnnotationsForTour)
      .filter(ann => ann.refId !== conf.refId);
    await this.annotationLCM!.addOrReplaceAnnotation(
      targetEl as HTMLElement,
      conf,
      annsofSameMultiAnnGrp,
      opts,
      true,
    );
  }

  componentDidMount(): void {
    window.addEventListener('resize', this.handleScreenResize);
  }

  async componentDidUpdate(prevProps: IOwnProps): Promise<void> {
    if (this.annotationLCM && this.props.elpathKey !== prevProps.elpathKey) {
      this.annotationLCM.updateElPathKey(this.props.elpathKey);
      if (this.props.playMode) this.reachAnnotation(this.state.currentAnn);
    }
    if (this.props.playMode) {
      // In player, stop useless rerender leading to flashing
      if (this.props.toAnnotationId && prevProps.toAnnotationId !== this.props.toAnnotationId) {
        this.setState({ currentAnn: this.props.toAnnotationId });
        this.reachAnnotation(this.props.toAnnotationId);
      }
      if (prevProps.toAnnotationId && !this.props.toAnnotationId) {
        this.annotationLCM?.hide(true);
      }

      if (
        this.props.hidden && this.props.hidden !== prevProps.hidden
        && this.props.areDiffsAppliedSrnMap!.get(this.props.screen.rid)
      ) {
        this.resetIframe(this.props.screen.rid);
        this.props.areDiffsAppliedSrnMap!.set(this.props.screen.rid, false);
      }
    } else {
      // In creator mode we need this so that the annotation is updated with config change from creator panel
      // eslint-disable-next-line no-lonely-if
      if (this.props.stashAnnIfAny) {
        this.annotationLCM?.hide();
      } else {
        this.reachAnnotation(this.props.toAnnotationId);
      }
    }

    const opts = this.props.tourDataOpts;
    const prevOpts = prevProps.tourDataOpts;
    if (prevOpts.annotationFontFamily !== opts.annotationFontFamily) {
      this.addFont();
    }

    if (prevProps.resizeSignal !== this.props.resizeSignal) {
      this.setState({ resizeSignal: this.props.resizeSignal });
    }
  }

  componentWillUnmount(): void {
    clearTimeout(this.timer);
    this.timer = 0;
    this.disposeAndAnnotationLCM();
    this.props.onDispose && this.props.onDispose();
    window.removeEventListener('resize', this.handleScreenResize);
  }

  handleScreenResize = debounce(() => {
    this.setState({ resizeSignal: Math.random() });
    this.props.handleMenuOnScreenResize && this.props.handleMenuOnScreenResize();

    if (isTourResponsive(this.props.tour)) {
      const doc = this.annotationLCM!.getDoc();
      const win = doc.defaultView!;
      const newKey = win.innerWidth <= RESP_MOBILE_SRN_WIDTH_LIMIT ? 'm_id' : 'id';

      if (newKey !== this.props.elpathKey) {
        this.props.updateElPathKey(newKey);
        return;
      }
    }
    this.reachAnnotation(this.state.currentAnn);
  }, 100);

  getScreenById = (id: number): P_RespScreen | undefined => this.props.allScreens!.find(screen => screen.id === id);

  deserElOrIframeEl = (
    serNode: SerNode,
    doc: Document,
    version: string,
    props: DeSerProps = { partOfSvgEl: 0, shadowParent: null }
  ): Node => {
    let deserNode: Node;

    if (serNode.name === 'iframe' || serNode.name === 'object') {
      deserNode = deserIframeEl(
        serNode,
        doc,
        version,
        this.frameLoadingPromises,
        this.assetLoadingPromises,
        this.nestedFrames,
        props,
      )!;
    } else {
      deserNode = deser(
        serNode,
        doc,
        version,
        this.frameLoadingPromises,
        this.assetLoadingPromises,
        this.nestedFrames,
        props,
      )!;
    }

    return deserNode;
  };

  getAndApplyDiffs = async (tree1: SerNode, tree2: SerNode, doc: Document, version: string): Promise<boolean> => {
    try {
      /**
       * Check if the entire html needs to replaced or updated
       */
      const htmlEl = this.annotationLCM!.elFromPath('1')!;
      const updates = getSerNodesAttrUpdates(tree1, tree2);
      applyUpdateDiff(updates, htmlEl);

      /**
       * Checking diffs from html as parentElement
       */
      const queue: QueueNode[] = [{
        serNodeOfTree1: tree1,
        node1: doc.documentElement,
        serNodeOfTree2: tree2,
        props: {
          partOfSvgEl: 0,
          shadowParent: null,
        }
      }];

      while (queue.length > 0) {
        const { serNodeOfTree1, node1, serNodeOfTree2, props } = queue.shift()!;

        // get diffs of only the node1's immediate children
        const diffs = getDiffsOfImmediateChildren(
          { serNode: serNodeOfTree1, props },
          { serNode: serNodeOfTree2, props }
        );

        // apply diffs to only node1's immediate children or replace node1
        await this.applyDiffsToDom(node1, serNodeOfTree2, diffs, doc, version, props);

        // traverse its children
        const commonNodes = diffs.commonNodes;
        for (let i = 0; i <= commonNodes.length - 1; i++) {
          const commonNode = commonNodes[i];

          let parentNode = node1 as Node;
          if (node1.nodeName.toLowerCase() === 'iframe') {
            parentNode = (node1 as HTMLIFrameElement).contentDocument as Node;
          }

          let node: HTMLElement | ShadowRoot | null = getChildElementByFid(
            parentNode,
            getFidOfSerNode(commonNode.serNodeOfTree1)
          );

          if (commonNode.serNodeOfTree1.type === Node.DOCUMENT_FRAGMENT_NODE) {
            node = (parentNode as HTMLElement).shadowRoot as ShadowRoot;
          }

          if (node) {
            queue.push({
              serNodeOfTree1: commonNode.serNodeOfTree1,
              serNodeOfTree2: commonNode.serNodeOfTree2,
              node1: node!,
              props: {
                partOfSvgEl: props.partOfSvgEl || commonNode.serNodeOfTree1.name.toLowerCase() === 'svg' ? 1 : 0,
                shadowParent: null,
              }
            });
          }
        }
      }

      return true;
    } catch (e) {
      raiseDeferredError(e as Error);
      return false;
    }
  };

  applyDiffsToDom = async (
    node: Node,
    serNodeInTree2: SerNode,
    diffs: DiffsSerNode,
    doc: Document,
    version: string,
    props: DeSerProps,
  ): Promise<void> => {
    if (node.nodeName.toLowerCase() === 'head') {
      deletePrependStylesFromHead(node);
    }

    // replace node if required
    if (diffs.shouldReplaceNode) {
      const newNode = this.deserElOrIframeEl(serNodeInTree2, doc, version, props)!;
      await this.replaceNode(newNode, node.parentNode, node);
      return;
    }

    /**
     * apply diffs to node's immediate children
     */
    let parentNode = node;
    if (node.nodeName.toLowerCase() === 'iframe') {
      parentNode = (node as HTMLIFrameElement).contentDocument as Node;
    }

    diffs.deletedNodes.forEach(diff => {
      const el = getChildElementByFid(parentNode, diff.fid)!;
      if (diff.isTextComment) {
        const nextSibling = el.nextSibling!;
        nextSibling.remove();
      }
      el.remove();
    });

    diffs.addedNodes.reverse().forEach(diff => {
      const addedNode = this.deserElOrIframeEl(diff.addedNode, doc, version, diff.props)!;
      const originalOpacity = getOriginalOpacity(addedNode);
      setOpacityOfNode(addedNode, '0');
      let nextEl = getChildElementByFid(parentNode, diff.nextFid) as Node;
      if (!nextEl && parentNode.nodeName.toLowerCase() === 'body') {
        const lastEl = node.childNodes[parentNode.childNodes.length - 1];
        const fid = getFidOfNode(lastEl);
        const umbrellaDiv = (node as HTMLElement).querySelector('.fable-rt-umbrl');
        if (!fid && umbrellaDiv) {
          nextEl = umbrellaDiv;
        }
      }
      if (diff.textNode) {
        const textNode = this.deserElOrIframeEl(diff.textNode, doc, version, diff.props);
        parentNode.insertBefore(textNode, nextEl);
        nextEl = textNode;
      }
      parentNode.insertBefore(addedNode, nextEl);
      applyFadeInTransitionToNode(addedNode, originalOpacity);
    });

    diffs.updatedNodes.forEach(diff => {
      const el = getChildElementByFid(parentNode, diff.fid)!;
      applyUpdateDiff(diff.updates, el);
    });

    for (const diff of diffs.replaceNodes) {
      const nodeToReplace = getChildElementByFid(parentNode, diff.fid) as HTMLElement;
      const newNode = this.deserElOrIframeEl(diff.serNode, doc, version, diff.props)!;
      await this.replaceNode(newNode, parentNode, nodeToReplace);
    }

    await Promise.race([
      this.waitForAssetLoading(),
      sleep(3000)
    ]);

    /**
     * Helper functions for the above applying diffs logic
     */
    function getOriginalOpacity(htmlNode: Node): string {
      let originalOpacity = '1';
      if (htmlNode.nodeType === Node.ELEMENT_NODE) {
        originalOpacity = getComputedStyle(htmlNode as Element).opacity;
      }
      return originalOpacity;
    }

    function setOpacityOfNode(htmlNode: Node, opacity: string): void {
      if (htmlNode.nodeType === Node.ELEMENT_NODE) {
        (htmlNode as HTMLElement).style.opacity = opacity;
      }
    }

    function deletePrependStylesFromHead(head: Node): void {
      for (let i = head.childNodes.length - 1; i >= 0; i--) {
        const currNode = head.childNodes[i] as Element;
        if (currNode.nodeType !== Node.TEXT_NODE && currNode.nodeType !== Node.COMMENT_NODE
          && !currNode.getAttribute('f-id')
          && currNode.getAttribute('data-rc-order') === 'prependQueue'
        ) {
          currNode.remove();
        }
      }
    }
  };

  replaceNode = async (newNode: Node, parentNode: Node | null, nextNode: Node): Promise<void> => {
    if (newNode.nodeName.toLowerCase() === 'link' && parentNode) {
      parentNode.insertBefore(newNode, nextNode);
      await Promise.race([
        this.waitForAssetLoading(),
        sleep(3000)
      ]);
      (nextNode as HTMLElement).remove();
    } else {
      (nextNode as HTMLElement).replaceWith(newNode);
    }
  };

  waitForAssetLoading = async (): Promise<void> => {
    while (this.frameLoadingPromises.length) {
      await this.frameLoadingPromises.shift();
    }

    while (this.assetLoadingPromises.length) {
      await this.assetLoadingPromises.shift();
    }
  };

  applyDiffAndGoToAnn = async (
    currAnnId: string,
    goToAnnIdWithScreenId: string,
    isGoToVideoAnn: boolean
  ): Promise<void> => {
    const [goToScreenId, goToAnnId] = goToAnnIdWithScreenId.split('/');
    this.setState({ currentAnn: goToAnnId });

    const { screenId: currScreenId } = getAnnotationByRefId(currAnnId, this.props.allAnnotationsForTour)!;

    const currScreenData = this.props.allScreensData![currScreenId];
    const goToAnnConfig = getAnnotationByRefId(goToAnnId, this.props.allAnnotationsForTour)!;

    this.reachAnnotation('');

    this.props.closeJourneyMenu!();

    const goToScreen = this.getScreenById(+goToScreenId)!;
    const currScreen = this.getScreenById(+currScreenId)!;

    const areDiffsAppliedToCurrIframe = currScreen.type === ScreenType.SerDom
    && currScreen.rid !== this.props.screenRidOnWhichDiffsAreApplied!;

    undoMakeVisibleAllParentsInHierarchy(this.hiddenEls);
    this.hiddenEls = { displayNoneEls: [], visibilityHiddenEls: [] };

    /**
     * If the annotation is on the same screen,
     * no diffs will be required to apply.
     * Thus, directly go to annotation
     */
    if (+goToScreenId === currScreenId) {
      await this.scrollIframeElsIfRequired(goToAnnConfig, currScreenData);
      this.reachAnnotation(goToAnnId);
      if (isGoToVideoAnn && !areDiffsAppliedToCurrIframe) {
        playVideoAnn(goToScreenId, goToAnnId);
      }
      return;
    }

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
    let goToScreenData = this.props.allScreensData![goToScreenId];

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

    this.props.preRenderNextScreen!(goToScreen);

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
     * If the entire HTML element is different,
     * We navigate to that screen with annotation id
     */
    if (isSerNodeDifferent(currScreenData.docTree, goToScreenData.docTree,)) {
      this.navigateAndGoToAnn(goToAnnIdWithScreenId, isGoToVideoAnn);
      return;
    }

    /**
     * Getting Screen edits
     */

    const goToScreenEdits = this.props.editsAcrossScreens![goToScreenId];

    const currScreenEdits = this.props.editsAcrossScreens![currScreenId];

    /**
     * Getting and applying diffs
     */

    const doc = this.annotationLCM!.getDoc();

    try {
      goToScreenData = applyEditsToSerDom(goToScreenEdits, goToScreenData);
      const startTime = performance.now();
      const sentryTransaction = startTransaction({ name: 'getAndApplyDiffsTx' });

      const res = await this.getAndApplyDiffs(
        currScreenData.docTree,
        goToScreenData.docTree,
        doc,
        goToScreenData.version
      );

      const timeTaken = performance.now() - startTime;
      console.log('dt', timeTaken);
      sentryTransaction?.setData('screenIds', {
        currScreenId: currScreen.id,
        goToScreenId: goToScreen.id
      });
      sentryTransaction?.finish();

      if (!res) {
        throw Error(`Animation failed between ${currScreen.id} and ${goToScreen.id}`);
      }

      while (this.frameLoadingPromises.length) {
        await this.frameLoadingPromises.shift();
      }

      while (this.assetLoadingPromises.length) {
        await this.assetLoadingPromises.shift();
      }

      this.annotationLCM!.resetCons();
      this.addFont();
      await this.scrollIframeElsIfRequired(goToAnnConfig, currScreenData);

      this.annotationLCM!.updateNestedFrames(this.nestedFrames);

      // if the diffs are not applied correctly, the elpath on which the annotation will be displayed
      // will result in a wrong/invalid/no element. this is handled over here
      try {
        const ann = getAnnotationByRefId(goToAnnId, this.props.allAnnotationsForTour)!;
        if (ann.type === 'default') {
          const targetEl = this.annotationLCM!.elFromPath(ann[this.props.elpathKey]);
          targetEl!.getBoundingClientRect();
        }
      } catch (err) {
        throw Error(`After diffs element not valid: pls verify it on 
          screen id ${goToScreen.id} screen rid ${goToScreen.rid} ann rid ${goToAnnId}`);
      }

      // go to next annotation
      setTimeout(() => {
        this.reachAnnotation(goToAnnId);
      }, 300);

      this.props.areDiffsAppliedSrnMap!.set(
        this.props.screenRidOnWhichDiffsAreApplied!,
        true
      );
    } catch (err) {
      captureException(err);
      this.props.navigate(goToAnnIdWithScreenId, 'annotation-hotspot');
    }
  };

  scrollIframeElsIfRequired = async (config: IAnnotationConfig, screenData: ScreenData): Promise<void> => {
    if (config.scrollAdjustment === 'auto') return;
    const doc = this.annotationLCM!.getDoc();
    await scrollIframeEls(screenData.version, doc);
  };

  navigateAndGoToAnn = (goToAnnIdWithScreenId: string, isGoToVideoAnn: boolean): void => {
    const [goToScreenId, goToAnnId] = goToAnnIdWithScreenId.split('/');

    this.props.navigate(goToAnnIdWithScreenId, 'annotation-hotspot');
    if (isGoToVideoAnn) {
      playVideoAnn(goToScreenId, goToAnnId);
    }
  };

  resetIframe = (rid: string): void => {
    const screen = this.props.allScreens!
      .find(s => s.rid === rid)!;
    const currScreenData = this.props.allScreensData![screen.id];

    const htmlEl = this.annotationLCM!.elFromPath('1')!;

    const replacedNode = this.deserElOrIframeEl(
      currScreenData.docTree,
      this.annotationLCM!.getDoc(),
      currScreenData.version,
      {
        partOfSvgEl: 0,
        shadowParent: null
      }
    )!;

    htmlEl.replaceWith(replacedNode);

    this.annotationLCM!.resetCons();
    this.addFont();
    scrollIframeEls(currScreenData.version, this.annotationLCM!.getDoc());
  };

  navigateToAnnByRefIdOnSameScreen: NavToAnnByRefIdFn = (annRefId) => {
    this.reachAnnotation(annRefId);
    const main = getCurrentFlowMain(annRefId, this.props.allAnnotationsForTour, this.props.flows);
    this.props.updateCurrentFlowMain('custom', main);
  };

  render(): JSX.Element {
    const refs = [this.embedFrameRef];
    if (this.props.innerRef) {
      refs.push(this.props.innerRef);
    }

    return <Preview
      resizeSignal={this.state.resizeSignal}
      journey={this.props.journey!}
      showWatermark={this.props.tourDataOpts.showFableWatermark}
      allEdits={this.props.allEdits}
      key={this.props.screen.rid}
      hidden={this.props.hidden}
      screen={this.props.screen}
      screenData={this.props.screenData}
      innerRefs={refs}
      onBeforeFrameBodyDisplay={this.onBeforeFrameBodyDisplay}
      onFrameAssetLoad={this.onFrameAssetLoad}
      isScreenPreview={false}
      playMode={this.props.playMode}
      isResponsive={this.props.isResponsive}
    />;
  }
}
