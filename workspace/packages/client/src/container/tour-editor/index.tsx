import {
  IAnnotationButton,
  IAnnotationConfig,
  IAnnotationOriginConfig,
  ITourDataOpts,
  LoadingStatus,
  ScreenData,
  TourData,
  TourDataWoScheme,
  TourEntity,
  TourScreenEntity
} from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import Tooltip from 'antd/lib/tooltip';
import Button from 'antd/lib/button';
import { RespUser } from '@fable/common/dist/api-contract';
import { ArrowLeftOutlined } from '@ant-design/icons';
import err from '../../deffered-error';
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
import ScreenEditor, { ITimelineConfig } from '../../component/screen-editor';
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
  tourData: TourData | null;
  principal: RespUser | null;
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
      } else {
        err(`screenId ${screenId} is part of tour config, but is not present as part of entity association`);
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
    tourData: state.default.tourData,
    allEdits,
    allAnnotationsForScreen,
    allAnnotationsForTour: anPerScreen,
    tourOpts: state.default.localTourOpts || state.default.remoteTourOpts || getDefaultTourOpts(),
    principal: state.default.principal,
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
    if (!this.props.screen) {
      // [todo] this check should not be there as screen should alaways be present, but turning it off causes error
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
        <GTags.Txt style={{ fontWeight: 500 }}>
          {secondLine}
        </GTags.Txt>
      </div>
    );
  };

  getBoundaryAnnotations = () => {
    const anns = this.props.allAnnotationsForScreen;

    let first: IAnnotationConfig | null = null;
    let last: IAnnotationConfig | null = null;

    for (let i = 0; i < anns.length; i++) {
      const config = anns[i];
      const prevBtn = config.buttons.filter((btn) => btn.type === 'prev')[0];

      if (!prevBtn.hotspot) {
        first = config;
      } else {
        const prevScreenId = +prevBtn.hotspot.actionValue.split('/')[0];
        if (prevScreenId !== this.props.screen!.id) {
          first = config;
        }
      }

      const nextBtn = config.buttons.filter((btn) => btn.type === 'next')[0];

      if (!nextBtn.hotspot) {
        last = config;
      } else if (nextBtn.hotspot.actionType === 'open') {
        last = config;
      } else {
        const nextScreenId = +nextBtn.hotspot.actionValue.split('/')[0];
        if (nextScreenId !== this.props.screen!.id) {
          last = config;
        }
      }
    }

    return [first, last];
  };

  getCurrentScreenAnnotations = () => {
    const [firstAnn, lastAnn] = this.getBoundaryAnnotations();

    if (!firstAnn || !lastAnn) {
      return [];
    }

    const firstAnnPtr = `${this.props.screen!.id}/${firstAnn.refId}`;
    const nextScreenAnnQId = this.getNextScreenAnnQId(lastAnn);

    let curr: string | null = firstAnnPtr || null;

    const annotations = [];
    while (curr !== null && curr !== nextScreenAnnQId) {
      const [screenId, refId] = curr!.split('/');
      const annConfig = this.getAnnotationsByScreenId(+screenId).find(val => val.refId === refId)!;
      annotations.push({ ...annConfig, screenId });
      const configHotspot = annConfig.buttons.find(btn => btn.type === 'next')!.hotspot;
      if (!configHotspot) {
        curr = null;
      } else if (configHotspot.actionType === 'open') {
        curr = null;
      } else {
        curr = configHotspot.actionValue;
      }
    }

    return annotations;
  };

  // eslint-disable-next-line class-methods-use-this
  getNextScreenAnnQId = (lastAnnOfCurrScreen: IAnnotationConfig) => {
    const nextBtn = lastAnnOfCurrScreen.buttons.filter((btn) => btn.type === 'next')[0];

    if (!nextBtn.hotspot) {
      return null;
    }

    if (nextBtn.hotspot.actionType === 'open') {
      return null;
    }

    return nextBtn.hotspot.actionValue;
  };

  getPrevScreen = (currentScreenAnnotations: IAnnotationConfig[]) => {
    if (currentScreenAnnotations.length === 0) {
      return undefined;
    }
    const prevScreenId = currentScreenAnnotations[0].buttons
      .find(btn => btn.type === 'prev')?.hotspot?.actionValue.split('/')[0] || '';

    return this.props.tour!.screens!.find(screen => screen.id === +prevScreenId);
  };

  getNextScreen = (currentScreenAnnotations: IAnnotationConfig[]) => {
    if (currentScreenAnnotations.length === 0) {
      return undefined;
    }
    const nextScreenId = currentScreenAnnotations[currentScreenAnnotations.length - 1].buttons
      .find(btn => btn.type === 'next')?.hotspot?.actionValue.split('/')[0] || '';

    return this.props.tour!.screens!.find(screen => screen.id === +nextScreenId);
  };

  getAnnotationsByScreenId(screenId: number) {
    const anns = this.props.allAnnotationsForTour.find(c => c.screen.id === screenId);
    return anns?.annotations || [];
  }

  // eslint-disable-next-line class-methods-use-this
  getPrevAnn = (currentScreenAnnotations: IAnnotationConfig[]) => {
    if (currentScreenAnnotations.length === 0) {
      return null;
    }
    const ann = currentScreenAnnotations[0].buttons
      .find(btn => btn.type === 'prev')?.hotspot?.actionValue.split('/')[1] || null;
    return ann;
  };

  // eslint-disable-next-line class-methods-use-this
  getNextAnn = (currentScreenAnnotations: IAnnotationConfig[]) => {
    if (currentScreenAnnotations.length === 0) {
      return null;
    }
    const ann = currentScreenAnnotations[currentScreenAnnotations.length - 1].buttons
      .find(btn => btn.type === 'next')?.hotspot?.actionValue.split('/')[1] || null;
    return ann;
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

  getTimeLineProps(): ITimelineConfig {
    // [todo] this gets called multiple time, but this is needed only once. Fix this
    const currentScreenAnnotations = this.getCurrentScreenAnnotations();
    return {
      currentScreenAnnotations,
      nextScreen: this.getNextScreen(currentScreenAnnotations),
      prevScreen: this.getPrevScreen(currentScreenAnnotations),
      nextAnnotation: this.getNextAnn(currentScreenAnnotations),
      prevAnnotation: this.getPrevAnn(currentScreenAnnotations),
    };
  }

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

  render() {
    if (!this.isLoadingComplete()) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={this.getHeaderTxtEl()}
            leftElGroups={this.getHeaderLeftGroup()}
            principal={this.props.principal}
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
              key={this.props.screen!.rid}
              screen={this.props.screen!}
              screenData={this.props.screenData!}
              allEdits={this.props.allEdits}
              toAnnotationId={this.props.match.params.annotationId || ''}
              navigate={this.navFn}
              timelineConfig={this.getTimeLineProps()}
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

  private updateButton = (
    config: IAnnotationConfig,
    btnId: string,
    screenId: number,
    actionValue: string,
    opts: ITourDataOpts | null | undefined
  ) => {
    const btnUpdate = updateButtonProp(config, btnId, 'hotspot', {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue
    });

    this.onTourDataChange('annotation-and-theme', screenId, {
      config: btnUpdate,
      opts,
      actionType: 'upsert'
    });

    return btnUpdate;
  };

  private createDefaultAnnotation = (config: IAnnotationConfig, opts: ITourDataOpts) => {
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

    if (!lastEntity) {
      this.onTourDataChange('annotation-and-theme', this.props.screen!.id, {
        config,
        opts,
        actionType: 'upsert'
      });
      this.props.navigate(`${config.refId}`);
      return;
    }

    const lastEntityAnnotations = Object.values((lastEntity as TourScreenEntity).annotations)
      .sort((m, n) => m.createdAt - n.createdAt);
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

      if (lastAnnNextBtn.hotspot) {
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
    // this.onTourDataChange('annotation-and-theme', null, {
    //   config: newConfig,
    //   opts: newOpts,
    //   actionType: 'upsert'
    // }, flatAnnsForTour.length !== 0 /* for the first default annotation respect the value set for opts */);
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
