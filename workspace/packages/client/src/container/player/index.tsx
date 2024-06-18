import React, { MutableRefObject, Suspense, lazy } from 'react';
import { connect } from 'react-redux';
import {
  JourneyData, IAnnotationButtonType, IAnnotationConfig, ITourDataOpts, ITourLoaderData,
  LoadingStatus, ScreenData
} from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { Responsiveness, ScreenType } from '@fable/common/dist/api-contract';
import { loadScreenAndData, loadTourAndData, updateElPathKey } from '../../action/creator';
import * as GTags from '../../common-styled';
import PreviewWithEditsAndAnRO from '../../component/screen-editor/preview-with-edits-and-annotations-readonly';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import createAdjacencyList, { ScreenAdjacencyList, bfsTraverse, QueueNode } from '../../screen-adjacency-list';
import { withRouter, WithRouterProps } from '../../router-hoc';
import {
  AnnotationPerScreen,
  EditItem,
  FWin,
  NavFn,
  FlowProgress,
  InternalEvents,
  Payload_JourneySwitch,
  Payload_DemoLoadingStarted,
  Payload_DemoLoadingFinished,
  JourneyNameIndexData,
  queryData,
  TourMainValidity,
  ScreenSizeData,
  IframePos,
  ElPathKey,
} from '../../types';
import {
  openTourExternalLink,
  getAnnotationsPerScreen,
  getJourneyProgress,
  saveJourneyProgress,
  getCurrentFlowMain,
  getJourneyWithAnnotations,
  getOrderedAnnotaionFromMain,
  updateAllAnnotationsForTour,
  updateAllAnnotations,
  getSearchParamData,
  getTourMainValidity,
  preloadImagesInTour,
  isTourResponsive,
  RESP_MOBILE_SRN_WIDTH_LIMIT,
  isLandscapeMode,
  isEventValid,
  getMobileOperatingSystem,
  fillLeadFormForAllAnnotationsForTour,
  fillLeadFormForAllAnnotations,
  getIsMobileSize,
  getPrimaryKeyValue
} from '../../utils';
import { removeSessionId } from '../../analytics/utils';
import {
  AnnotationSerialIdMap,
  getAnnotationSerialIdMap
} from '../../component/annotation/ops';
import FullScreenLoader from '../../component/loader-editor/full-screen-loader';
import { HEADER_CTA, IFRAME_BASE_URL, SCREEN_DIFFS_SUPPORTED_VERSION, SCREEN_SIZE_MSG } from '../../constants';
import { emitEvent } from '../../internal-events';
import MainValidityInfo from './main-validity-info';
import { AnnotationBtnClickedPayload, CtaClickedInternal, CtaFrom } from '../../analytics/types';
import { FableLeadContactProps, FtmQueryParams, addToGlobalAppData } from '../../global';
import { isSerNodeDifferent } from '../../component/screen-editor/utils/diffs/get-diffs';
import RotateScreenModal from './rotate-srn-modal';

export const REACT_APP_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT as string;

const JourneyMenu = lazy(() => import('../../component/journey-menu'));
interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string, loadPublishedData: boolean, ts: string | null) => void,
  loadScreenAndData: (rid: string, isPreloading: boolean, loadPublishedDataFor?: P_RespTour) => void,
  updateElpathKey: (elPathKey: ElPathKey) => void,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid, loadPublishedData, ts: string | null) => dispatch(
    loadTourAndData(rid, true, true, loadPublishedData, ts)
  ),
  loadScreenAndData: (rid, isPreloading, loadPublishedDataFor) => dispatch(
    loadScreenAndData(rid, true, isPreloading, loadPublishedDataFor)
  ),
  updateElpathKey: (elPathKey: ElPathKey) => dispatch(updateElPathKey(elPathKey))
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screenDataAcrossScreens: Record<string, ScreenData>;
  allScreens: P_RespScreen[];
  isTourLoaded: boolean;
  allAnnotations: Record<string, IAnnotationConfig[]>;
  tourOpts: ITourDataOpts | null;
  editsAcrossScreens: Record<string, EditItem[]>;
  isScreenLoaded: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  tourLoaderData: ITourLoaderData | null;
  journey: JourneyData | null;
  elpathKey: ElPathKey;
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const tourOpts = state.default.remoteTourOpts;
  let allAnnotationsForTour = getAnnotationsPerScreen(state);
  let allAnnotations = state.default.remoteAnnotations;

  // TODO: this calculation is done every time any state changes in the redux. For performance
  // improvement, this should be moved to component state and these calculations should be made
  // only when the relevant redux state changes
  const params = new URL(window.location.href).searchParams; // these are base params
  const searchParam = params.get('c');
  const paramData: queryData | null = getSearchParamData(searchParam);

  if (paramData && paramData.ha) {
    allAnnotationsForTour = updateAllAnnotationsForTour(allAnnotationsForTour);
    allAnnotations = updateAllAnnotations(allAnnotations);
  }

  // todo: move to component did mount
  const queryParams: Record<string, string> = {};
  params.forEach((v, k) => queryParams[k] = v);

  if (Object.entries(queryParams).length) {
    allAnnotationsForTour = fillLeadFormForAllAnnotationsForTour(allAnnotationsForTour, queryParams);
    allAnnotations = fillLeadFormForAllAnnotations(allAnnotations, queryParams);
  }

  return {
    tour: state.default.currentTour,
    tourLoaderData: state.default.tourLoaderData,
    // screen: state.default.currentScreen,
    screenDataAcrossScreens: state.default.screenData,
    isTourLoaded: state.default.tourLoaded,
    allScreens: state.default.currentTour?.screens || [],
    allAnnotations: state.default.remoteAnnotations,
    tourOpts,
    isScreenLoaded: state.default.screenLoadingStatus === LoadingStatus.Done,
    editsAcrossScreens: state.default.remoteEdits,
    allAnnotationsForTour,
    journey: state.default.journey,
    elpathKey: state.default.elpathKey
  };
};

