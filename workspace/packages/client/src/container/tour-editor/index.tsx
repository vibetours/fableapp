import {
  CmnEvtProp,
  JourneyData,
  IAnnotationConfig,
  ITourDataOpts,
  ITourDiganostics,
  LoadingStatus,
  ScreenData,
  ScreenDiagnostics,
  TourDataWoScheme,
  TourScreenEntity,
} from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { Tooltip, Button, Alert } from 'antd';
import { ReqTourPropUpdate, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getDefaultTourOpts } from '@fable/common/dist/utils';
import { sentryCaptureException } from '@fable/common/dist/sentry';
import {
  AnnAdd,
  UpdateScreenFn,
  clearCurrentScreenSelection,
  clearCurrentTourSelection,
  clearRelayScreenAndAnnAdd,
  flushEditChunksToMasterFile,
  flushTourDataToMasterFile,
  getCustomDomains,
  loadScreenAndData,
  loadTourAndData,
  publishTour,
  renameScreen,
  saveEditChunks,
  saveTourData,
  startAutosaving,
  updateElPathKey,
  updateScreen,
  updateTourProp,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import {
  updateButtonProp,
  updateTourDataOpts
} from '../../component/annotation/annotation-config-utils';
import Canvas from '../../component/tour-canvas';
import { mergeEdits, mergeTourData, P_RespScreen, P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import {
  AllEdits,
  AnnotationPerScreen,
  EditItem,
  ElEditType,
  IdxEditItem,
  TourDataChangeFn,
  NavFn,
  IAnnotationConfigWithScreen,
  DestinationAnnotationPosition,
  ScreenPickerData,
  Timeline,
  TourMainValidity,
  SiteData,
  ElPathKey,
} from '../../types';
import {
  openTourExternalLink,
  getAnnotationsPerScreen,
  DEFAULT_ALERT_FOR_ANN_OPS,
  getFableTimelineOrder,
  saveFableTimelineOrder,
  setEventCommonState,
  createIframeSrc,
  isBlankString,
  generateTimelineOrder,
  assignStepNumbersToAnnotations,
  getTourMainValidity,
  isMediaAnnotation
} from '../../utils';
import ChunkSyncManager, { SyncTarget, Tx } from './chunk-sync-manager';
import {
  getAnnotationSerialIdMap,
  getAnnotationByRefId,
  addNewAnn,
  getAnnotationBtn
} from '../../component/annotation/ops';
import { AnnUpdateType } from '../../component/annotation/types';
import Loader from '../../component/loader';
import ScreenPicker from '../screen-picker';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { FeatureForPlan } from '../../plans';

interface IDispatchProps {
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  loadScreenAndData: (rid: string) => void;
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  saveTourData: (tour: P_RespTour, data: TourDataWoScheme, isJourneyUpdate?: boolean) => void;
  flushEditChunksToMasterFile: (screenIdRidStr: string, edits: AllEdits<ElEditType>) => void;
  flushTourDataToMasterFile: (tour: P_RespTour, edits: TourDataWoScheme) => void;
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  clearCurrentScreenSelection: () => void,
  clearCurrentTourSelection: () => void,
  clearRelayScreenAndAnnAdd: () => void;
  renameScreen: (screen: P_RespScreen, newVal: string) => void;
  startAutoSaving: () => void;
  updateScreen: UpdateScreenFn;
  updateElPathKey: (elPath: ElPathKey)=> void;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  getVanityDomains: () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  publishTour: (tour) => dispatch(publishTour(tour)),
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid, true)),
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true)),
  saveEditChunks:
    (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => dispatch(saveEditChunks(screen, editChunks)),
  flushEditChunksToMasterFile:
    (screenIdRidStr: string, edits: AllEdits<ElEditType>) => dispatch(flushEditChunksToMasterFile(screenIdRidStr, edits)),
  saveTourData: (
    tour: P_RespTour,
    data: TourDataWoScheme,
  ) => dispatch(saveTourData(tour, data)),
  flushTourDataToMasterFile:
    (tour: P_RespTour, edits: TourDataWoScheme) => dispatch(flushTourDataToMasterFile(tour, edits)),
  clearCurrentScreenSelection: () => dispatch(clearCurrentScreenSelection()),
  clearCurrentTourSelection: () => dispatch(clearCurrentTourSelection()),
  renameScreen: (screen: P_RespScreen, newVal: string) => dispatch(renameScreen(screen, newVal)),
  clearRelayScreenAndAnnAdd: () => dispatch(clearRelayScreenAndAnnAdd()),
  startAutoSaving: () => dispatch(startAutosaving()),
  updateScreen: (screen, propName, propValue) => dispatch(updateScreen(screen, propName, propValue)),
  updateElPathKey: (elPath: ElPathKey) => dispatch(updateElPathKey(elPath)),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
  getVanityDomains: () => dispatch(getCustomDomains()),
});

