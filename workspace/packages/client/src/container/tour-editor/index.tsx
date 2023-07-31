import {
  IAnnotationConfig,
  IAnnotationOriginConfig,
  ITourDataOpts,
  LoadingStatus,
  ScreenData,
  TourData,
  TourDataWoScheme,
  TourScreenEntity
} from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';
import { RespUser } from '@fable/common/dist/api-contract';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { getDefaultTourOpts, getSampleConfig } from '@fable/common/dist/utils';
import {
  AnnAdd,
  clearCurrentScreenSelection,
  clearCurrentTourSelection,
  clearRelayScreenAndAnnAdd,
  flushEditChunksToMasterFile,
  flushTourDataToMasterFile,
  getAllScreens,
  loadScreenAndData,
  loadTourAndData,
  renameScreen,
  saveEditChunks,
  saveTourData
} from '../../action/creator';
import * as GTags from '../../common-styled';
import {
  updateButtonProp,
  updateTourDataOpts
} from '../../component/annotation/annotation-config-utils';
import Header from '../../component/header';
import ScreenEditor, { ITimelineConfig } from '../../component/screen-editor';
import Canvas from '../../component/tour-canvas';
import { mergeEdits, mergeTourData, P_RespScreen, P_RespTour } from '../../entity-processor';
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
  ConnectedOrderedAnnGroupedByScreen
} from '../../types';
import ChunkSyncManager, { SyncTarget, Tx } from './chunk-sync-manager';
import { openTourExternalLink, getAnnotationsPerScreen } from '../../utils';
import HeartLoader from '../../component/loader/heart';
import {
  addPrevAnnotation,
  addNextAnnotation,
  getAnnotationSerialIdMap
} from '../../component/annotation/ops';
import { AnnUpdateType } from '../../component/timeline/types';
import Loader from '../../component/loader';

interface IDispatchProps {
  loadScreenAndData: (rid: string) => void;
  saveEditChunks: (screen: P_RespScreen, editChunks: AllEdits<ElEditType>) => void;
  saveTourData: (tour: P_RespTour, data: TourDataWoScheme) => void;
  flushEditChunksToMasterFile: (screen: P_RespScreen, edits: AllEdits<ElEditType>) => void;
  flushTourDataToMasterFile: (tour: P_RespTour, edits: TourDataWoScheme) => void;
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  clearCurrentScreenSelection: () => void,
  clearCurrentTourSelection: () => void,
  clearRelayScreenAndAnnAdd: () => void;
  renameScreen: (screen: P_RespScreen, newVal: string) => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true)),
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
  renameScreen: (screen: P_RespScreen, newVal: string) => dispatch(renameScreen(screen, newVal)),
  clearRelayScreenAndAnnAdd: () => dispatch(clearRelayScreenAndAnnAdd()),
});

