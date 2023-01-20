import React from 'react';
import { connect } from 'react-redux';
import { ScreenData, TourData } from '@fable/common/dist/types';
import {
  copyScreenForCurrentTour,
  createPlaceholderTour,
  flushEditChunksToMasterFile,
  getAllScreens,
  loadScreenAndData,
  loadTourAndData,
  saveEditChunks,
  savePlaceHolderTour,
} from '../../action/creator';
import { mergeEdits, P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import Header from '../../component/header';
import * as GTags from '../../common-styled';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Canvas from '../../component/tour-canvas';
import ScreenEditor from '../../component/screen-editor';
import { AllEdits, EditItem, ElEditType } from '../../types';
import ChunkSyncManager, { SyncTarget } from './chunk-sync-manager';

interface IDispatchProps {
  loadTourAndData: (rid: string) => void;
  getAllScreens: () => void;
  createPlaceholderTour: () => void;
  loadScreenAndData: (rid: string, isPreviewMode: boolean) => void;
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  flushEditChunksToMasterFile: (screen: P_RespScreen, edits: AllEdits<ElEditType>) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
  getAllScreens: () => dispatch(getAllScreens()),
  createPlaceholderTour: () => dispatch(createPlaceholderTour()),
  loadScreenAndData: (rid: string, isPreviewMode: boolean) => dispatch(loadScreenAndData(rid, isPreviewMode)),
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => dispatch(savePlaceHolderTour(tour, screen)),
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => dispatch(saveEditChunks(screen, editChunks)),
  flushEditChunksToMasterFile: (screen: P_RespScreen, edits: AllEdits<ElEditType>) => dispatch(flushEditChunksToMasterFile(screen, edits)),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screen: P_RespScreen | null;
  screenData: ScreenData | null;
  tourData: TourData | null;
  isScreenLoaded: boolean;
  isTourLoaded: boolean;
  screens: P_RespScreen[];
  allEdits: EditItem[];
  isScreenInPreviewMode: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  tourData: state.default.tourData,
  isTourLoaded: state.default.tourLoaded,
  screen: state.default.currentScreen,
  screenData: state.default.screenData,
  isScreenLoaded: state.default.screenLoaded,
  screens: state.default.screens,
  isScreenInPreviewMode: state.default.isScreenInPreviewMode,
  allEdits: [
    ...(state.default.currentScreen?.rid ? state.default.localEdits[state.default.currentScreen.rid] || [] : []),
    ...(state.default.currentScreen?.rid ? state.default.remoteEdits[state.default.currentScreen.rid] || [] : [])
  ],
});

interface IOwnProps {}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
  }>;
interface IOwnStateProps {}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  private static LOCAL_STORAGE_KEY_PREFIX = 'fable/editchunk';

  private chunkSyncManager: ChunkSyncManager | null = null;

  componentDidMount(): void {
    const isPreviewMode = !this.props.match.params.tourId;
    if (isPreviewMode) {
      this.props.createPlaceholderTour();
    } else {
      this.props.loadTourAndData(this.props.match.params.tourId);
    }
    if (this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId, isPreviewMode);
    }

    // TODO do this only when add screen to tour button is clicked from
    this.props.getAllScreens();
    this.chunkSyncManager = new ChunkSyncManager(SyncTarget.LocalStorage, TourEditor.LOCAL_STORAGE_KEY_PREFIX, {
      onSyncNeeded: this.flushEdits,
    });
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (prevProps.isTourLoaded && prevProps.tour?.isPlaceholder === true && !this.props.tour?.isPlaceholder) {
      this.props.copyScreenForCurrentTour(this.props.tour!, this.props.screen!);
    }
    if (this.props.isScreenLoaded && !this.props.isScreenInPreviewMode) {
      this.chunkSyncManager?.startIfNotAlreadyStarted(this.onLocalEditsLeft);
    }
  }

  onLocalEditsLeft = (key: string, edits: AllEdits<ElEditType>) => {
    if (key.endsWith(this.props.screen!.rid)) {
      this.props.saveEditChunks(this.props.screen!, edits);
    }
  };

  getStorageKeyForEditChunks(type: 'edit-chunk'): string {
    switch (type) {
      case 'edit-chunk':
        return `${TourEditor.LOCAL_STORAGE_KEY_PREFIX}/${this.props.screen?.rid!}`;

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
        <GTags.HeaderCon>
          <Header
            shouldShowLogoOnLeft
            navigateToWhenLogoIsClicked={!this.props.match.params.tourId ? '/screens' : '/tours'}
            titleElOnLeft={this.getHeaderTxtEl()}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fff' /* padding: '0px' */ }}>
          {/*
              TODO this is temp until siddhi is done with the screen zooming via canvas
                   after that integrate as part of Canvas
            */}
          {this.shouldShowScreen() ? (
            <ScreenEditor
              screen={this.props.screen!}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              onScreenEditStart={this.onScreenEditStart}
              onScreenEditFinish={this.onScreenEditFinish}
              onScreenEditChange={this.onScreenEditChange}
            />
          ) : (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div>
          )}
          {/*
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div> */}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }

  private flushEdits = (key: string, value: AllEdits<ElEditType>) => {
    this.props.flushEditChunksToMasterFile(this.props.screen!, value);
  };

  private onScreenEditStart = () => {
    if (this.props.tour?.isPlaceholder) {
      this.props.savePlaceHolderTour(this.props.tour, this.props.screen!);
    }
  };

  private onScreenEditFinish = () => {};

  private onScreenEditChange = (editChunks: AllEdits<ElEditType>) => {
    const mergedEditChunks = this.chunkSyncManager!.add(
      this.getStorageKeyForEditChunks('edit-chunk'),
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
