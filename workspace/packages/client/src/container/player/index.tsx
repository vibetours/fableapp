import React from 'react';
import { connect } from 'react-redux';
import { CreateJourneyData, IAnnotationConfig, ITourDataOpts, ITourLoaderData,
  LoadingStatus, ScreenData } from '@fable/common/dist/types';
import { Link } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { loadScreenAndData, loadTourAndData } from '../../action/creator';
import * as GTags from '../../common-styled';
import PreviewWithEditsAndAnRO from '../../component/screen-editor/preview-with-edits-and-annotations-readonly';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import createAdjacencyList, { ScreenAdjacencyList, bfsTraverse } from '../../screen-adjacency-list';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { AnnotationPerScreen, EditItem, FWin, NavFn } from '../../types';
import { openTourExternalLink, getAnnotationsPerScreen } from '../../utils';
import { removeSessionId } from '../../analytics/utils';
import { AnnotationSerialIdMap, getAnnotationSerialIdMap } from '../../component/annotation/ops';
import Button from '../../component/button';
import * as Tags from './styled';
import FullScreenLoader from '../../component/loader-editor/full-screen-loader';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import JourneyMenu from '../../component/journey-menu';

const REACT_APP_ENVIRONMENT = process.env.REACT_APP_ENVIRONMENT as string;

interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  loadScreenAndData: (rid: string, isPreloading: boolean) => void,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true)),
  loadScreenAndData: (rid: string, isPreloading: boolean) => dispatch(loadScreenAndData(rid, true, isPreloading)),
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
  tourJourney: CreateJourneyData | null;
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
    tourJourney: state.default.tourData?.journey || null,
  };
};

interface IOwnProps {
  title: string;
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

  private lastPrerenderedScreens: P_RespScreen[] = [];