const getTimeLine = (allAnns: AnnotationPerScreen[]): ConnectedOrderedAnnGroupedByScreen => {
  const screenHash: Record<number, P_RespScreen> = {};
  const flatAnns: Record<string, IAnnotationConfigWithScreen> = {};
  for (const annPerScreen of allAnns) {
    screenHash[annPerScreen.screen.id] = annPerScreen.screen;
    for (const ann of annPerScreen.annotations) {
      flatAnns[ann.refId] = {
        ...ann,
        screen: annPerScreen.screen
      };
    }
  }

  // Every connected screen is one array
  // inside each connected screen, each screen group is one array
  const orderedAnns: ConnectedOrderedAnnGroupedByScreen = [];
  while (true) {
    const anns = Object.values(flatAnns);
    if (!anns.length) {
      break;
    }
    const connectedOrderedAnn: IAnnotationConfigWithScreen[] = [];

    // traverse the list to go to the very first annotation
    let ann = anns[0];
    while (true) {
      const prevBtn = ann.buttons.find(btn => btn.type === 'prev')!;
      if (prevBtn.hotspot && prevBtn.hotspot.actionType === 'navigate') {
        ann = flatAnns[prevBtn.hotspot.actionValue.split('/')[1]];
      } else {
        break;
      }
    }

    while (true) {
      connectedOrderedAnn.push(ann);
      delete flatAnns[ann.refId];
      const nextBtn = ann.buttons.find(btn => btn.type === 'next')!;
      if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
        ann = flatAnns[nextBtn.hotspot.actionValue.split('/')[1]];
      } else {
        break;
      }
    }

    const connectedOrderAnnotationGroupByScreen: IAnnotationConfigWithScreen[][] = [];
    let annotationGroupByScreen: IAnnotationConfigWithScreen[] = [];
    let prevScreenId = -1;
    for (let i = 0, l = connectedOrderedAnn.length; i < l; i++) {
      const an = connectedOrderedAnn[i];
      if (an.screen.id === prevScreenId) {
        annotationGroupByScreen.push(an);
      } else {
        annotationGroupByScreen = [an];
        prevScreenId = an.screen.id;
        connectedOrderAnnotationGroupByScreen.push(annotationGroupByScreen);
      }
    }

    orderedAnns.push(connectedOrderAnnotationGroupByScreen);
  }
  return orderedAnns;
};

interface IAppStateProps {
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
  tourData: TourData | null;
  principal: RespUser | null;
  timeline: ConnectedOrderedAnnGroupedByScreen;
  relayScreenId: number | null;
  relayAnnAdd: AnnAdd | null;
  annotationSerialIdMap: Record<string, number>;
}