interface IOwnProps {
  title: string;
  staging: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenRid?: string;
    annotationId?: string;
  }>;

interface IOwnStateProps {
  initialScreenRid: string;
  initiallyPrerenderedScreens: Record<string, boolean>;
  isMinLoaderTimeDone: boolean;
  isJourneyMenuOpen: boolean;
  annotationSerialIdMap: AnnotationSerialIdMap;
  currentFlowMain: string;
  tourMainValidity: TourMainValidity;
  screenSizeData: Record<string, ScreenSizeData>;
  showRotateScreenModal: boolean;
  isIOSPhone: boolean;
}

interface ScreenInfo {
  type: typeof SCREEN_SIZE_MSG,
  scaleFactor: number,
  screenId: number,
  iframePos: IframePos
}

interface HeaderCta {
  type: typeof HEADER_CTA,
  ctaFrom: CtaFrom,
  btnId: string,
  url: string,
  btnTxt: string,
  tourId: number,
  annId: string
}

class Player extends React.PureComponent<IProps, IOwnStateProps> {
  private adjList: ScreenAdjacencyList | null = null;

  private renderSlots: Record<string, number> = {};

  private frameRefs: Record<number, React.RefObject<HTMLIFrameElement | null>> = {};

  private loadedScreenRids: Set<string> = new Set<string>();

  private iframesToPrerenderIds: Set<number> = new Set<number>();

  private localJourneyProgress: Record<string, FlowProgress[]> = getJourneyProgress();

  private loadedScreenHosts: Set<string> = new Set<string>();

  private isLoadingCompleteMsgSentRef: MutableRefObject<boolean | null>;

  private queryData: queryData | null = getSearchParamData(this.props.searchParams.get('c'));

  private areDiffsAppliedSrnMap = new Map<string, boolean>();

  private isMobileSize: boolean = getIsMobileSize();

  constructor(props: IProps) {
    super(props);
    this.state = {
      tourMainValidity: TourMainValidity.Valid,
      initialScreenRid: '',
      initiallyPrerenderedScreens: {},
      isMinLoaderTimeDone: false,
      isJourneyMenuOpen: false,
      annotationSerialIdMap: {},
      currentFlowMain: '',
      screenSizeData: {},
      showRotateScreenModal: false,
      isIOSPhone: getMobileOperatingSystem() === 'iOS',
    };

    this.isLoadingCompleteMsgSentRef = React.createRef<boolean>();
  }

  receiveMessage = (e: MessageEvent<ScreenInfo | HeaderCta>): void => {
    if (!isEventValid(e)) return;
    if (e.data.type === SCREEN_SIZE_MSG) {
      const data = e.data as ScreenInfo;
      this.setState(prevS => {
        const currScreenData: ScreenSizeData = {
          iframePos: data.iframePos,
          scaleFactor: data.scaleFactor
        };
        return {
          screenSizeData: { ...prevS.screenSizeData, [data.screenId]: currScreenData }
        };
      });
    }

    if (e.data.type === HEADER_CTA) {
      const data = e.data as HeaderCta;
      emitEvent<CtaClickedInternal>(InternalEvents.OnCtaClicked, {
        ctaFrom: data.ctaFrom,
        btnId: data.btnId,
        url: data.url,
        btnTxt: data.btnTxt
      });

      emitEvent<AnnotationBtnClickedPayload>(InternalEvents.OnAnnotationNav, {
        tour_id: data.tourId,
        ann_id: data.annId,
        btn_type: data.ctaFrom,
        btn_id: data.btnId
      });
    }
  };