const getTimeline = (allAnns: AnnotationPerScreen[], tour: P_RespTour): Timeline => {
  const timeline: Timeline = [];

  const screenHash: Record<number, P_RespScreen> = {};
  const flatAnns: Record<string, IAnnotationConfigWithScreen> = {};
  for (const annPerScreen of allAnns) {
    screenHash[annPerScreen.screen.id] = annPerScreen.screen;
    for (const ann of annPerScreen.annotations) {
      flatAnns[ann.refId] = {
        ...ann,
        screen: annPerScreen.screen,
        stepNumber: ''
      };
    }
  }

  // get first anns
  const firstAnns: IAnnotationConfigWithScreen[] = [];
  Object.values(flatAnns).forEach(ann => {
    const prevBtn = getAnnotationBtn(ann, 'prev')!;
    if (!prevBtn.hotspot || prevBtn.hotspot.actionType === 'open') {
      firstAnns.push(ann);
    }
  });

  firstAnns.forEach(firstAnn => {
    const singleTimeline: IAnnotationConfigWithScreen[] = [];
    let ann = firstAnn;
    while (true) {
      singleTimeline.push(ann);

      const nextBtn = getAnnotationBtn(ann, 'next')!;
      if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
        break;
      }
      const nextAnnRefId = nextBtn.hotspot.actionValue.split('/')[1];
      ann = flatAnns[nextAnnRefId];
    }
    timeline.push(singleTimeline);
  });

  const localStoreTimeline = getFableTimelineOrder();

  if (localStoreTimeline.order.length === 0 || tour.rid !== localStoreTimeline.rid) {
    const newTimelineOrder = generateTimelineOrder(timeline);
    saveFableTimelineOrder({ order: newTimelineOrder, rid: tour.rid });
  } else {
    timeline.sort(
      (a, b) => localStoreTimeline.order.indexOf(a[0].grpId) - localStoreTimeline.order.indexOf(b[0].grpId)
    );
  }

  const timelineWithScreenIndices = assignStepNumbersToAnnotations(timeline);
  return timelineWithScreenIndices;
};

interface IAppStateProps {
  subs: P_RespSubscription | null;
  org: RespOrg | null;
  tour: P_RespTour | null;
  screen: P_RespScreen | null;
  screenData: ScreenData | null;
  isScreenLoaded: boolean;
  isTourLoaded: boolean;
  flattenedScreens: P_RespScreen[];
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  tourOpts: ITourDataOpts;
  allAnnotationsForTour: AnnotationPerScreen[];
  principal: RespUser | null;
  timeline: Timeline;
  relayScreenId: number | null;
  relayAnnAdd: AnnAdd | null;
  tourMainVailidity: TourMainValidity;
  annotationSerialIdMap: Record<string, string>;
  isAutoSaving: boolean;
  tourDiagnostics: ITourDiganostics;
  journey: JourneyData | null;
  pubTourAssetPath: string;
  manifestFileName: string;
  elpathKey: ElPathKey;
  featurePlan: FeatureForPlan | null;
  vanityDomains: P_RespVanityDomain[] | null;
}

