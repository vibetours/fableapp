import React from 'react';
import { connect } from 'react-redux';
import { IAnnotationConfig, ITourDataOpts, LoadingStatus, ScreenData } from '@fable/common/dist/types';
import { loadScreenAndData, loadTourAndData } from '../../action/creator';
import * as GTags from '../../common-styled';
import PreviewWithEditsAndAnRO from '../../component/screen-editor/preview-with-edits-and-annotations-readonly';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import createAdjacencyList, { ScreenAdjacencyList } from '../../screen-adjacency-list';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { AnnotationPerScreen, EditItem, FWin, NavFn } from '../../types';
import HeartLoader from '../../component/loader/heart';
import { openTourExternalLink, getAnnotationsPerScreen } from '../../utils';
import { removeSessionId } from '../../analytics/utils';
import { getAnnotationSerialIdMap } from '../../component/annotation/ops';

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
  // screen: P_RespScreen | null;
  screenDataAcrossScreens: Record<string, ScreenData>;
  allScreens: P_RespScreen[];
  isTourLoaded: boolean;
  allAnnotations: Record<string, IAnnotationConfig[]>;
  tourOpts: ITourDataOpts | null;
  allAnnotationAcrossScreens: Record<string, IAnnotationConfig[]>;
  editsAcrossScreens: Record<string, EditItem[]>;
  isScreenLoaded: boolean;
  allAnnotationsForTour: AnnotationPerScreen[];
  annotationSerialIdMap: Record<string, number>
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const tourOpts = state.default.remoteTourOpts;
  const allAnnotationsForTour = getAnnotationsPerScreen(state);
  const annotationSerialIdMap = tourOpts ? getAnnotationSerialIdMap(tourOpts, allAnnotationsForTour) : {};

  return {
    tour: state.default.currentTour,
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
    annotationSerialIdMap,
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

interface IOwnStateProps { }

class Player extends React.PureComponent<IProps, IOwnStateProps> {
  private adjList: ScreenAdjacencyList | null = null;

  private renderSlots: Record<string, number> = {};

  private frameRefs: Record<number, React.RefObject<HTMLIFrameElement | null>> = {};

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

  getScreenDataPreloaded(rid: string): void {
    const screen = this.props.allScreens.find(s => s.rid === rid);
    if (!screen) {
      throw new Error(`No screen found for rid=${rid}`);
    }
    const adj = this.adjList![screen.id];
    const prerenderList = [adj[0], ...adj[1], ...adj[2]];
    prerenderList.map(s => this.props.loadScreenAndData(s.rid, s.id !== screen.id));
  }

  componentDidUpdate(prevProps: IProps): void {
    const prevTourLoaded = prevProps.isTourLoaded;
    const currTourLoaded = this.props.isTourLoaded;
    const prevScreenRId = prevProps.match.params.screenRid;
    const currScreenRId = this.props.match.params.screenRid;

    let firstTimeTourLoading = false;
    if (currTourLoaded && prevTourLoaded !== currTourLoaded) {
      firstTimeTourLoading = true;
      this.preRender();
      const main = this.props.tourOpts!.main;
      if (!main) {
        throw new Error('No main in config');
      }
      if (!this.props.match.params.screenRid || !this.props.match.params.annotationId) {
        this.navigateTo(main);
      }
    }
    if (currScreenRId && (firstTimeTourLoading || currScreenRId !== prevScreenRId)) {
      this.getScreenDataPreloaded(currScreenRId);
    }
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
      throw new Error(`Can't navigate because screenId ${screenId} is not found`);
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

  render(): JSX.Element {
    if (!this.isLoadingComplete()) {
      return (
        <HeartLoader />
      );
    }

    const currScreenId = this.props.allScreens.find(screen => screen.rid === this.props.match.params.screenRid!)!.id;

    return (
      <GTags.BodyCon style={{
        height: '100%',
        padding: 0,
        overflowY: 'hidden',
      }}
      > {
          this.getScreenWithRenderSlot()
            .filter(c => c.isRenderReady)
            .map(config => (
              <PreviewWithEditsAndAnRO
                annotationSerialIdMap={this.props.annotationSerialIdMap}
                key={config.screen.id}
                innerRef={this.frameRefs[config.screen.id]}
                screen={config.screen}
                hidden={config.screen.id !== currScreenId}
                screenData={config.screenData}
                divPadding={0}
                navigate={this.navFn}
                playMode
                onBeforeFrameBodyDisplay={() => {}}
                allAnnotationsForScreen={this.props.allAnnotationAcrossScreens[config.screen.id]}
                tourDataOpts={this.props.tourOpts!}
                allEdits={config.screenEdits}
                toAnnotationId={
                  config.screen.id === currScreenId ? this.props.match.params.annotationId || '' : ''
                }
                onFrameAssetLoad={() => { }}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                tour={this.props.tour!}
                allScreensData={this.props.screenDataAcrossScreens}
                allScreens={this.props.allScreens}
                editsAcrossScreens={this.props.editsAcrossScreens}
                preRenderNextScreen={(rid: string) => this.getScreenDataPreloaded(rid)}
              />
            ))
        }
      </GTags.BodyCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Player));