  componentDidMount(): void {
    document.title = this.props.title;
    const ts = this.props.searchParams.get('_ts');
    this.props.loadTourWithDataAndCorrespondingScreens(
      this.props.match.params.tourId,
      !this.props.staging,
      ts
    );
    window.addEventListener('beforeunload', removeSessionId);

    window.addEventListener('message', this.receiveMessage, false);
  }

  createRenderSlotsBasedOnDomain(): Record<string, number> {
    let slotIdx = 0;
    const slots: Record<string, number> = {};
    for (const screen of this.props.allScreens) {
      const url = screen.urlStructured;
      if (url.hostname in slots) continue;
      slots[url.hostname] = slotIdx++;
    }
    return slots;
  }

  preRender(): void {
    this.renderSlots = this.createRenderSlotsBasedOnDomain();
    this.adjList = createAdjacencyList(this.props.allAnnotations, this.props.allScreens);
    for (const screen of this.props.allScreens) {
      this.frameRefs[screen.id] = React.createRef();
    }
  }

  // TODO [optimization]: get prev n next screens to prerender in one function call
  getScreenDataPreloaded(
    screen: P_RespScreen,
    tour: P_RespTour,
    nextScreenPrerenderCount: number,
    startScreens: P_RespScreen[],
    initalScreenLoad: boolean,
  ): P_RespScreen[] {
    const nextScreensToPrerender = bfsTraverse(
      this.adjList!,
      startScreens,
      nextScreenPrerenderCount,
      'next'
    );

    const prevScreensToPrerender = bfsTraverse(this.adjList!, [screen], 1, 'prev');

    const prerenderList = this.removeDuplicateScreens([
      ...nextScreensToPrerender.traversedNodes,
      ...prevScreensToPrerender.traversedNodes,
    ]).filter(({ screen: s }) => !this.loadedScreenRids.has(s.rid));

    prerenderList.map(({ screen: s }) => this.props.loadScreenAndData(
      s.rid,
      s.id !== screen.id,
      this.props.staging ? undefined : tour
    ));

    prerenderList.forEach(({ screen: s }) => this.loadedScreenRids.add(s.rid));

    return this.handleIframesToPrerender(prerenderList, initalScreenLoad);
  }

  handleIframesToPrerender = (initialPrerenderList: QueueNode[], initalScreenLoad: boolean): P_RespScreen[] => {
    initialPrerenderList
      .sort((a, b) => a.level - b.level);

    const filteredPrerenderList: P_RespScreen[] = [];

    if (initalScreenLoad) {
      const prerenderListGroupedByScreen: Record<number, P_RespScreen[]> = {};
      initialPrerenderList.forEach(node => {
        const key = node.startScreenId;
        if (prerenderListGroupedByScreen[key]) {
          prerenderListGroupedByScreen[key].push(node.screen);
        } else {
          prerenderListGroupedByScreen[key] = [node.screen];
        }
      });

      Object.entries(prerenderListGroupedByScreen).forEach(([key, screens]) => {
        const loadedScreenHosts: Set<string> = new Set<string>();

        screens.forEach(currScreen => {
          const currScreenHost = currScreen.urlStructured.host;

          if (!loadedScreenHosts.has(currScreenHost)) {
            filteredPrerenderList.push(currScreen);
            loadedScreenHosts.add(currScreenHost);
            this.loadedScreenHosts.add(currScreenHost);
          }
        });
      });
    } else {
      initialPrerenderList.forEach(node => {
        const currScreenHost = node.screen.urlStructured.host;
        if (!this.loadedScreenHosts.has(currScreenHost)) {
          filteredPrerenderList.push(node.screen);
          this.loadedScreenHosts.add(currScreenHost);
        }
      });
    }

    filteredPrerenderList.forEach(screen => this.iframesToPrerenderIds.add(screen.id));

    return filteredPrerenderList;
  };

  // eslint-disable-next-line class-methods-use-this
  removeDuplicateScreens(nodes: QueueNode[]): QueueNode[] {
    const uniqueScreens: QueueNode[] = [];
    const traversedScreenIds: Record<string, boolean> = {};

    nodes.forEach(node => {
      if (!traversedScreenIds[node.screen.id]) {
        uniqueScreens.push(node);
        traversedScreenIds[node.screen.id] = true;
      }
    });

    return uniqueScreens;
  }

