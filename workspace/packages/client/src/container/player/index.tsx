import React, { MutableRefObject } from 'react';
import { connect } from 'react-redux';
import { CreateJourneyData, IAnnotationButtonType, IAnnotationConfig, ITourDataOpts, ITourLoaderData,
  LoadingStatus, ScreenData } from '@fable/common/dist/types';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { ScreenType } from '@fable/common/dist/api-contract';
import { loadScreenAndData, loadTourAndData } from '../../action/creator';
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
  Msg,
  Payload_NavToAnnotation,
  Payload_JourneySwitch,
  Payload_DemoLoadingStarted,
  Payload_DemoLoadingFinished,
  ExtMsg
} from '../../types';
import {
  openTourExternalLink,
  getAnnotationsPerScreen,
  getJourneyProgress,
  saveJourneyProgress,
  isNavigateHotspot,
  addToGlobalAppData,
  getCurrentFlowMain
} from '../../utils';
import { removeSessionId } from '../../analytics/utils';
import {
  AnnotationSerialIdMap,
  getAnnotationSerialIdMap
} from '../../component/annotation/ops';
import FullScreenLoader from '../../component/loader-editor/full-screen-loader';
import JourneyMenu from '../../component/journey-menu';
import InfoCon from '../../component/info-con';
import { SCREEN_DIFFS_SUPPORTED_VERSION } from '../../constants';
import { emitEvent } from '../../internal-events';

const REACT_APP_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT as string;

interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string, loadPublishedData: boolean) => void,
  loadScreenAndData: (rid: string, isPreloading: boolean, loadPublishedData: boolean) => void,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid, loadPublishedData) => dispatch(
    loadTourAndData(rid, true, true, loadPublishedData)
  ),
  loadScreenAndData: (rid, isPreloading, loadPublishedData) => dispatch(
    loadScreenAndData(rid, true, isPreloading, loadPublishedData)
  ),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screenDataAcrossScreens: Record<string, ScreenData>;
  allScreens: P_RespScreen[];
  isTourLoaded: boolean;
  allAnnotations: Record<string, IAnnotationConfig[]>;
  tourOpts: ITourDataOpts | null;
  allAnnotationAcrossScreens: Record<string, IAnnotationConfig[]>;
  editsAcrossScreens: Record<string, EditItem[]>;
  isScreenLoaded: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  tourLoaderData: ITourLoaderData | null;
  journey: CreateJourneyData | null;
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const tourOpts = state.default.remoteTourOpts;
  const allAnnotationsForTour = getAnnotationsPerScreen(state);

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
    allAnnotationAcrossScreens: state.default.remoteAnnotations,
    editsAcrossScreens: state.default.remoteEdits,
    allAnnotationsForTour,
    journey: state.default.journey,
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
  isMainSet: boolean;
  initialScreenRid: string;
  initiallyPrerenderedScreens: Record<string, boolean>;
  isMinLoaderTimeDone: boolean;
  isJourneyMenuOpen: boolean;
  annotationSerialIdMap: AnnotationSerialIdMap;
  currentFlowMain: string;
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

  constructor(props: IProps) {
    super(props);
    this.state = {
      isMainSet: true,
      initialScreenRid: '',
      initiallyPrerenderedScreens: {},
      isMinLoaderTimeDone: false,
      isJourneyMenuOpen: true,
      annotationSerialIdMap: {},
      currentFlowMain: ''
    };

    this.isLoadingCompleteMsgSentRef = React.createRef<boolean>();
  }

  componentDidMount(): void {
    document.title = this.props.title;
    if (REACT_APP_ENVIRONMENT !== 'dev') {
      (window as FWin).__fable_global_settings__ = {
        ...((window as FWin).__fable_global_settings__ || {}),
        shouldLogEvent: !this.props.staging
      };
    }
    this.props.loadTourWithDataAndCorrespondingScreens(
      this.props.match.params.tourId,
      !this.props.staging
    );
    window.addEventListener('beforeunload', removeSessionId);
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
      !this.props.staging
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
    if (!(this.props.match.params.screenRid && this.props.match.params.annotationId)) {
      if (!(opts && opts.main) && !this.isJourneyAdded()) this.setState({ isMainSet: false });
      else if (this.isJourneyAdded()) {
        this.navigateTo(this.props.journey!.flows[0].main);
      } else this.navigateTo(opts!.main);
    }
  };

  navigateToJourney = (main: string): void => {
    this.navigateTo(main);
    this.updateCurrentFlowMain(main);
  };

  updateCurrentFlowMain = (main: string): void => {
    emitEvent<Partial<Payload_JourneySwitch>>(InternalEvents.JourneySwitch, {
      fromJourney: this.state.currentFlowMain,
      currentJourney: main,
    });

    this.addJourneyToGlobalData(main);
    this.setState({ isJourneyMenuOpen: false, currentFlowMain: main });
  };

  initJourneyProgress = (
    main: string,
    totalSteps: number,
    currentTourId: number
  ) : void => {
    const flowProgress : FlowProgress = {
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

  setSerialMapAndJoruneyProgress = (annotationSerialIdMap: AnnotationSerialIdMap) : AnnotationSerialIdMap => {
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

  setCurrentFlowMain(): void {
    const main = getCurrentFlowMain(
      this.props.match.params.annotationId!,
      this.props.allAnnotationsForTour,
      this.props.journey!.flows
    );
    this.setState({ currentFlowMain: main });
  }

  componentDidUpdate(prevProps: IProps): void {
    const prevTourLoaded = prevProps.isTourLoaded;
    const currTourLoaded = this.props.isTourLoaded;
    const prevScreenRId = prevProps.match.params.screenRid;
    const currScreenRId = this.props.match.params.screenRid;

    if (!currScreenRId && currScreenRId !== prevScreenRId) {
      this.navigateToMain();
    }

    let firstTimeTourLoading = false;
    if (currTourLoaded && prevTourLoaded !== currTourLoaded) {
      firstTimeTourLoading = true;

      let annotationSerialIdMap: AnnotationSerialIdMap = {};
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
        annotationSerialIdMap = this.setSerialMapAndJoruneyProgress(annotationSerialIdMap);
      } else {
        annotationSerialIdMap = this.props.tourOpts
          ? getAnnotationSerialIdMap(this.props.tourOpts.main, this.props.allAnnotationsForTour) : {};
      }
      this.setState({ annotationSerialIdMap });
      this.navigateToMain();
      emitEvent<Partial<Payload_DemoLoadingStarted>>(InternalEvents.DemoLoadingStarted, {});
    }
    if (currScreenRId && (!firstTimeTourLoading && currScreenRId !== prevScreenRId)) {
      if (this.state.initialScreenRid) {
        const screen = this.getScreenAtId(currScreenRId, 'rid');
        const startScreens = bfsTraverse(this.adjList!, [screen], 3, 'next').lastLevelNodes;
        this.getScreenDataPreloaded(screen, 1, startScreens, false);
      } else {
        // this happens when the user uses the tourURl as  /tour/tourid without any screen id
        // in this case, we navigate to main, hence, firstTimeLoading is false
        // but still we are rendering the screens for the first time
        this.initialScreenLoad(currScreenRId);
        if (this.isJourneyAdded()) {
          this.setCurrentFlowMain();
        }
      }
    }

    // this happens when the user uses the tourUrl as /tour/tourid/screenid/annid
    if (currScreenRId && firstTimeTourLoading) {
      this.initialScreenLoad(currScreenRId);
      if (this.isJourneyAdded()) {
        this.setCurrentFlowMain();
      }
    }

    if (this.props.tourLoaderData !== prevProps.tourLoaderData && this.props.tourLoaderData) {
      setTimeout(() => {
        this.setState({ isMinLoaderTimeDone: true });
      }, 3500);
    }
  }

  getScreenAtId(id: string, key: keyof P_RespScreen): P_RespScreen {
    const screen = this.props.allScreens.find(s => s[key]!.toString() === id);
    if (!screen) {
      throw new Error(`No screen found for ${key}=${id}`);
    }
    return screen;
  }

  initialScreenLoad(screenRid: string): void {
    const obj: Record<string, boolean> = {};
    const startScreens : P_RespScreen[] = [];

    const mainScreen = this.getScreenAtId(screenRid, 'rid');
    startScreens.push(mainScreen);

    if (this.isJourneyAdded()) {
      this.props.journey!.flows.forEach((flow) => {
        const flowScreenId = flow.main.split('/')[0];
        const flowScreen = this.getScreenAtId(flowScreenId, 'id');
        startScreens.push(this.props.allScreens.find(s => s.rid === flowScreen.rid)!);
      });
    }

    const initiallyPrerenderedScreens = this.getScreenDataPreloaded(mainScreen, 3, startScreens, true);
    initiallyPrerenderedScreens.forEach(screen => obj[screen.rid] = false);

    this.setState({ initialScreenRid: screenRid, initiallyPrerenderedScreens: obj });
  }

  componentWillUnmount(): void {
    window.removeEventListener('beforeunload', removeSessionId);
  }

  isLoadingComplete = (): boolean => this.props.isTourLoaded && this.props.isScreenLoaded;

  navigateTo = (qualifiedAnnotaionUri: string): void => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.allScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/p/demo/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}${window.location.search}`;
      this.props.navigate(url);
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
      const shouldPrerenderIframe = this.iframesToPrerenderIds.has(slot.screen.id);
      if (shouldPrerenderIframe) return true;

      const isNavigatedToCurrScreen = slot.screen.id === this.getCurrScreenId();
      if (isNavigatedToCurrScreen) return true;

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

    return !(isAnyOfThemScreenImg || isCurrScreenOldVersioned || isAdjacentScreensOldVersioned || isHostDifferent);
  }

  getCurrScreenId(): number {
    if (!this.props.match.params.screenRid) return -1;
    return this.props.allScreens.find(screen => screen.rid === this.props.match.params.screenRid!)!.id;
  }

  isInitialPrerenderingComplete(): boolean {
    if (!this.state.isMinLoaderTimeDone) {
      return false;
    }
    for (const isPrerendered of Object.values(this.state.initiallyPrerenderedScreens)) {
      if (!isPrerendered) return false;
    }

    if (!this.isLoadingCompleteMsgSentRef.current) {
      // not ordered ans, we can  order using index/stepnomber but its present in IAnnotationConfigWithScreen
      const annCnfs = Object.values(this.props.allAnnotations).flat();
      emitEvent<Partial<Payload_DemoLoadingFinished>>(InternalEvents.DemoLoadingFinished, {
        annConfigs: annCnfs
      });

      this.isLoadingCompleteMsgSentRef.current = true;
    }
    return true;
  }

  isJourneyAdded = () : boolean => (this.props.journey!.flows.length !== 0);

  addJourneyToGlobalData = (main: string) : void => {
    const journeyName = this.props.journey?.flows
      .find(flow => flow.main === main)?.header1 || null;
    addToGlobalAppData('journeyName', journeyName);
  };

  render(): JSX.Element {
    if (!this.state.isMainSet) {
      return (
        <InfoCon
          heading="Entry point is not set for this tour"
          body={(
            <>
              <p>
                Entry point is the annotation where the tour starts. You can set an annotation as entry point by
              </p>
              <ol>
                <li>Clicking on the annotation</li>
                <li>Expanding <em>Advanced</em> section</li>
                <li><em>Checking </em> Entry Point</li>
              </ol>
            </>
          )}
          btns={[{
            type: 'primary',
            linkTo: `/demo/${this.props.tour!.rid}`,
            text: 'Go to canvas'
          }]}
        />
      );
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
                onBeforeFrameBodyDisplay={() => {}}
                allAnnotationsForScreen={this.props.allAnnotationAcrossScreens[config.screen.id]}
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
                  const startScreens = bfsTraverse(this.adjList!, [screen], 3, 'next').lastLevelNodes;
                  this.getScreenDataPreloaded(screen, 1, startScreens, false);
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
                  this.updateCurrentFlowMain(newMain);
                }}
                closeJourneyMenu={() : void => {
                  if (this.state.isJourneyMenuOpen) { this.setState({ isJourneyMenuOpen: false }); }
                }}
                updateJourneyProgress={(annRefId: string) => {
                  if (this.state.currentFlowMain) {
                    const currentStepNumber = this.state.annotationSerialIdMap[annRefId].split(' ')[0];
                    this.updateJourneyProgress(parseInt(currentStepNumber, 10));
                  }
                }}
                flows={this.props.journey?.flows || []}
              />
            ))
        }
        {
          this.isInitialPrerenderingComplete() && this.isJourneyAdded() && (
            <JourneyMenu
              journey={this.props.journey!}
              isJourneyMenuOpen={this.state.isJourneyMenuOpen}
              navigateToJourney={this.navigateToJourney}
              updateJourneyMenu={(isMenuOpen: boolean) : void => {
                this.setState({ isJourneyMenuOpen: isMenuOpen });
              }}
              navigateToCta={() => this.navFn(this.props.journey!.cta!.navigateTo, 'abs')}
              tourOpts={this.props.tourOpts!}
              currentFlowMain={this.state.currentFlowMain}
              journeyProgress={this.localJourneyProgress[this.props.tour!.id]}
            />
          )
        }
        {this.props.tourLoaderData && !this.isInitialPrerenderingComplete()
          && (
          <FullScreenLoader data={this.props.tourLoaderData} />
          )}
      </GTags.BodyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Player));