  private loadedScreenRids: Set<string> = new Set<string>();

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
  }

  componentDidMount(): void {
    document.title = this.props.title;
    if (REACT_APP_ENVIRONMENT !== 'dev') {
      (window as FWin).__fable_global_settings__ = {
        ...((window as FWin).__fable_global_settings__ || {}),
        shouldLogEvent: true
      };
    }
    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
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
    startScreens: P_RespScreen[]
  ): P_RespScreen[] {
    const nextScreensToPrerender = bfsTraverse(
      this.adjList!,
      startScreens,
      nextScreenPrerenderCount,
      'next'
    );
    this.lastPrerenderedScreens = nextScreensToPrerender.lastLevelNodes;

    const prevScreensToPrerender = bfsTraverse(this.adjList!, [screen], 1, 'prev');

    const prerenderList = this.removeDuplicateScreens([
      ...nextScreensToPrerender.traversedNodes,
      ...prevScreensToPrerender.traversedNodes,
    ]).filter(s => !this.loadedScreenRids.has(s.rid));

    prerenderList.map(s => this.props.loadScreenAndData(s.rid, s.id !== screen.id));

    prerenderList.forEach(s => this.loadedScreenRids.add(s.rid));

    return prerenderList;
  }

  // eslint-disable-next-line class-methods-use-this
  removeDuplicateScreens(screens: P_RespScreen[]): P_RespScreen[] {
    const uniqueScreens: P_RespScreen[] = [];
    const traversedScreenIds: Record<string, boolean> = {};

    screens.forEach(screen => {
      if (!traversedScreenIds[screen.id]) {
        uniqueScreens.push(screen);
        traversedScreenIds[screen.id] = true;
      }
    });

    return uniqueScreens;
  }

  navigateToMain = (): void => {
    this.preRender();
    const opts = this.props.tourOpts;
    if (!(this.props.match.params.screenRid && this.props.match.params.annotationId)) {
      if (!(opts && opts.main)) this.setState({ isMainSet: false });
      else if (this.isJourneyAdded()) {
        this.navigateTo(this.props.tourJourney!.flows[0].main);
      } else this.navigateTo(opts.main);
    }
  };

  navigateToTour = (main: string): void => {
    const screenId = main.split('/')[0];
    this.navigateTo(main);
    this.setState({ isJourneyMenuOpen: false, currentFlowMain: main });
    this.lastPrerenderedScreens = [this.props.allScreens.find(s => s.id.toString() === screenId)!];
  };

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
        this.setState({ currentFlowMain: this.props.tourJourney!.flows[0].main });
        this.props.tourJourney!.flows.forEach((flow, idx) => {
          const annotationSerialIdMapForFlow = getAnnotationSerialIdMap(flow.main, this.props.allAnnotationsForTour);
          for (const annRefId in annotationSerialIdMapForFlow) {
            if (Object.prototype.hasOwnProperty.call(annotationSerialIdMapForFlow, annRefId)) {
              annotationSerialIdMap[annRefId] = annotationSerialIdMapForFlow[annRefId];
            }
          }
        });
      } else {
        annotationSerialIdMap = this.props.tourOpts
          ? getAnnotationSerialIdMap(this.props.tourOpts.main, this.props.allAnnotationsForTour) : {};
      }
      this.setState({ annotationSerialIdMap });
      this.navigateToMain();
    }
    if (currScreenRId && (!firstTimeTourLoading && currScreenRId !== prevScreenRId)) {
      if (this.state.initialScreenRid) {
        const screen = this.getScreenAtId(this.state.initialScreenRid, 'rid');
        this.getScreenDataPreloaded(screen, 1, this.lastPrerenderedScreens);
      } else {
        // this happens when the user uses the tourURl as  /tour/tourid without any screen id
        // in this case, we navigate to main, hence, firstTimeLoading is false
        // but still we are rendering the screens for the first time
        this.initialScreenLoad(currScreenRId);
      }
    }

    // this happens when the user uses the tourUrl as /tour/tourid/screenid
    if (currScreenRId && firstTimeTourLoading) {
      this.initialScreenLoad(currScreenRId);
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

    if (this.isJourneyAdded()) {
      const startScreens : P_RespScreen[] = [];
      this.props.tourJourney!.flows.forEach((flow) => {
        const flowScreenId = flow.main.split('/')[0];
        const flowScreen = this.getScreenAtId(flowScreenId, 'id');
        startScreens.push(this.props.allScreens.find(s => s.rid === flowScreen.rid)!);
      });
      const flowScreenId = this.props.tourJourney!.flows[0].main.split('/')[0];
      const flowScreen = this.getScreenAtId(flowScreenId, 'id');
      const flowInitiallyPrerenderedScreens = this.getScreenDataPreloaded(flowScreen, 3, startScreens);
      flowInitiallyPrerenderedScreens.forEach(screen => obj[screen.rid] = false);
    } else {
      const mainScreen = this.getScreenAtId(screenRid, 'rid');
      const startScreen = [this.props.allScreens.find(s => s.rid === screenRid)!];
      const initiallyPrerenderedScreens = this.getScreenDataPreloaded(mainScreen, 3, startScreen);
      initiallyPrerenderedScreens.forEach(screen => obj[screen.rid] = false);
    }
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
      const url = `/p/tour/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}${window.location.search}`;
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
    });
    return v;
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
    return true;
  }

  isJourneyAdded = () : boolean => (!!this.props.tourJourney && this.props.tourJourney.flows.length !== 0);

  render(): JSX.Element {
    if (!this.state.isMainSet) {
      return (
        <Tags.InfoCon>
          <img
            src={FableLogo}
            alt="fable-logo"
            style={{
              height: '2rem',
              marginBottom: '2rem',
            }}
          />
          <div className="title">
            Entry point is not set for this tour
          </div>
          <div className="description-con">
            <p>
              Entry point is the annotation where the tour starts. You can set an annotation as entry point by
            </p>
            <ol>
              <li>Clicking on the annotation</li>
              <li>Expanding <em>Advanced</em> section</li>
              <li><em>Checking </em> Entry Point</li>
            </ol>
          </div>
          <Link
            to={`/tour/${this.props.tour!.rid}`}
            className="link-to-canvas"
          >
            <Button style={{ width: '100%' }}>Go to Canvas</Button>
          </Link>
        </Tags.InfoCon>
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
                  this.getScreenDataPreloaded(screen, 1, this.lastPrerenderedScreens);
                }}
                allFlows={this.props.tourJourney?.flows.map(flow => flow.main) || []}
                currentFlowMain={this.state.currentFlowMain}
                updateCurrentFlowMain={(main: string) => { this.setState({ currentFlowMain: main }); }}
                closeJourneyMenu={() : void => {
                  if (this.state.isJourneyMenuOpen) { this.setState({ isJourneyMenuOpen: false }); }
                }}
              />
            ))
        }
        {
          this.isInitialPrerenderingComplete() && this.isJourneyAdded() && (
            <JourneyMenu
              tourJourney={this.props.tourJourney!}
              isJourneyMenuOpen={this.state.isJourneyMenuOpen}
              navigateToTour={this.navigateToTour}
              updateJourneyMenu={(isMenuOpen: boolean) : void => {
                this.setState({ isJourneyMenuOpen: isMenuOpen });
              }}
              navigateToCta={() => this.navFn(this.props.tourJourney!.cta!.navigateTo, 'abs')}
              tourOpts={this.props.tourOpts!}
              currentFlowMain={this.state.currentFlowMain}
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