function __dbg(anns: AnnotationPerScreen[]): void {
  const onlyAnns = anns.map(pair => pair.annotations);
  const flatAnns: IAnnotationConfig[] = [];
  onlyAnns.forEach(ann => flatAnns.push(...ann));
  const miniFlatAns = flatAnns.map((ann: IAnnotationConfig) => {
    const next = ann.buttons.find(btn => btn.type === 'next');
    const prev = ann.buttons.find(btn => btn.type === 'prev');
    return {
      id: ann.id,
      refId: ann.refId,
      text: ann.displayText,
      next: next!.hotspot ? next?.hotspot.actionValue : null,
      prev: prev!.hotspot ? prev?.hotspot.actionValue : null,
    };
  });
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const allAnnotationsForTour = getAnnotationsPerScreen(state);
  // __dbg(allAnnotationsForTour);
  let allAnnotationsForScreen: IAnnotationConfig[] = [];
  for (const screenAnnPair of allAnnotationsForTour) {
    if (screenAnnPair.screen.id === state.default.currentScreen?.id) {
      allAnnotationsForScreen = screenAnnPair.annotations.slice(0);
    }
  }
  const hm: Record<string, IAnnotationConfig> = {};
  for (const an of allAnnotationsForScreen) {
    if (an.id in hm) {
      if (hm[an.id].updatedAt < an.updatedAt) {
        hm[an.id] = an;
      }
    } else {
      hm[an.id] = an;
    }
  }
  allAnnotationsForScreen = Object.values(hm).sort((m, n) => m.createdAt - n.createdAt);

  let allEdits = [
    ...(state.default.currentScreen?.id ? state.default.localEdits[state.default.currentScreen.id] || [] : []),
    ...(state.default.currentScreen?.id ? state.default.remoteEdits[state.default.currentScreen.id] || [] : []),
  ];

  const hm2: Record<string, EditItem> = {};
  for (const edit of allEdits) {
    const key = edit[IdxEditItem.KEY];
    if (key in hm2) {
      if (hm2[key][IdxEditItem.TIMESTAMP] < edit[IdxEditItem.TIMESTAMP]) {
        hm2[key] = edit;
      }
    } else {
      hm2[key] = edit;
    }
  }
  allEdits = Object.values(hm2).sort((m, n) => m[IdxEditItem.TIMESTAMP] - n[IdxEditItem.TIMESTAMP]);

  const tourOpts = state.default.localTourOpts || state.default.remoteTourOpts || getDefaultTourOpts();
  let tourMainVailidity: TourMainValidity = TourMainValidity.Valid;
  let annotationSerialIdMap: Record<string, string> = {};
  if (state.default.tourLoaded) {
    tourMainVailidity = getTourMainValidity(tourOpts, state.default.journey, allAnnotationsForTour);
    annotationSerialIdMap = getAnnotationSerialIdMap(tourOpts.main, allAnnotationsForTour);
  }

  return {
    subs: state.default.subs,
    org: state.default.org,
    tour: state.default.currentTour,
    isTourLoaded: state.default.tourLoaded,
    screen: state.default.currentScreen,
    flattenedScreens: state.default.allScreens,
    screenData: state.default.currentScreen ? state.default.screenData[state.default.currentScreen.id] : null,
    isScreenLoaded: state.default.screenLoadingStatus === LoadingStatus.Done,
    allEdits,
    tourMainVailidity,
    timeline: state.default.tourLoaded ? getTimeline(allAnnotationsForTour, state.default.currentTour!) : [],
    allAnnotationsForScreen,
    allAnnotationsForTour,
    tourOpts,
    principal: state.default.principal,
    relayScreenId: state.default.relayScreenId,
    relayAnnAdd: state.default.relayAnnAdd,
    annotationSerialIdMap,
    isAutoSaving: state.default.isAutoSaving,
    tourDiagnostics: state.default.tourData?.diagnostics || {},
    journey: state.default.journey,
    pubTourAssetPath: state.default.commonConfig?.pubTourAssetPath || '',
    manifestFileName: state.default.commonConfig?.manifestFileName || '',
    elpathKey: state.default.elpathKey,
    featurePlan: state.default.featureForPlan,
    vanityDomains: state.default.vanityDomains,
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
    screenId: string;
    annotationId?: string;
  }>;
interface IOwnStateProps {
  alertMsg: string;
  showScreenPicker: boolean;
  screenPickerData: ScreenPickerData;
  lastAnnHasCTA: boolean;
  isJourneyCTASet: boolean;
  isEntryPointMediaAnn: null | 'main' | 'module';
}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  private static LOCAL_STORAGE_KEY_PREFIX = 'fable/syncnd';

  private static LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK = `${TourEditor.LOCAL_STORAGE_KEY_PREFIX}/editchunk`;

  private static LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA = `${TourEditor.LOCAL_STORAGE_KEY_PREFIX}/index`;

  private chunkSyncManager: ChunkSyncManager | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      alertMsg: '',
      showScreenPicker: false,
      screenPickerData: {
        screenPickerMode: 'create',
        annotation: null,
        position: DestinationAnnotationPosition.next,
        showCloseButton: true,
      },
      lastAnnHasCTA: true,
      isJourneyCTASet: true,
      isEntryPointMediaAnn: null,
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;
    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
    setEventCommonState(CmnEvtProp.TOUR_URL, createIframeSrc(`/demo/${this.props.match.params.tourId}`));
    this.chunkSyncManager = new ChunkSyncManager(SyncTarget.LocalStorage, TourEditor.LOCAL_STORAGE_KEY_PREFIX, {
      onSyncNeeded: this.flushEdits,
    });
    if (this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
    this.props.getVanityDomains();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    this.chunkSyncManager?.startIfNotAlreadyStarted(this.onLocalEditsLeft);
    if (prevProps.match.params.screenId !== this.props.match.params.screenId && this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
    if ((prevProps.relayScreenId !== this.props.relayScreenId
      || prevProps.relayAnnAdd !== this.props.relayAnnAdd)
      && (this.props.relayScreenId && this.props.relayAnnAdd)) {
      const newAnnConfig = addNewAnn(
        this.props.allAnnotationsForTour,
        {
          position: this.props.relayAnnAdd.position,
          refId: this.props.relayAnnAdd.refId,
          screenId: this.props.relayScreenId,
          grpId: this.props.relayAnnAdd.grpId
        },
        this.props.tourOpts,
        this.showHideAlert,
        this.applyAnnButtonLinkMutations,
        null,
        this.props.clearRelayScreenAndAnnAdd
      );
      this.navFn(`${this.props.relayScreenId}/${newAnnConfig.refId}`, 'annotation-hotspot');
    }
    try {
      if (this.props.isTourLoaded && this.props.searchParams.get('g') === '1' && this.props.timeline.length > 0) {
        const ann = this.props.timeline[0][0];
        this.props.navigate(`/demo/${this.props.tour!.rid}/${ann.screen.rid}/${ann.refId}`);
      }
    } catch (err) {
      sentryCaptureException(err as Error);
    }

    if (this.props.isTourLoaded && this.props.allAnnotationsForTour !== prevProps.allAnnotationsForTour) {
      const timer = setTimeout(() => {
        const lastAnnHasCTA = this.getLastAnnHasCTA();
        this.setState({ lastAnnHasCTA });
        clearTimeout(timer);
      }, 0);
    }

    if (this.props.isTourLoaded && this.props.journey !== prevProps.journey) {
      const timer = setTimeout(() => {
        const isJourneyCTASet = this.getIsJourneyCTASet();
        this.setState({ isJourneyCTASet });
        clearTimeout(timer);
      }, 0);
    }

    if (this.props.isTourLoaded && (
      this.props.journey !== prevProps.journey
      && this.props.allAnnotationsForTour !== prevProps.allAnnotationsForTour)) {
      const isEntryPointMediaAnn = this.getIsAnyOfTheEntryPointMediaAnn();
      this.setState({ isEntryPointMediaAnn });
    }
  }

  navigateTo = (qualifiedAnnotaionUri: string): void => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.flattenedScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/demo/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}`;
      this.props.navigate(url);
    } else {
      throw new Error(`Can't navigate because screenId ${screenId} is not found`);
    }
  };

  navigateBackToTour = (): void => {
    this.props.navigate(`/demo/${this.props.tour!.rid}`);
  };

  onLocalEditsLeft = (key: string, edits: AllEdits<ElEditType>): void => {
    if (!this.props.screen) {
      // TODO this check should not be there as screen should alaways be present, but turning it off causes error
      // sometime.Investigate
      return;
    }
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK) || key.endsWith(this.props.screen.rid)) {
      this.props.saveEditChunks(this.props.screen!, edits);
    }

    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA)) {
      // TODO[now] sync with server
    }
  };

  getStorageKeyForType(type: 'edit-chunk' | 'tour-data', key?: string): string {
    switch (type) {
      case 'edit-chunk':
        return `${TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK}/${key ?? this.props.screen?.id!}`;

      case 'tour-data':
        return `${TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA}/${this.props.tour?.rid!}`;

      default:
        return '';
    }
  }

  isLoadingComplete = (): boolean => {
    let result = true;
    if (this.props.match.params.tourId) {
      result = result && this.props.isTourLoaded;
    }
    if (this.props.screen === null && this.props.match.params.screenId) {
      result = result && this.props.isScreenLoaded;
    }
    return result;
  };

  isTourLoadingComplete = (): boolean => {
    let result = true;
    if (this.props.match.params.tourId) {
      result = result && this.props.isTourLoaded;
    }
    return result;
  };

  isInCanvas = (): boolean => !!(this.props.match.params.tourId && this.props.match.params.screenId);

  getHeaderTxtEl = (): React.ReactElement => {
    if (!this.isLoadingComplete()) {
      return (
        <div>
          <Loader width="80px" />
        </div>
      );
    }

    let firstLine;
    let secondLine;
    if (this.props.match.params.tourId && this.props.match.params.screenId) {
      firstLine = (
        <>
          For interactive demo <span className="emph">{this.props.tour?.displayName}</span> edit screen
        </>
      );
      secondLine = this.props.screen?.displayName;
    } else if (this.props.match.params.tourId) {
      firstLine = <>Edit demo</>;
      secondLine = this.props.tour?.displayName;
    } else {
      firstLine = <>Edit screen</>;
      secondLine = this.props.screen?.displayName;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GTags.Txt className="subsubhead overflow-ellipsis">{firstLine}</GTags.Txt>
        <GTags.Txt className="overflow-ellipsis" style={{ fontWeight: 500 }}>
          {secondLine}
        </GTags.Txt>
      </div>
    );
  };

  componentWillUnmount(): void {
    this.chunkSyncManager?.end();
    this.props.clearCurrentScreenSelection();
    this.props.clearCurrentTourSelection();
  }

  navFn: NavFn = (uri, type) => {
    if (type === 'annotation-hotspot') {
      this.navigateTo(uri);
    } else {
      openTourExternalLink(uri);
    }
  };

  getHeaderLeftGroup = (): ReactElement[] => {
    if (this.props.match.params.screenId) {
      return [(
        <div style={{ marginLeft: '0.25rem' }}>
          <Tooltip title="Go to Canvas" overlayStyle={{ fontSize: '0.75rem' }}>
            <Button
              id="go-to-canvas-btn"
              size="small"
              shape="circle"
              type="text"
              icon={<ArrowLeftOutlined />}
              style={{ color: '#fff' }}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                this.props.navigate(`/demo/${this.props.tour?.rid}`);
              }}
            />
          </Tooltip>
        </div>
      )];
    }
    return [];
  };

  getCurrentScreenDiagnostics(): ScreenDiagnostics[] {
    if (!this.props.screen) return [];
    const screenDiags = this.props.tourDiagnostics[this.props.screen!.id];

    if (!screenDiags || screenDiags.length === 0) {
      return [];
    }

    return screenDiags;
  }

  updateShowScreenPicker = (newScreenPickerData: ScreenPickerData): void => {
    this.setState({ showScreenPicker: true, screenPickerData: newScreenPickerData });
  };

  getIsAnyOfTheEntryPointMediaAnn = (): null | 'main' | 'module' => {
    const tourMainValidity = getTourMainValidity(
      this.props.tourOpts,
      this.props.journey,
      this.props.allAnnotationsForTour
    );
    if (tourMainValidity !== TourMainValidity.Valid) return null;

    if (this.props.journey && this.props.journey.flows.length !== 0) {
      for (const flow of this.props.journey.flows) {
        const entryPointAnn = getAnnotationByRefId(flow.main.split('/')[1], this.props.allAnnotationsForTour)!;
        if (isMediaAnnotation(entryPointAnn)) {
          return 'module';
        }
      }
    } else {
      const entryPointAnn = getAnnotationByRefId(
        this.props.tourOpts.main.split('/')[1],
        this.props.allAnnotationsForTour
      )!;
      if (isMediaAnnotation(entryPointAnn)) {
        return 'main';
      }
    }
    return null;
  };

  getIsJourneyCTASet = (): boolean => {
    if (this.props.journey!.flows.length === 0) {
      return true;
    }

    if (this.props.journey!.cta && this.props.journey!.cta.navigateTo) {
      return true;
    }
    return false;
  };

  getLastAnnHasCTA = (): boolean => {
    const flowLength = this.props.journey!.flows.length;
    if (flowLength === 0 && this.props.tourMainVailidity !== TourMainValidity.Valid) {
      return false;
    }
    let refId = '';

    if (flowLength === 0) {
      refId = this.props.tourOpts.main.split('/')[1];
    } else {
      const lastFlow = this.props.journey!.flows[flowLength - 1];
      refId = lastFlow.main.split('/')[1];
    }

    let ann = getAnnotationByRefId(refId, this.props.allAnnotationsForTour);
    let lastAnn = null;

    let allAnnsLength = this.props.allAnnotationsForTour.length;
    while (allAnnsLength) {
      if (ann === null) {
        return false;
      }
      const nextBtn = getAnnotationBtn(ann!, 'next')!;
      if (!nextBtn.hotspot || nextBtn.hotspot.actionType === 'open') {
        lastAnn = ann;
        break;
      }
      const nextAnnRefId = nextBtn.hotspot.actionValue.split('/')[1];
      ann = getAnnotationByRefId(nextAnnRefId, this.props.allAnnotationsForTour);
      allAnnsLength--;
    }

    let hasCta = false;
    if (lastAnn) {
      lastAnn.buttons.forEach(btn => {
        if ((btn.type === 'custom' || btn.type === 'next') && btn.hotspot !== null && btn.exclude !== true) {
          hasCta = true;
        }
      });
    }
    return hasCta;
  };

  render(): ReactElement {
    if (!this.isTourLoadingComplete()) {
      return (
        <div>
          <FullPageTopLoader showLogo text="Loading demo" />
        </div>
      );
    }

    return (
      <GTags.ColCon>
        <GTags.BodyCon style={{
          height: '100%',
          background: '#fff',
          overflowY: 'hidden',
        }}
        >
          <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <Canvas
              updateTourProp={this.props.updateTourProp}
              subs={this.props.subs}
              publishTour={this.props.publishTour}
              applyAnnGrpIdMutations={
                (mutations: AnnUpdateType, tx: Tx) => this.applyAnnGrpIdMutations(mutations, tx)
              }
              applyAnnButtonLinkMutations={this.applyAnnButtonLinkMutations}
              tourOpts={this.props.tourOpts}
              key={this.props.tour?.rid}
              toAnnotationId={this.props.match.params.annotationId || ''}
              allAnnotationsForTour={this.props.allAnnotationsForTour}
              navigate={this.navigateTo}
              navigateBackToTour={this.navigateBackToTour}
              setAlert={this.showHideAlert}
              onTourDataChange={this.onTourDataChange}
              tour={this.props.tour!}
              timeline={this.props.timeline}
              commitTx={this.commitTx}
              shouldShowScreenPicker={this.updateShowScreenPicker}
              annotationSerialIdMap={this.props.annotationSerialIdMap}
              screen={this.props.screen!}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              allAnnotationsForScreen={this.props.allAnnotationsForScreen}
              onScreenEditStart={this.onScreenEditStart}
              onScreenEditFinish={this.onScreenEditFinish}
              onScreenEditChange={this.onScreenEditChange}
              onAnnotationCreateOrChange={
                (screenId, c, actionType, o, tx) => this.onTourDataChange(
                  'annotation-and-theme',
                  screenId,
                  { config: c, actionType, opts: o },
                  tx
                )
              }
              isScreenLoaded={this.props.isScreenLoaded}
              shouldShowOnlyScreen={Boolean(
                this.props.match.params.screenId && !this.props.match.params.annotationId
              )}
              updateScreen={this.props.updateScreen}
              onTourJourneyChange={this.onOptsOrJourneyDataChange}
              headerProps={{
                navigateToWhenLogoIsClicked: '/demos',
                titleElOnLeft: this.getHeaderTxtEl(),
                leftElGroups: this.getHeaderLeftGroup(),
                principal: this.props.principal,
                org: this.props.org,
                titleText: this.props.screen?.displayName,
                renameScreen: (newVal: string) => this.props.renameScreen(this.props.screen!, newVal),
                showRenameIcon: this.isInCanvas(),
                tourMainValidity: this.props.tourMainVailidity,
                screenDiagnostics: this.getCurrentScreenDiagnostics(),
                isAutoSaving: this.props.isAutoSaving,
                tour: this.props.tour,
                isJourneyCTASet: this.state.isJourneyCTASet,
                lastAnnHasCTA: this.state.lastAnnHasCTA,
                onSiteDataChange: this.onSiteDataChange,
                showCalendar: true,
                isEntryPointMediaAnn: this.state.isEntryPointMediaAnn,
                vanityDomains: this.props.vanityDomains,
              }}
              journey={this.props.journey!}
              manifestPath={`${this.props.pubTourAssetPath}${this.props.tour?.rid}/${this.props.manifestFileName}`}
              elpathKey={this.props.elpathKey}
              updateElPathKey={this.props.updateElPathKey}
              featurePlan={this.props.featurePlan}
            />

          </div>
          {this.state.alertMsg && <Alert
            style={{ position: 'absolute', left: '0', bottom: '0', width: '100%', zIndex: 101 }}
            message="Error"
            description={this.state.alertMsg}
            type="warning"
            showIcon
            closable
            onClose={() => this.setState({ alertMsg: '' })}
          />}
          {this.state.showScreenPicker
            && <ScreenPicker
              hideScreenPicker={() => { this.setState({ showScreenPicker: false }); }}
              screenPickerMode={this.state.screenPickerData.screenPickerMode}
              addCoverAnnToScreen={(screenId) => {
                const newAnnConfig = addNewAnn(
                  this.props.allAnnotationsForTour,
                  {
                    position: this.state.screenPickerData.position,
                    refId: this.state.screenPickerData.annotation!.refId,
                    screenId,
                    grpId: this.state.screenPickerData.annotation!.grpId
                  },
                  this.props.tourOpts,
                  this.showHideAlert,
                  this.applyAnnButtonLinkMutations,
                );
                this.navFn(`${screenId}/${newAnnConfig.refId}`, 'annotation-hotspot');
              }}
              addAnnotationData={this.state.screenPickerData.annotation}
              showCloseButton={this.state.screenPickerData.showCloseButton}
              position={this.state.screenPickerData.position}
            />}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }

  showHideAlert = (msg?: string): void => {
    this.setState({ alertMsg: msg || DEFAULT_ALERT_FOR_ANN_OPS });
  };

  private updateButton = (
    config: IAnnotationConfig,
    btnId: string,
    screenId: number,
    actionValue: string | null,
    opts: ITourDataOpts | null | undefined,
    tx?: Tx,
    grpId: string = config.grpId,
  ): IAnnotationConfig => {
    let btnUpdate: ReturnType<typeof updateButtonProp>;
    config = { ...config, grpId };

    if (actionValue) {
      btnUpdate = updateButtonProp(config, btnId, 'hotspot', {
        type: 'an-btn',
        on: 'click',
        target: '$this',
        actionType: config.buttons.find(btn => btn.id === btnId)!.hotspot?.actionType || 'navigate',
        actionValue
      });
    } else {
      btnUpdate = updateButtonProp(config, btnId, 'hotspot', null);
    }

    this.onTourDataChange('annotation-and-theme', screenId, {
      config: btnUpdate,
      opts,
      actionType: 'upsert'
    }, tx);

    return btnUpdate;
  };

  private updateGrpId = (
    config: IAnnotationConfig,
    screenId: number,
    grpId: string,
    tx?: Tx,
  ): IAnnotationConfig => {
    config = { ...config, grpId };

    this.onTourDataChange('annotation-and-theme', screenId, {
      config,
      actionType: 'upsert'
    }, tx);

    return config;
  };

  applyAnnButtonLinkMutations = (mutations: AnnUpdateType): void => {
    const tx = new Tx();
    tx.start();
    let newOpts = this.props.tourOpts;
    if (mutations.main) {
      newOpts = updateTourDataOpts(newOpts, 'main', mutations.main);
    }

    if (mutations.deletionUpdate) {
      this.onTourDataChange('annotation-and-theme', mutations.deletionUpdate.screenId, {
        config: mutations.deletionUpdate.config,
        opts: newOpts,
        actionType: 'delete'
      }, tx);
    }

    for (const annUpdates of Object.values(mutations.groupedUpdates)) {
      let newAnnUpdate = null;

      for (const update of annUpdates) {
        newAnnUpdate = this.updateButton(
          newAnnUpdate || update.config,
          update.btnId,
          update.screenId,
          update.actionValue,
          newOpts,
          tx,
          update.grpId || update.config.grpId,
        );
      }
    }

    this.commitTx(tx);
  };

  applyAnnGrpIdMutations = (mutations: AnnUpdateType, tx: Tx): void => {
    for (const annUpdates of Object.values(mutations.groupedUpdates)) {
      let newAnnUpdate = null;

      for (const update of annUpdates) {
        newAnnUpdate = this.updateGrpId(
          newAnnUpdate || update.config,
          update.screenId,
          update.grpId!,
          tx,
        );
      }
    }
  };

  private flushEdits = (key: string, value: AllEdits<ElEditType> | TourDataWoScheme): void => {
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK)) {
      const screenIdRid = key.substring(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK.length + 1);
      const tValue = value as AllEdits<ElEditType>;
      this.props.flushEditChunksToMasterFile(screenIdRid, tValue);
    } else if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA)) {
      const tValue = value as TourDataWoScheme;
      this.props.flushTourDataToMasterFile(this.props.tour!, tValue);
    }
  };

  // eslint-disable-next-line class-methods-use-this
  private onScreenEditStart = (): void => { /* noop */ };

  // eslint-disable-next-line class-methods-use-this
  private onScreenEditFinish = (): void => { /* noop */ };

  private onTourDataChange: TourDataChangeFn = (changeType, screenId, changeObj, tx, isDefault = false) => {
    if (screenId === null && !this.props.isScreenLoaded) {
      // If currentscreen is not loaded and an mutation on current screen is requested, then we silently drop the
      // mutation request
      return;
    }
    this.props.startAutoSaving();
    if (changeType === 'annotation-and-theme') {
      const partialTourData: Partial<TourDataWoScheme> = {
        opts: isDefault
          ? (this.props.tourOpts || changeObj.opts)
          : (changeObj.opts || this.props.tourOpts),
        entities: {
          [screenId || this.props.screen!.id]: {
            type: 'screen',
            ref: `${this.props.screen?.id!}`,
            annotations: {
              [changeObj.config.id]: changeObj.actionType === 'upsert' ? changeObj.config : null
            }
          } as TourScreenEntity
        },
        journey: this.props.journey!
      };

      const mergedData = this.chunkSyncManager!.add(
        this.getStorageKeyForType('tour-data'),
        partialTourData,
        (storedEntities: TourDataWoScheme | null, e: Partial<TourDataWoScheme>) => {
          if (storedEntities === null) {
            return e as TourDataWoScheme;
          }
          return mergeTourData(storedEntities, e);
        },
        tx
      );
      if (!tx) this.props.saveTourData(this.props.tour!, mergedData!);
    }
  };

  private commitTx = (tx: Tx): void => {
    tx.end();
    const mergedData = tx.getData() as TourDataWoScheme;
    this.props.saveTourData(this.props.tour!, mergedData);
  };

  private onScreenEditChange = (forScreen: P_RespScreen, editChunks: AllEdits<ElEditType>): void => {
    this.props.startAutoSaving();
    const mergedEditChunks = this.chunkSyncManager!.add(
      this.getStorageKeyForType('edit-chunk', `${forScreen.id}/${forScreen.rid}`),
      editChunks,
      (storedEdits: AllEdits<ElEditType> | null, edits: AllEdits<ElEditType>) => {
        if (storedEdits === null) {
          return edits;
        }
        return mergeEdits(storedEdits, edits);
      }
    );
    this.props.saveEditChunks(forScreen, mergedEditChunks!);
  };

  private onOptsOrJourneyDataChange = (
    newOpts: ITourDataOpts | null,
    newJourney: JourneyData | null,
    tx?: Tx
  ): void => {
    this.props.startAutoSaving();

    const journey = newJourney
      ? { ...newJourney, flows: newJourney.flows.filter((flow) => !isBlankString(flow.main)) } : this.props.journey!;

    const partialTourData: Partial<TourDataWoScheme> = {
      journey,
      opts: newOpts || this.props.tourOpts,
      entities: {}
    };

    const mergedData = this.chunkSyncManager!.add(
      this.getStorageKeyForType('tour-data'),
      partialTourData,
      (storedEntities: TourDataWoScheme | null, e: Partial<TourDataWoScheme>) => {
        if (storedEntities === null) {
          return e as TourDataWoScheme;
        }
        return mergeTourData(storedEntities, e);
      },
      tx
    );

    if (!tx) this.props.saveTourData(this.props.tour!, mergedData!);
  };

  private onSiteDataChange = (site: SiteData): void => {
    this.props.updateTourProp(this.props.tour!.rid, 'site', site);
  };
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