  navigateToMain = (): void => {
    this.preRender();
    const opts = this.props.tourOpts;
    const flowIdx = Number(this.props.searchParams.get('n'));

    if (this.props.match.params.screenRid && this.props.match.params.annotationId) return;

    const tourMainValidity = getTourMainValidity(opts, this.props.journey, this.props.allAnnotationsForTour);
    if (tourMainValidity !== TourMainValidity.Valid) {
      this.setState({ tourMainValidity });
      return;
    }

    let main = '';
    if (flowIdx && flowIdx >= 1 && this.props.journey && this.props.journey.flows.length >= flowIdx) {
      main = this.props.journey!.flows[flowIdx - 1].main;
    } else if (this.isJourneyAdded()) {
      main = this.props.journey!.flows[0].main;
    } else {
      main = opts!.main;
    }
    this.navigateTo(main);
  };

  initJourneyProgress = (
    main: string,
    totalSteps: number,
    currentTourId: number
  ): void => {
    const flowProgress: FlowProgress = {
      main,
      completedSteps: 0,
      totalSteps
    };

    if (this.localJourneyProgress[currentTourId]) {
      // if the flow is already saved in local store we are updating total steps if its less than new total steps.
      let flowExistInJourney = false;
      this.localJourneyProgress[currentTourId].forEach((storeFlow) => {
        if (storeFlow.main === flowProgress.main) {
          flowExistInJourney = true;
          if (storeFlow.totalSteps < flowProgress.totalSteps) {
            storeFlow.totalSteps = flowProgress.totalSteps;
          }
        }
      });
      if (!flowExistInJourney) { this.localJourneyProgress[currentTourId].push(flowProgress); }
    } else this.localJourneyProgress[currentTourId] = [flowProgress];
  };

  updateJourneyProgress = (stepNumber: number): void => {
    const tourId = this.props.tour!.id;
    const currentFlowIdx = this.localJourneyProgress[tourId].findIndex(
      (tour) => tour.main === this.state.currentFlowMain
    );

    const currentFlowProgress = this.localJourneyProgress[tourId];
    if (currentFlowIdx !== -1) {
      currentFlowProgress[currentFlowIdx].completedSteps = Math.max(
        stepNumber,
        currentFlowProgress[currentFlowIdx].completedSteps
      );
      this.localJourneyProgress[tourId] = currentFlowProgress;
      saveJourneyProgress(this.localJourneyProgress);
    }
  };

  setSerialMapAndJoruneyProgress = (annotationSerialIdMap: AnnotationSerialIdMap): AnnotationSerialIdMap => {
    this.props.journey!.flows.forEach((flow) => {
      const annotationSerialIdMapForFlow = getAnnotationSerialIdMap(flow.main, this.props.allAnnotationsForTour);
      for (const annRefId in annotationSerialIdMapForFlow) {
        if (Object.prototype.hasOwnProperty.call(annotationSerialIdMapForFlow, annRefId)) {
          annotationSerialIdMap[annRefId] = annotationSerialIdMapForFlow[annRefId];
        }
      }
      const totalSteps = Object.keys(annotationSerialIdMapForFlow).length;
      this.initJourneyProgress(flow.main, totalSteps, this.props.tour!.id);
    });

    saveJourneyProgress(this.localJourneyProgress);
    return annotationSerialIdMap;
  };

  setCurrentFlowMain(anId: string = this.props.match.params.annotationId!): void {
    const main = getCurrentFlowMain(
      anId,
      this.props.allAnnotationsForTour,
      this.props.journey!.flows
    );

    if (main !== this.state.currentFlowMain) {
      emitEvent<Partial<Payload_JourneySwitch>>(InternalEvents.JourneySwitch, {
        fromJourney: this.state.currentFlowMain,
        currentJourney: main,
      });
      this.addJourneyToGlobalData(main);
      this.setState({ currentFlowMain: main });
    }
  }

  handleParams(): void {
    const searchParams = new URLSearchParams(this.props.location.search);
    const userEmail: string | undefined = searchParams.get('email') ?? undefined;
    const firstName = searchParams.get('first_name') ?? undefined;
    const lastName = searchParams.get('last_name') ?? undefined;
    const org = searchParams.get('org') ?? undefined;
    const phone = searchParams.get('phone') ?? undefined;

    const queryParam: FtmQueryParams = {
      first_name: firstName,
      last_name: lastName,
      org,
      phone,
      email: userEmail
    };
    addToGlobalAppData('ftmQueryParams', queryParam);

    if (REACT_APP_ENVIRONMENT !== 'dev') {
      (window as FWin).__fable_global_settings__ = {
        ...((window as FWin).__fable_global_settings__ || {}),
        shouldLogEvent: !this.props.staging
      };
    }

    const pk_val = getPrimaryKeyValue(queryParam as Record<string, string>, this.props.tourOpts!.lf_pkf);
    if (pk_val || userEmail || firstName || lastName || org || phone) {
      emitEvent<Partial<FableLeadContactProps>>(InternalEvents.LeadAssign, {
        pk_key: this.props.tourOpts!.lf_pkf,
        pk_val,
        email: userEmail,
        first_name: firstName,
        last_name: lastName,
        phone,
        org
      });
    }
  }

