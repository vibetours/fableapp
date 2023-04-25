import {
  IAnnotationConfig,
  ITourDataOpts,
  LoadingStatus,
  ScreenData,
  TourDataWoScheme,
  TourScreenEntity
} from '@fable/common/dist/types';
import React from 'react';
import { connect } from 'react-redux';
import {
  clearCurrentScreenSelection,
  clearCurrentTourSelection,
  copyScreenForCurrentTour,
  flushEditChunksToMasterFile,
  flushTourDataToMasterFile,
  getAllScreens,
  loadScreenAndData,
  loadTourAndData,
  saveEditChunks,
  saveTourData
} from '../../action/creator';
import * as GTags from '../../common-styled';
import {
  getDefaultTourOpts,
  updateButtonProp,
  updateTourDataOpts
} from '../../component/annotation/annotation-config-utils';
import Header from '../../component/header';
import ScreenEditor from '../../component/screen-editor';
import Canvas from '../../component/tour-canvas';
import { mergeEdits, mergeTourData, P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { AllEdits, AnnotationPerScreen, EditItem, ElEditType, IdxEditItem, TourDataChangeFn, NavFn } from '../../types';
import ChunkSyncManager, { SyncTarget } from './chunk-sync-manager';
import PreviewWithEditsAndAnRO from '../../component/screen-editor/preview-with-edits-and-annotations-readonly';

interface IDispatchProps {
  getAllScreens: () => void;
  loadScreenAndData: (rid: string) => void;
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  saveTourData: (tour: P_RespTour, data: TourDataWoScheme) => void;
  flushEditChunksToMasterFile: (screen: P_RespScreen, edits: AllEdits<ElEditType>) => void;
  flushTourDataToMasterFile: (tour: P_RespTour, edits: TourDataWoScheme) => void;
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  clearCurrentScreenSelection: () => void,
  clearCurrentTourSelection: () => void,
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllScreens: () => dispatch(getAllScreens()),
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true)),
  copyScreenForCurrentTour:
    (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen, false)),
  saveEditChunks:
    (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => dispatch(saveEditChunks(screen, editChunks)),
  flushEditChunksToMasterFile:
    (screen: P_RespScreen, edits: AllEdits<ElEditType>) => dispatch(flushEditChunksToMasterFile(screen, edits)),
  saveTourData:
    (
      tour: P_RespTour,
      data: TourDataWoScheme,
    ) => dispatch(saveTourData(tour, data)),
  flushTourDataToMasterFile:
    (tour: P_RespTour, edits: TourDataWoScheme) => dispatch(flushTourDataToMasterFile(tour, edits)),
  clearCurrentScreenSelection: () => dispatch(clearCurrentScreenSelection()),
  clearCurrentTourSelection: () => dispatch(clearCurrentTourSelection()),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screen: P_RespScreen | null;
  screenData: ScreenData | null;
  isScreenLoaded: boolean;
  isTourLoaded: boolean;
  screens: P_RespScreen[];
  flattenedScreens: P_RespScreen[];
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  tourOpts: ITourDataOpts;
  allAnnotationsForTour: AnnotationPerScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const anPerScreen: AnnotationPerScreen[] = [];
  const combinedAnnotations: Record<string, IAnnotationConfig> = {};
  for (const [screenId, anns] of Object.entries(state.default.localAnnotations)) {
    for (const an of anns) {
      combinedAnnotations[`${screenId}/${an.refId}`] = an;
    }
  }
  for (const [screenId, anns] of Object.entries(state.default.remoteAnnotations)) {
    for (const an of anns) {
      const key = `${screenId}/${an.refId}`;
      if (!(key in combinedAnnotations)) {
        combinedAnnotations[key] = an;
      }
    }
  }
  const screenAnMap: Record<string, IAnnotationConfig[]> = {};
  for (const [qId, an] of Object.entries(combinedAnnotations)) {
    const [screenId] = qId.split('/');
    if (screenId in screenAnMap) {
      screenAnMap[screenId].push(an);
    } else {
      screenAnMap[screenId] = [an];
      const screen = state.default.allScreens.find(s => s.id === +screenId);
      if (screen) {
        anPerScreen.push({ screen, annotations: screenAnMap[screenId] });
      }
    }
  }
  // If there are screen present as part of a tour but no annotation is yet made then also we
  // show this
  const screensForTours = state.default.currentTour?.screens || [];
  for (const screen of screensForTours) {
    if (!(screen.id in screenAnMap)) {
      anPerScreen.push({ screen, annotations: [] });
    }
  }

  let allAnnotationsForScreen = [
    ...(state.default.currentScreen?.id ? state.default.localAnnotations[state.default.currentScreen.id] || [] : []),
    ...(state.default.currentScreen?.id ? state.default.remoteAnnotations[state.default.currentScreen.id] || [] : []),
  ];
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

  return {
    tour: state.default.currentTour,
    isTourLoaded: state.default.tourLoaded,
    screen: state.default.currentScreen,
    flattenedScreens: state.default.allScreens,
    screenData: state.default.currentScreen ? state.default.screenData[state.default.currentScreen.id] : null,
    isScreenLoaded: state.default.screenLoadingStatus === LoadingStatus.Done,
    screens: state.default.rootScreens,
    allEdits,
    allAnnotationsForScreen,
    allAnnotationsForTour: anPerScreen,
    tourOpts: state.default.localTourOpts || state.default.remoteTourOpts || getDefaultTourOpts()
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
interface IOwnStateProps {}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  private static LOCAL_STORAGE_KEY_PREFIX = 'fable/syncnd';

  private static LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK = `${TourEditor.LOCAL_STORAGE_KEY_PREFIX}/editchunk`;

  private static LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA = `${TourEditor.LOCAL_STORAGE_KEY_PREFIX}/index`;

  private chunkSyncManager: ChunkSyncManager | null = null;

  componentDidMount(): void {
    document.title = this.props.title;
    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
    this.chunkSyncManager = new ChunkSyncManager(SyncTarget.LocalStorage, TourEditor.LOCAL_STORAGE_KEY_PREFIX, {
      onSyncNeeded: this.flushEdits,
    });
    this.props.getAllScreens();
    if (this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    this.chunkSyncManager?.startIfNotAlreadyStarted(this.onLocalEditsLeft);
    if (prevProps.match.params.screenId !== this.props.match.params.screenId && this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
  }

  navigateTo = (qualifiedAnnotaionUri: string) => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.flattenedScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/tour/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}`;
      this.props.navigate(url);
    } else {
      throw new Error(`Can't navigate because screenId ${screenId} is not found`);
    }
  };

  onLocalEditsLeft = (key: string, edits: AllEdits<ElEditType>) => {
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK) || key.endsWith(this.props.screen!.rid)) {
      this.props.saveEditChunks(this.props.screen!, edits);
    }

    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA)) {
      // TODO[now] sync with server
    }
  };

  getStorageKeyForType(type: 'edit-chunk' | 'tour-data'): string {
    switch (type) {
      case 'edit-chunk':
        return `${TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK}/${this.props.screen?.id!}`;

      case 'tour-data':
        return `${TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA}/${this.props.tour?.rid!}`;

      default:
        return '';
    }
  }

  isLoadingComplete = () => {
    let result = true;
    if (this.props.match.params.tourId) {
      result = result && this.props.isTourLoaded;
    }
    if (this.props.match.params.screenId) {
      result = result && this.props.isScreenLoaded;
    }
    return result;
  };

  shouldShowScreen = () => {
    let result = false;
    if (this.props.match.params.screenId) {
      result = this.props.isScreenLoaded;
      if (this.props.match.params.tourId) {
        result = result && this.props.isTourLoaded;
      }
    }
    return result;
  };

  getHeaderTxtEl = (): React.ReactElement => {
    if (!this.isLoadingComplete()) {
      return <>TODO show loading bar</>;
    }

    let firstLine;
    let secondLine;
    if (this.props.match.params.tourId && this.props.match.params.screenId) {
      firstLine = (
        <>
          For tour <span className="emph">{this.props.tour?.displayName}</span> edit screen
        </>
      );
      secondLine = this.props.screen?.displayName;
    } else if (this.props.match.params.tourId) {
      firstLine = <>Edit tour</>;
      secondLine = this.props.tour?.displayName;
    } else {
      firstLine = <>Edit screen</>;
      secondLine = this.props.screen?.displayName;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GTags.Txt className="subsubhead">{firstLine}</GTags.Txt>
        <GTags.Txt className="head" style={{ lineHeight: '1.5rem' }}>
          {secondLine}
        </GTags.Txt>
      </div>
    );
  };

  componentWillUnmount() {
    this.chunkSyncManager?.end();
    this.props.clearCurrentScreenSelection();
    this.props.clearCurrentTourSelection();
  }

  navFn: NavFn = (uri, type) => {
    if (type === 'annotation-hotspot') {
      this.navigateTo(uri);
    } else {
      window.open(uri, '_blank')?.focus();
    }
  };

  render() {
    if (!this.isLoadingComplete()) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            shouldShowLogoOnLeft
            navigateToWhenLogoIsClicked={!this.props.match.params.tourId ? '/screens' : '/tours'}
            titleElOnLeft={this.getHeaderTxtEl()}
            showPreview={`/p/tour/${this.props.tour?.rid}`}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{
          height: 'calc(100% - 72px)',
          background: '#fff',
          padding: !this.shouldShowScreen() ? '0' : '0.25rem 2rem',
          overflowY: 'hidden',
        }}
        >
          {this.shouldShowScreen() ? (
            <ScreenEditor
              key={this.props.screen?.rid}
              screen={this.props.screen!}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              toAnnotationId={this.props.match.params.annotationId || ''}
              navigate={this.navFn}
              createDefaultAnnotation={this.createDefaultAnnotation}
              allAnnotationsForScreen={this.props.allAnnotationsForScreen}
              allAnnotationsForTour={this.props.allAnnotationsForTour}
              tourDataOpts={this.props.tourOpts}
              onScreenEditStart={this.onScreenEditStart}
              onScreenEditFinish={this.onScreenEditFinish}
              onScreenEditChange={this.onScreenEditChange}
              onAnnotationCreateOrChange={
                (screenId, c, actionType, o) => this.onTourDataChange(
                  'annotation-and-theme',
                  screenId,
                  { config: c, actionType, opts: o }
                )
              }
            />
          ) : (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas
                key={this.props.tour?.rid}
                addScreenToTour={
                  (screen: P_RespScreen) => this.props.copyScreenForCurrentTour(this.props.tour!, screen)
                }
                rootScreens={this.props.screens}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                navigate={this.navigateTo}
                onTourDataChange={this.onTourDataChange}
              />
            </div>
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }

  private createDefaultAnnotation = (config: IAnnotationConfig, opts: ITourDataOpts) => {
    const flatAnnsForTour: [number, IAnnotationConfig][] = [];
    for (const annPerScreen of this.props.allAnnotationsForTour) {
      for (const ann of annPerScreen.annotations) {
        if (ann.refId === config.refId) continue;
        flatAnnsForTour.push([annPerScreen.screen.id, ann]);
      }
    }

    flatAnnsForTour.sort((m, n) => n[1].createdAt - m[1].createdAt);

    let newOpts = opts;
    let newConfig = config;
    const thisAnnQid = `${this.props.screen!.id}/${config.refId}`;
    if (flatAnnsForTour.length === 0) {
      // For the first time add the first annotation id as entry point
      newOpts = updateTourDataOpts(opts, 'main', thisAnnQid);
    } else {
      const [screenId, latestAnn] = flatAnnsForTour[0];
      const nextBtnOfLatestAnn = latestAnn.buttons.find(btn => btn.type === 'next')!;
      const prevBtnOfNewAnn = config.buttons.find(btn => btn.type === 'prev')!;
      const nextBtnOfNewAnn = config.buttons.find(btn => btn.type === 'next')!;
      if (prevBtnOfNewAnn.hotspot === null && nextBtnOfNewAnn.hotspot === null && nextBtnOfLatestAnn.hotspot === null) {
        const update = updateButtonProp(latestAnn, nextBtnOfLatestAnn.id, 'hotspot', {
          type: 'an-btn',
          on: 'click',
          target: '$this',
          actionType: 'navigate',
          actionValue: thisAnnQid,
        });
        this.onTourDataChange('annotation-and-theme', screenId, {
          config: update,
          opts,
          actionType: 'upsert'
        });

        newConfig = updateButtonProp(config, prevBtnOfNewAnn.id, 'hotspot', {
          type: 'an-btn',
          on: 'click',
          target: '$this',
          actionType: 'navigate',
          actionValue: `${screenId}/${latestAnn.refId}`,
        });
      }
    }
    this.onTourDataChange('annotation-and-theme', null, {
      config: newConfig,
      opts: newOpts,
      actionType: 'upsert'
    }, flatAnnsForTour.length !== 0 /* for the first default annotation respect the value set for opts */);
  };

  private flushEdits = (key: string, value: AllEdits<ElEditType> | TourDataWoScheme) => {
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK)) {
      const tValue = value as AllEdits<ElEditType>;
      this.props.flushEditChunksToMasterFile(this.props.screen!, tValue);
    } else if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA)) {
      const tValue = value as TourDataWoScheme;
      this.props.flushTourDataToMasterFile(this.props.tour!, tValue);
    }
  };

  // eslint-disable-next-line class-methods-use-this
  private onScreenEditStart = () => { /* noop */ };

  // eslint-disable-next-line class-methods-use-this
  private onScreenEditFinish = () => { /* noop */ };

  private onTourDataChange: TourDataChangeFn = (changeType, screenId, changeObj, isDefault = false) => {
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
        }
      };

      const mergedData = this.chunkSyncManager!.add(
        this.getStorageKeyForType('tour-data'),
        partialTourData,
        (storedEntities: TourDataWoScheme | null, e: Partial<TourDataWoScheme>) => {
          if (storedEntities === null) {
            return e as TourDataWoScheme;
          }
          return mergeTourData(storedEntities, e);
        }
      );

      this.props.saveTourData(this.props.tour!, mergedData);
    }
  };

  private onScreenEditChange = (editChunks: AllEdits<ElEditType>) => {
    const mergedEditChunks = this.chunkSyncManager!.add(
      this.getStorageKeyForType('edit-chunk'),
      editChunks,
      (storedEdits: AllEdits<ElEditType> | null, edits: AllEdits<ElEditType>) => {
        if (storedEdits === null) {
          return edits;
        }
        return mergeEdits(storedEdits, edits);
      }
    );
    this.props.saveEditChunks(this.props.screen!, mergedEditChunks);
  };
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