const mapStateToProps = (state: TState): IAppStateProps => {
  const anPerScreen = getAnnotationsPerScreen(state);
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

  const allAnnotationsForTour = getAnnotationsPerScreen(state);

  const tourOpts = state.default.localTourOpts || state.default.remoteTourOpts || getDefaultTourOpts();

  const annotationSerialIdMap: Record<string, number> = getAnnotationSerialIdMap(tourOpts, allAnnotationsForTour);

  return {
    tour: state.default.currentTour,
    isTourLoaded: state.default.tourLoaded,
    screen: state.default.currentScreen,
    flattenedScreens: state.default.allScreens,
    screenData: state.default.currentScreen ? state.default.screenData[state.default.currentScreen.id] : null,
    isScreenLoaded: state.default.screenLoadingStatus === LoadingStatus.Done,
    tourData: state.default.tourData,
    allEdits,
    timeline: getTimeLine(anPerScreen),
    allAnnotationsForScreen,
    allAnnotationsForTour,
    tourOpts,
    principal: state.default.principal,
    relayScreenId: state.default.relayScreenId,
    relayAnnAdd: state.default.relayAnnAdd,
    annotationSerialIdMap
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
interface IOwnStateProps { }

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
    if (this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    this.chunkSyncManager?.startIfNotAlreadyStarted(this.onLocalEditsLeft);
    if (prevProps.match.params.screenId !== this.props.match.params.screenId && this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }
    if ((prevProps.relayScreenId !== this.props.relayScreenId
      || prevProps.relayAnnAdd !== this.props.relayAnnAdd)
      && (this.props.relayScreenId && this.props.relayAnnAdd)) {
      const newAnnConfig = getSampleConfig('$');
      let result;
      if (this.props.relayAnnAdd.pos === 'prev') {
        result = addPrevAnnotation(
          { ...newAnnConfig, screenId: this.props.relayScreenId },
          this.props.relayAnnAdd.refId,
          this.props.allAnnotationsForTour,
          this.props.tourOpts.main,
        );
      } else {
        result = addNextAnnotation(
          { ...newAnnConfig, screenId: this.props.relayScreenId },
          this.props.relayAnnAdd.refId,
          this.props.allAnnotationsForTour,
          null,
        );
      }

      this.applyAnnButtonLinkMutations(result);
      this.props.clearRelayScreenAndAnnAdd();
    }
  }

  navigateTo = (qualifiedAnnotaionUri: string): void => {
    const [screenId, anId] = qualifiedAnnotaionUri.split('/');
    const screen = this.props.flattenedScreens.find(s => s.id === +screenId);
    if (screen) {
      const url = `/tour/${this.props.tour!.rid}/${screen.rid}${anId ? `/${anId}` : ''}`;
      this.props.navigate(url);
    } else {
      throw new Error(`Can't navigate because screenId ${screenId} is not found`);
    }
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

  isLoadingComplete = (): boolean => {
    let result = true;
    if (this.props.match.params.tourId) {
      result = result && this.props.isTourLoaded;
    }
    if (this.props.match.params.screenId) {
      result = result && this.props.isScreenLoaded;
    }
    return result;
  };

  shouldShowScreen = (): boolean => {
    let result = false;
    if (this.props.match.params.screenId) {
      result = this.props.isScreenLoaded;
      if (this.props.match.params.tourId) {
        result = result && this.props.isTourLoaded;
      }
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
        <GTags.Txt style={{ fontWeight: 500 }}>
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
              size="small"
              shape="circle"
              type="text"
              icon={<ArrowLeftOutlined />}
              style={{ color: '#fff' }}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                this.props.navigate(`/tour/${this.props.tour?.rid}`);
              }}
            />
          </Tooltip>
        </div>
      )];
    }
    return [];
  };

  render(): ReactElement {
    if (!this.isLoadingComplete()) {
      return (
        <div>
          <Loader width="80px" txtBefore="Loading tour" />
        </div>
      );
    }

    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={this.getHeaderTxtEl()}
            leftElGroups={this.getHeaderLeftGroup()}
            principal={this.props.principal}
            titleText={this.props.screen?.displayName}
            renameScreen={(newVal: string) => this.props.renameScreen(this.props.screen!, newVal)}
            showRenameIcon={this.isInCanvas()}
            showPreview={`/p/tour/${this.props.tour?.rid}`}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{
          height: '100%',
          background: '#fff',
          overflowY: 'hidden',
        }}
        >
          {this.shouldShowScreen() ? (
            <ScreenEditor
              annotationSerialIdMap={this.props.annotationSerialIdMap}
              key={this.props.screen!.rid}
              screen={this.props.screen!}
              tour={this.props.tour!}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              toAnnotationId={this.props.match.params.annotationId || ''}
              navigate={this.navFn}
              timeline={this.props.timeline}
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
              applyAnnButtonLinkMutations={this.applyAnnButtonLinkMutations}
            />
          ) : (this.isLoadingComplete() ? (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas
                applyAnnButtonLinkMutations={this.applyAnnButtonLinkMutations}
                tourOpts={this.props.tourOpts}
                key={this.props.tour?.rid}
                allAnnotationsForTour={this.props.allAnnotationsForTour}
                navigate={this.navigateTo}
                onTourDataChange={this.onTourDataChange}
                tour={this.props.tour!}
                timeline={this.props.timeline}
                commitTx={this.commitTx}
              />
            </div>
          ) : (<HeartLoader />)
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }

  private updateButton = (
    config: IAnnotationConfig,
    btnId: string,
    screenId: number,
    actionValue: string | null,
    opts: ITourDataOpts | null | undefined,
    tx?: Tx
  ): IAnnotationConfig => {
    let btnUpdate: ReturnType<typeof updateButtonProp>;

    if (actionValue) {
      btnUpdate = updateButtonProp(config, btnId, 'hotspot', {
        type: 'an-btn',
        on: 'click',
        target: '$this',
        actionType: 'navigate',
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
        opts: null,
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
          tx
        );
      }
    }

    this.commitTx(tx);
  };

  private createDefaultAnnotation = (config: IAnnotationConfig, opts: ITourDataOpts): void => {
    const flatAnnsForTour: [number, IAnnotationConfig][] = [];
    for (const annPerScreen of this.props.allAnnotationsForTour) {
      for (const ann of annPerScreen.annotations) {
        if (ann.refId === config.refId) continue;
        flatAnnsForTour.push([annPerScreen.screen.id, ann]);
      }
    }

    flatAnnsForTour.sort((m, n) => n[1].createdAt - m[1].createdAt);

    const currentScreenId = this.props.screen!.id;

    const lastEntity = this.props.tourData!.entities[this.props.screen!.id!];
    // TODO[rr] this extra step is required because if an annotation is deleted and created again
    // the annotation object in tour index.tsx remains. we have to delete it from tour file and then
    let noAnnotationPresent = false;
    let annotations: IAnnotationOriginConfig[] = [];
    if (!lastEntity) {
      noAnnotationPresent = true;
    } else {
      annotations = Object.values((lastEntity as TourScreenEntity).annotations || {});
      if (annotations.length === 0) {
        noAnnotationPresent = true;
      }
    }

    if (noAnnotationPresent) {
      this.onTourDataChange('annotation-and-theme', this.props.screen!.id, {
        config,
        opts,
        actionType: 'upsert'
      });
      this.props.navigate(`${config.refId}`);
      return;
    }

    const lastEntityAnnotations = annotations.sort((m, n) => m.createdAt - n.createdAt);
    const lastAnnotation = lastEntityAnnotations.at(-1) as IAnnotationConfig;

    let newOpts = opts;
    const newConfig = config;
    const thisAnnQid = `${this.props.screen!.id}/${config.refId}`;
    if (flatAnnsForTour.length === 0) {
      // For the first time add the first annotation id as entry point
      newOpts = updateTourDataOpts(opts, 'main', thisAnnQid);
    } else if (lastAnnotation) {
      const lastAnnNextBtn = lastAnnotation.buttons.find(btn => btn.type === 'next')!;
      this.updateButton(lastAnnotation, lastAnnNextBtn.id, currentScreenId, `${currentScreenId}/${config.refId}`, opts);

      const currentAnnPrevButton = config.buttons.find(btn => btn.type === 'prev')!;
      const currentAnnNextButton = config.buttons.find(btn => btn.type === 'next')!;
      const currentAnnConfig = this.updateButton(
        config,
        currentAnnPrevButton.id,
        currentScreenId,
        `${currentScreenId}/${lastAnnotation.refId}`,
        opts
      );

      if (lastAnnNextBtn.hotspot && lastAnnNextBtn.hotspot.actionType === 'navigate') {
        const nextEntityId = lastAnnNextBtn.hotspot.actionValue.split('/')[0];
        const nextEntity = this.props.tourData!.entities[nextEntityId];
        const nextEntityAnnotations = Object.values((nextEntity as TourScreenEntity).annotations)
          .sort((m, n) => m.createdAt - n.createdAt);
        const nextAnnotation = nextEntityAnnotations[0] as IAnnotationConfig;
        const nextAnnPrevBtn = nextAnnotation.buttons.find(btn => btn.type === 'prev')!;
        this.updateButton(nextAnnotation, nextAnnPrevBtn.id, +nextEntityId, `${currentScreenId}/${config.refId}`, opts);
        this.updateButton(
          currentAnnConfig,
          currentAnnNextButton.id,
          currentScreenId,
          `${nextEntityId}/${nextAnnotation.refId}`,
          opts
        );
      }
    }
  };

  private flushEdits = (key: string, value: AllEdits<ElEditType> | TourDataWoScheme): void => {
    if (key.startsWith(TourEditor.LOCAL_STORAGE_KEY_PREFIX_EDIT_CHUNK)) {
      const tValue = value as AllEdits<ElEditType>;
      this.props.flushEditChunksToMasterFile(this.props.screen!, tValue);
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

  private onScreenEditChange = (editChunks: AllEdits<ElEditType>): void => {
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
    this.props.saveEditChunks(this.props.screen!, mergedEditChunks!);
  };
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