  handleResponsiveness = (): void => {
    if (!getIsMobileSize()) return;

    if (this.props.tour && isTourResponsive(this.props.tour)) {
      this.props.updateElpathKey('m_id');
      return;
    }

    if (!isLandscapeMode(window.screen.orientation.type)) {
      this.setState({ showRotateScreenModal: true });
      window.screen.orientation.addEventListener('change', this.screenOrientationChangeListener);
    }
  };

  screenOrientationChangeListener = (e: ScreenOrientationEventMap['change']): void => {
    const evTarget = e.target as ScreenOrientation;
    if (evTarget.type.includes('landscape')) {
      this.setState({ showRotateScreenModal: false });
      window.screen.orientation.removeEventListener('change', this.screenOrientationChangeListener);
    }
  };

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    const prevTourLoaded = prevProps.isTourLoaded;
    const currTourLoaded = this.props.isTourLoaded;
    const prevScreenRId = prevProps.match.params.screenRid;
    const currScreenRId = this.props.match.params.screenRid;

    if (!currScreenRId && currScreenRId !== prevScreenRId) {
      this.navigateToMain();
    }

    let firstTimeTourLoading = false;
    if (currTourLoaded && prevTourLoaded !== currTourLoaded) {
      this.handleParams();
      firstTimeTourLoading = true;

      this.handleResponsiveness();

      let annotationSerialIdMap: AnnotationSerialIdMap = {};
      let isJourneyMenuOpen = false;
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
        isJourneyMenuOpen = this.isJourneyMenuDefaultOpen();
        annotationSerialIdMap = this.setSerialMapAndJoruneyProgress(annotationSerialIdMap);
      } else {
        annotationSerialIdMap = this.props.tourOpts
          ? getAnnotationSerialIdMap(this.props.tourOpts.main, this.props.allAnnotationsForTour) : {};
      }
      this.setState({ annotationSerialIdMap, isJourneyMenuOpen });
      this.navigateToMain();

      emitEvent<Partial<Payload_DemoLoadingStarted>>(InternalEvents.DemoLoadingStarted, {});

