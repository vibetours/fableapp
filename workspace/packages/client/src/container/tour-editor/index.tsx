import {
  AnnotationPerScreen,
  IAnnotationConfig, ScreenData, ITourDataOpts, TourDataWoScheme, TourScreenEntity
} from '@fable/common/dist/types';
import React from 'react';
import { connect } from 'react-redux';
import {
  copyScreenForCurrentTour,
  createPlaceholderTour,
  flushEditChunksToMasterFile,
  flushTourDataToMasterFile,
  getAllScreens,
  loadScreenAndData,
  loadTourAndData,
  saveEditChunks,
  savePlaceHolderTour,
  saveTourData
} from '../../action/creator';
import * as GTags from '../../common-styled';
import { getDefaultTourOpts } from '../../component/annotation/annotation-config-utils';
import Header from '../../component/header';
import ScreenEditor from '../../component/screen-editor';
import Canvas from '../../component/tour-canvas';
import { mergeEdits, mergeTourData, P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { AllEdits, EditItem, ElEditType, IdxEditItem } from '../../types';
import ChunkSyncManager, { SyncTarget } from './chunk-sync-manager';

interface IDispatchProps {
  loadTourAndData: (rid: string) => void;
  getAllScreens: () => void;
  createPlaceholderTour: () => void;
  loadScreenAndData: (rid: string, isPreviewMode: boolean) => void;
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  saveTourData: (tour: P_RespTour, data: TourDataWoScheme) => void;
  flushEditChunksToMasterFile: (screen: P_RespScreen, edits: AllEdits<ElEditType>) => void;
  flushTourDataToMasterFile: (tour: P_RespTour, edits: TourDataWoScheme) => void;
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
  getAllScreens: () => dispatch(getAllScreens()),
  createPlaceholderTour: () => dispatch(createPlaceholderTour()),
  loadScreenAndData: (rid: string, isPreviewMode: boolean) => dispatch(loadScreenAndData(rid, isPreviewMode)),
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true)),
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => dispatch(savePlaceHolderTour(tour, screen)),
  copyScreenForCurrentTour:
    (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
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
  isScreenInPreviewMode: boolean;
  allAnnotationsForScreen: IAnnotationConfig[];
  tourOpts: ITourDataOpts;
  allAnnotationsForTour: AnnotationPerScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const anPerScreen: AnnotationPerScreen[] = [];
  for (const [screenId, an] of Object.entries(state.default.remoteAnnotations)) {
    const screen = state.default.flattenedScreens.find(s => s.id === +screenId);
    if (screen) {
      anPerScreen.push({ screen, annotations: an });
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
  allAnnotationsForScreen = Object.values(hm).sort((m, n) => m.updatedAt - n.updatedAt);

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
    flattenedScreens: state.default.flattenedScreens,
    screenData: state.default.screenData,
    isScreenLoaded: state.default.screenLoaded,
    screens: state.default.screens,
    isScreenInPreviewMode: state.default.isScreenInPreviewMode,
    allEdits,
    allAnnotationsForScreen,
    allAnnotationsForTour: anPerScreen,
    tourOpts: state.default.localTourOpts || state.default.remoteTourOpts || getDefaultTourOpts()
  };
};

interface IOwnProps {
  playMode?: boolean;
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
    if (this.props.playMode) {
      this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
    } else {
      const isPreviewMode = !this.props.match.params.tourId;

      if (isPreviewMode) {
        this.props.createPlaceholderTour();
      } else {
        this.props.loadTourAndData(this.props.match.params.tourId);
      }
      if (this.props.match.params.screenId) {
        this.props.loadScreenAndData(this.props.match.params.screenId, isPreviewMode);
      }

      // TODO dont' run this in play mode
      this.chunkSyncManager = new ChunkSyncManager(SyncTarget.LocalStorage, TourEditor.LOCAL_STORAGE_KEY_PREFIX, {
        onSyncNeeded: this.flushEdits,
      });
      this.props.getAllScreens();
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (!this.props.playMode) {
      if (prevProps.isTourLoaded && prevProps.tour?.isPlaceholder === true && !this.props.tour?.isPlaceholder) {
        this.props.copyScreenForCurrentTour(this.props.tour!, this.props.screen!);
      }
      if (this.props.isScreenLoaded && !this.props.isScreenInPreviewMode) {
        this.chunkSyncManager?.startIfNotAlreadyStarted(this.onLocalEditsLeft);
      }
    } else if (prevProps.isTourLoaded !== this.props.isTourLoaded && this.props.isTourLoaded) {
      const main = this.props.tourOpts.main;
      if (!main) {
        throw new Error('No main in config');
      }
      this.navigateTo(main);
    }

    if (prevProps.match.params.screenId !== this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId, false);
    }
  }

  navigateTo = (qualifiedAnnotaionUri: string) => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.flattenedScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `${this.props.playMode ? '/p' : ''}/tour/${this.props.tour!.rid}/${screen.rid}/${anId}`;
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
  }

  render() {
    if (!this.isLoadingComplete()) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        {!this.props.playMode && (
          <GTags.HeaderCon>
            <Header
              shouldShowLogoOnLeft
              navigateToWhenLogoIsClicked={!this.props.match.params.tourId ? '/screens' : '/tours'}
              titleElOnLeft={this.getHeaderTxtEl()}
              showPreview={`/p/tour/${this.props.tour?.rid}`}
            />
          </GTags.HeaderCon>
        )}
        <GTags.BodyCon style={{
          height: '100%',
          background: '#fff',
          padding: this.props.playMode ? '0' : '0.25rem 2rem'
          /* padding: '0px' */
        }}
        >
          {/*
              TODO this is temp until siddhi is done with the screen zooming via canvas
                   after that integrate as part of Canvas
            */}
          {this.shouldShowScreen() ? (
            <ScreenEditor
              key={this.props.screen?.rid}
              screen={this.props.screen!}
              playMode={!!this.props.playMode}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              toAnnotationId={this.props.match.params.annotationId}
              navigate={(uri, type) => {
                if (type === 'annotation-hotspot') {
                  this.navigateTo(uri);
                } else {
                  window.open(uri, '_blank')?.focus();
                }
              }}
              createDefaultAnnotation={
                (c, o) => this.onTourDataChange('annotation-and-theme', null, { config: c, opts: o }, true)
              }
              allAnnotationsForScreen={this.props.allAnnotationsForScreen}
              allAnnotationsForTour={this.props.allAnnotationsForTour}
              tourDataOpts={this.props.tourOpts}
              onScreenEditStart={this.onScreenEditStart}
              onScreenEditFinish={this.onScreenEditFinish}
              onScreenEditChange={this.onScreenEditChange}
              onAnnotationCreateOrChange={
                (screenId, c, o) => this.onTourDataChange('annotation-and-theme', screenId, { config: c, opts: o })
              }
            />
          ) : (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div>
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }

  private flushEdits = (key: string, value: AllEdits<ElEditType> | TourDataWoScheme) => {
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK)) {
      const tValue = value as AllEdits<ElEditType>;
      this.props.flushEditChunksToMasterFile(this.props.screen!, tValue);
    } else if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_TOUR_DATA)) {
      const tValue = value as TourDataWoScheme;
      this.props.flushTourDataToMasterFile(this.props.tour!, tValue);
    }
  };

  private onScreenEditStart = () => {
    if (this.props.tour?.isPlaceholder) {
      this.props.savePlaceHolderTour(this.props.tour, this.props.screen!);
    }
  };

  // eslint-disable-next-line class-methods-use-this
  private onScreenEditFinish = () => { /* noop */ };

  private onTourDataChange = (
    changeType: 'annotation-and-theme' | 'screen',
    screenId: number | null,
    changeObj: {config: IAnnotationConfig, opts: ITourDataOpts | null},
    isDefault = false
  ) => {
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
              [changeObj.config.id]: changeObj.config
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