      // add images to preload
      const main = this.props.tourOpts ? this.props.tourOpts.main : '';
      preloadImagesInTour(this.props.allAnnotationsForTour, this.props.journey, main);
    }
    if (currScreenRId && (!firstTimeTourLoading && currScreenRId !== prevScreenRId)) {
      if (this.state.initialScreenRid) {
        const screen = this.getScreenAtId(currScreenRId, 'rid');
        const startScreens = bfsTraverse(this.adjList!, [screen], 2, 'next').lastLevelNodes;
        this.getScreenDataPreloaded(screen, this.props.tour!, 1, startScreens, false);
      } else {
        // this happens when the user uses the tourURl as  /tour/tourid without any screen id
        // in this case, we navigate to main, hence, firstTimeLoading is false
        // but still we are rendering the screens for the first time
        this.initialScreenLoad(currScreenRId, this.props.tour!);
        if (this.isJourneyAdded()) {
          this.setCurrentFlowMain();
        }
      }
    }
    // this happens when the user uses the tourUrl as /tour/tourid/screenid/annid
    if (currScreenRId && firstTimeTourLoading) {
      this.initialScreenLoad(currScreenRId, this.props.tour!);
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
      }
    }

    if (this.props.tourLoaderData !== prevProps.tourLoaderData && this.props.tourLoaderData) {
      const timer = setTimeout(() => {
        this.setState({ isMinLoaderTimeDone: true });
        clearTimeout(timer);
      }, 300);
    }
  }

  getScreenAtId(id: string, key: keyof P_RespScreen): P_RespScreen {
    const screen = this.props.allScreens.find(s => s[key]!.toString() === id);
    if (!screen) {
      throw new Error(`No screen found for ${key}=${id}`);
    }
    return screen;
  }

  initialScreenLoad(screenRid: string, tour: P_RespTour): void {
    const obj: Record<string, boolean> = {};
    const startScreens: P_RespScreen[] = [];

    const mainScreen = this.getScreenAtId(screenRid, 'rid');
    startScreens.push(mainScreen);

    if (this.isJourneyAdded()) {
      this.props.journey!.flows.forEach((flow) => {
        const flowScreenId = flow.main.split('/')[0];
        const flowScreen = this.getScreenAtId(flowScreenId, 'id');
        startScreens.push(this.props.allScreens.find(s => s.rid === flowScreen.rid)!);
      });
    }

    const initiallyPrerenderedScreens = this.getScreenDataPreloaded(mainScreen, tour, 2, startScreens, true);
    initiallyPrerenderedScreens.forEach(screen => obj[screen.rid] = false);

    this.setState({ initialScreenRid: screenRid, initiallyPrerenderedScreens: obj });
  }

  componentWillUnmount(): void {
    window.removeEventListener('beforeunload', removeSessionId);
    window.removeEventListener('message', this.receiveMessage, false);
  }

  isLoadingComplete = (): boolean => this.props.isTourLoaded && this.props.isScreenLoaded;

  navigateTo = (qualifiedAnnotaionUri: string): void => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.allScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/${IFRAME_BASE_URL}/demo/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}${window.location.search}`;
      this.props.navigate(url);
      if (anId && this.isJourneyAdded()) {
        this.setCurrentFlowMain(anId);
      }
    } else {
      raiseDeferredError(new Error(`Can't navigate because screenId ${screenId} is not found`));
    }
  };

  navFn: NavFn = (uri, type) => {
    if (type === 'annotation-hotspot') {
      this.navigateTo(uri);
    } else {
      openTourExternalLink(uri);
    }
  };

  navigateToAndLogEvent = (journeyData: JourneyData, type: 'annotation-hotspot' | 'abs'): void => {
    this.navFn(journeyData.cta!.navigateTo, type);
    Promise.resolve().then(() => {
      if (type !== 'annotation-hotspot') {
        emitEvent<CtaClickedInternal>(InternalEvents.OnCtaClicked, {
          ctaFrom: CtaFrom.Journey,
          btnId: '$journey_cta',
          url: journeyData.cta!.navigateTo,
          btnTxt: journeyData.cta!.text
        });

        emitEvent<AnnotationBtnClickedPayload>(InternalEvents.OnAnnotationNav, {
          tour_id: this.props.tour!.id,
          ann_id: '$journey',
          btn_type: CtaFrom.Journey,
          btn_id: '$journey_cta'
        });
      }
    });
  };

  getScreenWithRenderSlot(): {
    slotIdx: number;
    screen: P_RespScreen;
    isRenderReady: boolean;
    screenData: ScreenData;
    screenEdits: EditItem[];
  }[] {
    const v = this.props.allScreens.map(screen => {
      const slotIdx = this.renderSlots[screen.id];
      const screenData = this.props.screenDataAcrossScreens[screen.id];
      const screenEdits = this.props.editsAcrossScreens[screen.id];
      const isRenderReady = !!(screenData && screenEdits);
      return {
        slotIdx, // this is not yet used anywhere
        screen,
        isRenderReady,
        screenData,
        screenEdits
      };
    }).filter(slot => {
      const isNavigatedToCurrScreen = slot.screen.id === this.getCurrScreenId();
      if (isNavigatedToCurrScreen) return true;

      // In ios few demos were crashing, so we are rendering only one iframe at a time.
      // this is done to reduce the number of nodes in the DOM
      if (this.state.isIOSPhone) {
        return false;
      }

      const shouldPrerenderIframe = this.iframesToPrerenderIds.has(slot.screen.id);
      if (shouldPrerenderIframe) return true;

      if (!slot.isRenderReady || !this.adjList) return false;

      const adjListEntries = this.adjList[slot.screen.id];

      const willDiffsApply = this.shouldDiffApply(
        {
          screen: slot.screen,
          data: slot.screenData,
        },
        [...adjListEntries[1], ...adjListEntries[2]].map(screen => ({
          screen,
          data: this.props.screenDataAcrossScreens[screen.id]
        }))
      );

      return !willDiffsApply;
    });
    return v;
  }

  // eslint-disable-next-line class-methods-use-this
  shouldDiffApply(
    screen1Slot: {
      screen: P_RespScreen,
      data: ScreenData
    },
    screen2Slot: {
      screen: P_RespScreen,
      data: ScreenData
    }[]
  ): boolean {
    const isAnyOfThemScreenImg = screen1Slot.screen.type === ScreenType.Img
      || screen2Slot.find(slot => slot.screen.type === ScreenType.Img);
    const isCurrScreenOldVersioned = screen1Slot.data?.version !== SCREEN_DIFFS_SUPPORTED_VERSION;
    const isAdjacentScreensOldVersioned = screen2Slot
      .filter(slot => slot.data)
      .find(slot => slot.data.version !== SCREEN_DIFFS_SUPPORTED_VERSION);
    const isHostDifferent = screen2Slot.find(slot => screen1Slot.screen.urlStructured.host
      !== slot.screen.urlStructured.host);
    const isHTMLNodeDifferent = screen2Slot
      .filter(slot => slot.data)
      .find(slot => isSerNodeDifferent(screen1Slot.data.docTree, slot.data.docTree));

    return !(isAnyOfThemScreenImg || isCurrScreenOldVersioned || isAdjacentScreensOldVersioned
      || isHostDifferent || isHTMLNodeDifferent);
  }

  getCurrScreenId(): number {
    if (!this.props.match.params.screenRid) return -1;
    return this.props.allScreens.find(screen => screen.rid === this.props.match.params.screenRid!)!.id;
  }

  isInitialPrerenderingComplete(): boolean {
    if (!this.state.isMinLoaderTimeDone) {
      return false;
    }

    if (!this.state.isIOSPhone) {
      for (const isPrerendered of Object.values(this.state.initiallyPrerenderedScreens)) {
        if (!isPrerendered) return false;
      }
    }

    if (!this.props.isTourLoaded) {
      return false;
    }

    if (this.isJourneyAdded() && !this.state.currentFlowMain) {
      return false;
    }

    if (!this.isLoadingCompleteMsgSentRef.current) {
      let annConfigs = null;
      let journeyData = null;
      if (this.props.journey?.flows.length !== 0) {
        journeyData = getJourneyWithAnnotations(this.props.allAnnotationsForTour, this.props.journey!.flows);
      } else {
        annConfigs = getOrderedAnnotaionFromMain(this.props.allAnnotationsForTour, this.props.tourOpts!.main);
      }

      emitEvent<Partial<Payload_DemoLoadingFinished>>(InternalEvents.DemoLoadingFinished, {
        journeyData,
        annConfigs
      });

      this.isLoadingCompleteMsgSentRef.current = true;
    }
    return true;
  }

  isJourneyAdded = (): boolean => (this.props.journey !== null && this.props.journey.flows.length !== 0);

  shouldHideJourney = (): boolean => Boolean(this.isMobileSize && this.props.journey?.hideModuleOnMobile);

  isJourneyMenuDefaultOpen = (): boolean => Boolean(this.props.journey && !this.props.journey.hideModuleOnLoad);

  addJourneyToGlobalData = (main: string): void => {
    let journeyIndex = -1;
    const journeyName = this.props.journey?.flows
      .find((flow, index) => {
        if (flow.main === main) {
          journeyIndex = index;
          return true;
        }
        return false;
      })?.header1 || null;

    const journeyData: JourneyNameIndexData = {
      journeyName,
      journeyIndex
    };

    addToGlobalAppData('journeyData', journeyData);
  };

  render(): JSX.Element {
    if (this.state.tourMainValidity !== TourMainValidity.Valid) {
      return <MainValidityInfo
        tourMainValidity={this.state.tourMainValidity}
        tourRid={this.props.tour!.rid}
      />;
    }

    return (
      <GTags.BodyCon style={{
        height: '100%',
        padding: 0,
        overflowY: 'hidden',
      }}
      > {
          this.isLoadingComplete() && this.getScreenWithRenderSlot()
            .filter(c => c.isRenderReady)
            .map(config => (
              <PreviewWithEditsAndAnRO
                resizeSignal={1}
                journey={this.props.journey!}
                annotationSerialIdMap={this.state.annotationSerialIdMap}
                screenRidOnWhichDiffsAreApplied={this.props.match.params.screenRid!}
                key={config.screen.id}
                innerRef={this.frameRefs[config.screen.id]}
                screen={config.screen}
                hidden={config.screen.id !== this.getCurrScreenId()}
                screenData={config.screenData}
                navigate={this.navFn}
                playMode
                stashAnnIfAny={false}
                onBeforeFrameBodyDisplay={() => { }}
                allAnnotationsForScreen={this.props.allAnnotations[config.screen.id]}
                tourDataOpts={this.props.tourOpts!}
                allEdits={config.screenEdits}
                toAnnotationId={
                  config.screen.id === this.getCurrScreenId() ? this.props.match.params.annotationId || '' : ''
                }
                onFrameAssetLoad={() => {
                  if (this.state.initiallyPrerenderedScreens[config.screen.rid] === false) {
                    this.setState(prev => ({
                      initiallyPrerenderedScreens: {
                        ...prev.initiallyPrerenderedScreens,
                        [config.screen.rid]: true
                      }
                    }));
                  }
                }}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                tour={this.props.tour!}
                allScreensData={this.props.screenDataAcrossScreens}
                allScreens={this.props.allScreens}
                editsAcrossScreens={this.props.editsAcrossScreens}
                preRenderNextScreen={(screen: P_RespScreen) => {
                  const startScreens = bfsTraverse(this.adjList!, [screen], 2, 'next').lastLevelNodes;
                  this.getScreenDataPreloaded(screen, this.props.tour!, 1, startScreens, false);
                }}
                updateCurrentFlowMain={(btnConfig: IAnnotationButtonType, main?: string) => {
                  const currentMain = this.state.currentFlowMain;
                  let newMain = currentMain;
                  if (main) {
                    newMain = main;
                  } else {
                    const allFlows = this.props.journey!.flows.map(flow => flow.main) || [];
                    const currentFlowMainIndex = allFlows.findIndex((flow) => flow === currentMain);
                    if (btnConfig === 'next' && currentFlowMainIndex < allFlows.length - 1) {
                      newMain = allFlows[currentFlowMainIndex + 1];
                      this.navFn(newMain, 'annotation-hotspot');
                    } else if (btnConfig === 'prev' && currentFlowMainIndex > 0) {
                      newMain = allFlows[currentFlowMainIndex - 1];
                      this.navFn(newMain, 'annotation-hotspot');
                    }
                    if (btnConfig === 'next' && currentFlowMainIndex === this.props.journey!.flows.length - 1) {
                      window.parent.postMessage({ type: 'lastAnnotation' }, '*');
                    }
                  }
                }}
                closeJourneyMenu={(): void => {
                  if (this.state.isJourneyMenuOpen) { this.setState({ isJourneyMenuOpen: false }); }
                }}
                updateJourneyProgress={(annRefId: string) => {
                  if (this.state.currentFlowMain) {
                    const currentStepNumber = this.state.annotationSerialIdMap[annRefId].split(' ')[0];
                    this.updateJourneyProgress(parseInt(currentStepNumber, 10));
                  }
                }}
                flows={this.props.journey?.flows || []}
                areDiffsAppliedSrnMap={this.areDiffsAppliedSrnMap}
                isResponsive={isTourResponsive(this.props.tour!)}
                elpathKey={this.props.elpathKey}
                updateElPathKey={this.props.updateElpathKey}
                handleMenuOnScreenResize={() => {
                  if (this.state.isJourneyMenuOpen) {
                    this.setState({ isJourneyMenuOpen: false });
                    const timer = setTimeout(() => {
                      this.setState({ isJourneyMenuOpen: true });
                      clearTimeout(timer);
                    }, 100);
                  }
                }}
              />
            ))
        }
        <Suspense fallback={null}>
          {
            this.isInitialPrerenderingComplete()
            && this.isJourneyAdded()
            && (!this.queryData || !this.queryData.hm)
            && !this.shouldHideJourney()
            && (
              <JourneyMenu
                currScreenId={this.getCurrScreenId()}
                journey={this.props.journey!}
                isJourneyMenuOpen={this.state.isJourneyMenuOpen}
                navigateToJourney={this.navigateTo}
                updateJourneyMenu={(isMenuOpen: boolean): void => {
                  this.setState({ isJourneyMenuOpen: isMenuOpen });
                }}
                // navigateToCta={() => this.navFn(this.props.journey!.cta!.navigateTo, 'abs')}
                navigateToCta={() => this.navigateToAndLogEvent(this.props.journey!, 'abs')}
                tourOpts={this.props.tourOpts!}
                currentFlowMain={this.state.currentFlowMain}
                journeyProgress={this.localJourneyProgress[this.props.tour!.id]}
                screenSizeData={this.state.screenSizeData}
              />
            )
          }
        </Suspense>
        {this.props.tourLoaderData && !this.isInitialPrerenderingComplete()
          && (
            <FullScreenLoader
              data={this.props.tourLoaderData}
              vpd={this.props.tour!.settings}
              isResponsive={this.props.tour!.responsive2 === Responsiveness.Responsive}
            />
          )}

        {
          this.state.showRotateScreenModal && <RotateScreenModal
            closeModal={() => {
              const journeyMenuOpen = this.isJourneyMenuDefaultOpen();
              this.setState({
                showRotateScreenModal: false,
                isJourneyMenuOpen: journeyMenuOpen
              });
            }}
          />
        }
      </GTags.BodyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Player));
