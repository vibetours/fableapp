import { sentryTxReport } from '@fable/common/dist/sentry';
import {
  DEFAULT_BORDER_RADIUS,
  CmnEvtProp,
  LoadingStatus,
  NODE_NAME,
  SerDoc,
  ThemeCandidature,
  ThemeStats,
  IGlobalConfig,
} from '@fable/common/dist/types';
import { captureException, startTransaction, Transaction } from '@sentry/react';
import React, { ReactElement, Suspense, lazy } from 'react';
import { connect } from 'react-redux';
import { TypeAnimation } from 'react-type-animation';
import { traceEvent } from '@fable/common/dist/amplitude';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { RespProxyAsset, RespDemoEntity, ReqSubscriptionInfo, RespSubscription } from '@fable/common/dist/api-contract';
import {
  EditFilled,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  DeleteOutlined,
  DownOutlined,
  PlusOutlined,
  CheckOutlined,
  MessageFilled,
  WalletFilled,
} from '@ant-design/icons';
import { Modal, Progress, Select, Tooltip } from 'antd';
import { getSampleConfig } from '@fable/common/dist/utils';
import { create_guides_router } from '@fable/common/dist/llm-fn-schema/create_guides_router';
import { suggest_guide_theme } from '@fable/common/dist/llm-fn-schema/suggest_guide_theme';
import api from '@fable/common/dist/api';
import { addNewTourToAllTours, getAllTours, getGlobalConfig, getSubscriptionOrCheckoutNew } from '../../action/creator';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { DB_NAME, OBJECT_KEY, OBJECT_KEY_VALUE, OBJECT_STORE } from './constants';
import { deleteDataFromDb, getDataFromDb, openDb, saveDbDataToAws } from './db-utils';
import {
  AiDataMap,
  AiItem,
  AnnotationThemeType,
  BorderRadiusThemeItem,
  ColorThemeItem,
  DBData,
  DisplayState,
  FrameDataToBeProcessed,
  InteractionCtxDetail,
  InteractionCtxWithCandidateElpath,
  LLM_IMAGE_TYPE,
  post_process_demo_p,
  ScreenInfo,
  ScreenInfoWithAI
} from './types';
import {
  createDemoUsingAI,
  FrameProcessResult,
  getAllDemoAnnotationText,
  getBorderRadius,
  getDemoMetaData,
  getDemoRouterFromExistingDemo,
  getElpathFromCandidate,
  getOrderedColorsWithScore,
  getThemeAnnotationOpts,
  getThemeData,
  handleAssetOperation,
  postProcessAIText,
  processNewScreenApiCalls,
  processScreen,
  randomScreenId,
  saveAsTour
} from './utils';
import { amplitudeAddScreensToTour } from '../../amplitude';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc, isFeatureAvailable, setEventCommonState } from '../../utils';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { PREVIEW_BASE_URL } from '../../constants';
import { uploadMarkedImageToAws } from '../../component/screen-editor/utils/upload-img-to-aws';
import * as OnbordingTags from '../user-onboarding/styled';
import * as Tags from './styled';
import FableLogo from '../../assets/fable_logo_light_bg.png';
import Button from '../../component/button';
import Input from '../../component/input';
import { OurCheckbox } from '../../common-styled';
import TextArea from '../../component/text-area';
import { getUUID } from '../../analytics/utils';
import RootLayout from '../../component/ext-onboarding/root-layout';
import ScreenCard from '../../component/create-tour/screen-card';
import SkeletonCard from '../../component/create-tour/skeleton-card';
import { AnnotationContent } from '../../component/annotation';
import Loader from '../../component/loader';
import { FeatureForPlan } from '../../plans';
import BuyMoreCredit from '../../component/create-tour/buy-more-credit';

const reactanimated = require('react-animated-css');

declare const Chargebee: any;

const LottiePlayer = lazy(() => import('@lottiefiles/react-lottie-player').then(({ Player }) => ({
  default: Player
})));

const { confirm } = Modal;

interface IDispatchProps {
  getAllTours: () => void;
  addNewTourToAllTours: (tour: RespDemoEntity) => void;
  getGlobalConfig: () => void;
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours(false)),
  addNewTourToAllTours: (tour: RespDemoEntity) => dispatch(addNewTourToAllTours(tour)),
  getGlobalConfig: () => dispatch(getGlobalConfig()),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew())
});

interface IAppStateProps {
  tours: P_RespTour[];
  allToursLoaded: boolean;
  globalConfig: IGlobalConfig | null;
  featurePlan: FeatureForPlan | null;
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  allToursLoaded: state.default.allToursLoadingStatus === LoadingStatus.Done,
  globalConfig: state.default.globalConfig,
  featurePlan: state.default.featureForPlan,
  subs: state.default.subs
});

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

type IOwnStateProps = {
  loading: boolean;
  showSaveWizard: boolean;
  saving: boolean;
  highlightDemoObjHelpText: boolean;
  highlightProductDetailsHelpText: boolean;
  showAiFlow: boolean;
  notDataFound: boolean;
  tourName: string;
  percentageProgress: Record<string, number>;
  isReadyToSave: boolean,
  isScreenProcessed: boolean,
  allScreensCreated: boolean;
  isAIProcessed: boolean,
  saveType: 'new_tour' | 'existing_tour' | null,
  existingTourRId: string | null,
  screens: ScreenInfo[];
  colorList: ColorThemeItem[];
  selectedColor: string;
  borderRadiusList: Array<BorderRadiusThemeItem>;
  selectedBorderRadius: number | 'global' | null;
  currentDisplayState: DisplayState;
  prevDisplayState: DisplayState;
  openSelect: boolean;
  showBreakIntoModule: boolean;
  isAiCreditsAvailable: boolean;
  aiCreditsAvailable: number;
  shouldBreakIntoModule: boolean;
  anonymousDemoId: string;
  productDetails: string;
  demoObjective: string;
  baseAiData: create_guides_router | null;
  imageWithMarkUrls: { id: number, url: string }[];
  aiAnnData: AiDataMap | null;
  aiThemeData: suggest_guide_theme | null;
  selectedPallete: 'ai' | 'global' | null;
  unmarkedImages: string[];
  showRetryAI: boolean;
  postProcessAiData: post_process_demo_p | null;
  creationMode: 'ai' | 'manual';
  batchProgress: number;
  aiDemoCreationSupported: boolean;
  buyCreditModalOpen: boolean;
  isBuyMoreCreditInProcess: boolean;
  aiGenerationNotPossible: boolean;
}

class CreateTour extends React.PureComponent<IProps, IOwnStateProps> {
  private data: DBData | null;

  private db: IDBDatabase | null;

  private frameDataToBeProcessed: FrameDataToBeProcessed[][];

  private sentryTransaction: Transaction | null;

  private static readonly DEFAULT_SUGGESTED_COLORS = ['#0057ff', '#321b3a', '#051527', '#ffd073', '#7567ff'];

  private startTime: number | null;

  private defaultColorsInList: string[] = [];

  private proxyCache = new Map<string, RespProxyAsset>();

  private nameTourRef = React.createRef<HTMLInputElement>();

  private interactionCtxFromId = new Map<number, InteractionCtxWithCandidateElpath>();

  private skipAnnForScreenIds: number[] = [];

  constructor(props: IProps) {
    super(props);
    this.state = {
      loading: true,
      showSaveWizard: false,
      saving: false,
      allScreensCreated: false,
      showAiFlow: false,
      percentageProgress: {},
      notDataFound: false,
      tourName: 'Untitled',
      isReadyToSave: false,
      isScreenProcessed: false,
      highlightDemoObjHelpText: false,
      highlightProductDetailsHelpText: false,
      isAIProcessed: false,
      saveType: null,
      existingTourRId: null,
      screens: [],
      colorList: [],
      selectedColor: '',
      borderRadiusList: [],
      selectedBorderRadius: null,
      currentDisplayState: DisplayState.ShowTourCreationOptions,
      prevDisplayState: DisplayState.ShowTourCreationOptions,
      openSelect: false,
      showBreakIntoModule: true,
      shouldBreakIntoModule: false,
      isAiCreditsAvailable: true,
      aiCreditsAvailable: 0,
      anonymousDemoId: getUUID(),
      demoObjective: '',
      productDetails: '',
      baseAiData: null,
      aiAnnData: null,
      aiThemeData: null,
      selectedPallete: null,
      unmarkedImages: [],
      showRetryAI: false,
      postProcessAiData: null,
      imageWithMarkUrls: [],
      creationMode: 'ai',
      batchProgress: 0,
      aiDemoCreationSupported: false,
      buyCreditModalOpen: false,
      isBuyMoreCreditInProcess: false,
      aiGenerationNotPossible: false,
    };
    this.data = null;
    this.db = null;
    this.sentryTransaction = null;
    this.frameDataToBeProcessed = [];
    this.startTime = null;
  }

  async initDbOperations(): Promise<void> {
    this.db = await openDb(DB_NAME, OBJECT_STORE, 1, OBJECT_KEY);
    const dbData = await getDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE) as DBData;
    if (dbData) {
      this.data = dbData;

      this.setState({ loading: false, showSaveWizard: true, aiDemoCreationSupported: dbData.version === '2' });
      this.processScreens();
      this.createSuggestionsForTheme();
      saveDbDataToAws(dbData, this.state.anonymousDemoId);
      return;
    }
    captureException('No data found in indexedDB in createTour');
    this.setState({ loading: false, notDataFound: true });
  }

  // eslint-disable-next-line class-methods-use-this
  createThemeCandidatesFromStats = (themeStats: ThemeStats): {
    colorList: ColorThemeItem[],
    borderRadius: Array<BorderRadiusThemeItem>
  } => {
    const theme: ThemeCandidature = { colorList: [], borderRadius: [] };
    let colorListArr: ColorThemeItem[] = [];
    let borderListArr: Array<BorderRadiusThemeItem> = [];
    let orderedColors: {
      hex: string,
      occurrence: number,
      default?: boolean
    }[] = [];
    if (themeStats && themeStats.nodeColor && Object.keys(themeStats.nodeColor).length >= 3) {
      orderedColors = getOrderedColorsWithScore(themeStats.nodeColor);
    }
    let i = 0;
    const newDefaultColorInList: string[] = [];
    while (orderedColors.length < 5) {
      const defColor = CreateTour.DEFAULT_SUGGESTED_COLORS[i++];
      newDefaultColorInList.push(defColor);

      orderedColors.push({
        hex: defColor,
        occurrence: 1,
        default: true
      });
    }
    this.defaultColorsInList = newDefaultColorInList;

    colorListArr.push({ color: 'global', type: 'global' });
    for (const orderedColor of orderedColors) {
      const type = orderedColor.default ? 'suggested' : 'page-generated';
      colorListArr.push({ color: orderedColor.hex, type });
    }
    colorListArr = colorListArr.slice(0, 5);

    theme.borderRadius = [4, 10];
    borderListArr = [{ value: 'global', type: 'global' }, { value: 10, type: 'suggested' }];

    if (themeStats && themeStats.nodeBorderRadius && Object.keys(themeStats.nodeBorderRadius).length >= 3) {
      const borderRadius = getBorderRadius(themeStats.nodeBorderRadius);
      theme.borderRadius = ['global', borderRadius[1]];
      borderListArr = [{ value: 'global', type: 'global' }, { value: borderRadius[1], type: 'page-generated' }];
    }
    return {
      colorList: colorListArr,
      borderRadius: borderListArr,
    };
  };

  createSuggestionsForTheme(): void {
    if (!this.data!.screensData) return;

    let theme;
    try {
      const themeStats = JSON.parse(this.data!.screenStyleData);
      theme = this.createThemeCandidatesFromStats(themeStats);
    } catch (e) {
      theme = this.createThemeCandidatesFromStats({
        nodeColor: {
          [NODE_NAME.a]: {},
          [NODE_NAME.div]: {},
          [NODE_NAME.button]: {}
        },
        nodeBorderRadius: {
          [NODE_NAME.a]: {
            [DEFAULT_BORDER_RADIUS]: 1
          },
          [NODE_NAME.div]: {
            [DEFAULT_BORDER_RADIUS]: 1
          },
          [NODE_NAME.button]: {
            [DEFAULT_BORDER_RADIUS]: 1
          }
        }
      });
    }

    this.setState({ colorList: theme.colorList, borderRadiusList: theme.borderRadius });
  }

  processAndSetScreen = async (
    frames: FrameDataToBeProcessed[],
    mainFrame: FrameDataToBeProcessed | undefined,
    imageData: string,
    elPath: string
  ): Promise<void> => {
    let screenInfo: ScreenInfo;
    const res = await processNewScreenApiCalls(
      frames,
      mainFrame,
      imageData,
      elPath
    );

    if (res.skipped) {
      screenInfo = { info: null, skipped: true, vpd: null };
    }

    const data = res.data!;
    screenInfo = {
      info: {
        id: data.id,
        elPath: res.elPath,
        icon: data.icon,
        type: data.type,
        rid: data.rid,
        replacedWithImgScreen: res.replacedWithImgScreen,
        thumbnail: data.thumbnail
      },
      skipped: res.skipped,
      vpd: res.vpd,
    };
    this.setState((prevState: Readonly<IOwnStateProps>) => (
      { ...prevState, screens: [...prevState.screens, screenInfo] }
    ));
  };

  proxyAllAssets = (
    framesProssesResult: FrameProcessResult[],
    proxyCache: Map<string, RespProxyAsset>
  ): Promise<string> => new Promise((resolve, reject) => {
    (async () => {
      for (let i = 0; i < framesProssesResult.length; i++) {
        const frameProcessResult = framesProssesResult[i];
        await handleAssetOperation(frameProcessResult.assetOperation, proxyCache, frameProcessResult.mainFrame);
      }

      for (let i = 0; i < framesProssesResult.length; i++) {
        this.setState(prevState => ({
          percentageProgress: {
            ...prevState.percentageProgress,
            [i]: 1
          }
        }));

        let progress = 1;
        const intervalId = setInterval(() => {
          if (progress < 90) {
            progress++;
            this.setState(prevState => ({
              percentageProgress: {
                ...prevState.percentageProgress,
                [i]: progress
              }
            }));
          }
        }, 10);
        const data = framesProssesResult[i];
        await this.processAndSetScreen(data.frames, data.mainFrame, data.imageData, data.elPath);

        clearInterval(intervalId);
      }
      resolve('');
    })();
  });

  processScreens = async (): Promise<void> => {
    this.sentryTransaction = startTransaction({ name: 'saveCreateTour' });
    let frameDataToBeProcessed = JSON.parse(this.data!.screensData) as FrameDataToBeProcessed[][];
    this.frameDataToBeProcessed = frameDataToBeProcessed = frameDataToBeProcessed.filter(screenFrames => {
      if (screenFrames.length === 0) return false;
      if (screenFrames.length === 1 && screenFrames[0].type === 'sigstop') return false;
      return true;
    });
    if (!frameDataToBeProcessed.length) {
      raiseDeferredError(new Error('No data to create tour. Data might have been recorded but filtered out'));
      this.setState({ notDataFound: true });
      return;
    }

    if (frameDataToBeProcessed.length < 20) this.hideShouldBreakIntoModule();

    const cookieData = JSON.parse(this.data!.cookies);
    const frameThumbnailPromise: Promise<string>[] = [];
    const interactionCtx: Array<InteractionCtxDetail> = [];
    const framesProcessData: Array<FrameProcessResult> = [];

    for (let i = 0; i < frameDataToBeProcessed.length; i++) {
      const frames = frameDataToBeProcessed[i];
      const frameProssesResult = processScreen(
        frames,
        cookieData,
        frameThumbnailPromise,
        interactionCtx
      );
      framesProcessData.push(frameProssesResult);
    }

    const screenPromise = this.proxyAllAssets(framesProcessData, this.proxyCache).then((d) => {
      this.setState({ allScreensCreated: true });
      return d;
    });
    const unmarkedImages = await Promise.all(frameThumbnailPromise);
    this.setState({ unmarkedImages });

    if (interactionCtx.length === 0) this.setState({ aiGenerationNotPossible: true });

    const llmWorker = new Worker(new URL('./llm-opts.ts', import.meta.url));
    const imagesWithMarkPromise: {prm: Promise<string>, idx: number}[] = [];
    let markedImagesReceived = 0;
    let totalImages = unmarkedImages.length;
    let k = 0;
    unmarkedImages.forEach((img, index) => {
      if (interactionCtx[k]) {
        const { frameRect, interactionCtx: ctx, dxdy } = interactionCtx[k];

        if (ctx && frameRect.height === ctx.focusEl.height && frameRect.width === ctx.focusEl.width) {
          // skip marking image if selection === screen size
          markedImagesReceived++;
          this.skipAnnForScreenIds.push(index);
        } else {
          llmWorker.postMessage({ frameRect, img, ctx, dxdy, sender: 'fable', index });
        }

        llmWorker.onmessage = async (e) => {
          if (e.data.from === 'fable-worker') {
            const imageName = `marked_image_${e.data.id}.png`;
            const file = new File([e.data.markImg], `temp${Math.random()}`, { type: LLM_IMAGE_TYPE });
            const d = uploadMarkedImageToAws(LLM_IMAGE_TYPE, this.state.anonymousDemoId, imageName, file);
            imagesWithMarkPromise.push({ prm: d, idx: e.data.id });
            this.interactionCtxFromId.set(e.data.id, e.data.ctx);
            markedImagesReceived++;
            this.handleMarkImage(imagesWithMarkPromise, totalImages === markedImagesReceived);
          }
        };

        llmWorker.onerror = (err) => {
          console.log(err);
          markedImagesReceived++;
          this.handleMarkImage(imagesWithMarkPromise, totalImages === markedImagesReceived);
          // TODO handle error
        };
      } else {
        totalImages--;
      }
      k++;
    });

    await screenPromise;
    this.setState({ isScreenProcessed: true });
  };

  handleMarkImage = async (
    imagesWithMarkPromise: {prm: Promise<string>, idx: number}[],
    shouldProcess: boolean
  ): Promise<void> => {
    if (!shouldProcess) return;
    const imagesPromiseArr = imagesWithMarkPromise.map(item => item.prm);
    const imagesWithMark = await Promise.all(imagesPromiseArr);

    const imageUrlArr = imagesWithMarkPromise.map((item, index) => ({
      id: item.idx,
      url: imagesWithMark[index]
    })).sort((a, b) => a.id - b.id);
    this.setState({ imageWithMarkUrls: imageUrlArr });
  };

  createNewTour = (): void => {
    this.setState({ isReadyToSave: true, saving: true, showSaveWizard: false });
  };

  saveTour = async (
    screensWithAIInfo: ScreenInfoWithAI[],
    demoTitle: string,
    demoDescription: string
  ): Promise<void> => {
    if (!this.db) {
      return;
    }
    this.setState({ saving: true, showSaveWizard: false });

    const tour = await saveAsTour(
      screensWithAIInfo,
      null,
      this.props.globalConfig!,
      this.state.aiThemeData,
      this.state.selectedPallete,
      this.state.creationMode,
      this.state.anonymousDemoId,
      this.state.productDetails,
      this.state.demoObjective,
      demoTitle || this.state.tourName,
      demoDescription,
      this.state.selectedColor,
      this.state.selectedBorderRadius || DEFAULT_BORDER_RADIUS,
    );
    setEventCommonState(CmnEvtProp.TOUR_URL, createIframeSrc(`/demo/${tour.data.rid}`));

    sentryTxReport(this.sentryTransaction!, 'screensCount', this.state.screens.length, 'byte');
    await deleteDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE);
    this.props.addNewTourToAllTours(tour.data);

    traceEvent(
      AMPLITUDE_EVENTS.CREATE_NEW_TOUR,
      { from: 'ext', tour_name: this.state.tourName },
      [CmnEvtProp.EMAIL]
    );
    if (this.startTime != null) {
      const serDomFrame = this.frameDataToBeProcessed[0].find(frame => frame.type === 'serdom');
      const pageUrl = serDomFrame ? (serDomFrame.data as SerDoc).frameUrl : '';

      traceEvent(
        AMPLITUDE_EVENTS.TIME_TO_CREATE_TOUR,
        {
          time: Math.ceil((Date.now() - this.startTime) / 1000),
          page_url: pageUrl,
        },
        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
      );
    }
    if (this.defaultColorsInList.includes(this.state.selectedColor) || this.state.selectedColor === '') {
      traceEvent(
        AMPLITUDE_EVENTS.DEFAULT_COLOR_THEME_CHOOSEN,
        {},
        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
      );
    } else {
      traceEvent(AMPLITUDE_EVENTS.SUGGESTED_COLOR_THEME_CHOOSEN, {
        color: this.state.selectedColor
      }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
    }

    this.props.navigate(`/${PREVIEW_BASE_URL}/demo/${tour.data.rid}?i=1`);
  };

  saveInExistingTour = async (
    value: string | null,
    screensWithAIInfo: ScreenInfoWithAI[]
  ): Promise<void> => {
    if (!this.data || !this.db || !value) {
      return;
    }
    const existingTour = this.props.tours.filter(el => el.rid === value)[0];
    this.setState({ saving: true, showSaveWizard: false, tourName: existingTour.displayName });
    const tour = await saveAsTour(
      screensWithAIInfo,
      existingTour,
      this.props.globalConfig!,
      this.state.aiThemeData,
      this.state.selectedPallete,
      this.state.creationMode,
      this.state.anonymousDemoId,
      this.state.productDetails,
      this.state.demoObjective,
    );
    amplitudeAddScreensToTour(this.state.screens.length, 'ext');
    sentryTxReport(this.sentryTransaction!, 'screensCount', this.state.screens.length, 'byte');
    await deleteDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE);
    this.props.navigate(`/demo/${tour.data.rid}`);
  };

  componentDidMount(): void {
    document.title = this.props.title;
    this.setState({ loading: true });
    this.initDbOperations();
    this.props.getAllTours();
    this.props.getGlobalConfig();
    this.updateCreditsAvailability();
    Chargebee.init({
      site: process.env.REACT_APP_CHARGEBEE_SITE,
    });
  }

  buyMoreCredit = async (): Promise<void> => {
    this.setState({ buyCreditModalOpen: true });

    const checkCredit = (): void => {
      this.setState({ isBuyMoreCreditInProcess: true });
      const interval = setInterval(() => {
        this.props.getSubscriptionOrCheckoutNew().then((data: RespSubscription) => {
          if (data.availableCredits > this.state.aiCreditsAvailable) {
            this.setState({ isBuyMoreCreditInProcess: false, buyCreditModalOpen: false });
            clearInterval(interval);
          }
        });
      }, 2000);
    };
    const cbInstance = Chargebee.getInstance();
    cbInstance.openCheckout({
      hostedPage() {
        return api<ReqSubscriptionInfo | undefined, null>('/credittopupurl', {
          method: 'POST',
          auth: true
        });
      },
      loaded() { },
      error(e: Error) { raiseDeferredError(e); },
      close() { },
      success() {
        checkCredit();
      },
      step() { }
    });
  };

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevState.isReadyToSave !== this.state.isReadyToSave
      || prevState.isScreenProcessed !== this.state.isScreenProcessed
      || prevState.isAIProcessed !== this.state.isAIProcessed
    ) {
      if (this.state.isReadyToSave && this.state.isScreenProcessed
        && (this.state.creationMode !== 'ai' || this.state.isAIProcessed)) {
        this.processAIDataAndCallSaveTour();
      }
    }

    if (this.state.currentDisplayState === DisplayState.ShowAddExistingTourOptions
      && this.state.currentDisplayState !== prevState.currentDisplayState) {
      this.setState({ openSelect: false });
      setTimeout(() => {
        this.setState({ openSelect: true });
      }, 500);
    }

    if (this.state.baseAiData !== prevState.baseAiData
      || prevState.imageWithMarkUrls !== this.state.imageWithMarkUrls) {
      if (this.state.baseAiData && this.state.imageWithMarkUrls.length !== 0) {
        this.addTextToAllAns(
          this.state.anonymousDemoId,
          this.state.imageWithMarkUrls,
          this.state.productDetails,
          this.state.demoObjective,
          this.state.baseAiData,
          this.state.shouldBreakIntoModule,
          this.state.unmarkedImages,
          this.state.saveType
        );
      }
    }

    if (this.props.featurePlan !== prevProps.featurePlan) {
      const modulesFeatureAvailable = isFeatureAvailable(this.props.featurePlan, 'modules');
      if (!modulesFeatureAvailable.isAvailable) {
        this.hideShouldBreakIntoModule();
      }
    }

    if ((this.props.subs !== prevProps.subs
      || this.state.buyCreditModalOpen !== prevState.buyCreditModalOpen)
       && !this.state.buyCreditModalOpen) {
      this.updateCreditsAvailability();
    }

    if ((this.state.aiGenerationNotPossible !== prevState.aiGenerationNotPossible
      || this.state.saveType !== prevState.saveType)
      && this.state.creationMode === 'ai'
      && this.state.saveType
      && this.state.aiGenerationNotPossible
    ) {
      this.setState({
        prevDisplayState: DisplayState.ShowAiGenerationNotPossible,
        currentDisplayState: DisplayState.ShowAiGenerationNotPossible,
        showAiFlow: true,
        showSaveWizard: false
      });
    }
  }

  updateCreditsAvailability = (): void => {
    if (this.props.subs) {
      const numberOfScreens = this.frameDataToBeProcessed.length;
      const isAiCreditsAvailable = this.props.subs.availableCredits - numberOfScreens > 0;
      this.setState({ isAiCreditsAvailable, aiCreditsAvailable: this.props.subs.availableCredits });
    }
  };

  processAIDataAndCallSaveTour = (): void => {
    let screensWithAIAnnData: ScreenInfoWithAI[] = this.state.screens.map((screenInfo, index) => ({
      ...screenInfo,
      aiAnnotationData: null
    }));

    let demoTitle = '';
    let demoDescription = '';
    if (this.state.aiAnnData) {
      screensWithAIAnnData = this.state.screens.map((screenInfo, index) => {
        const currAiData = this.state.aiAnnData && this.state.aiAnnData.get(index)
          ? this.state.aiAnnData.get(index) : null;
        const shouldSkipIfMarkIsSameAAsWidth = this.skipAnnForScreenIds.includes(index);
        return {
          ...screenInfo,
          info: screenInfo.info === null ? null
            : {
              ...screenInfo.info,
              elPath: getElpathFromCandidate(
                screenInfo.info.replacedWithImgScreen,
                screenInfo.info.elPath,
                currAiData!,
                this.interactionCtxFromId.get(index)
              )
            },
          aiAnnotationData: currAiData!,
          skipped: screenInfo.skipped || shouldSkipIfMarkIsSameAAsWidth
        };
      });

      screensWithAIAnnData.pop();
      if (this.state.postProcessAiData) {
        demoTitle = this.state.postProcessAiData.title;
        demoDescription = this.state.postProcessAiData.description;

        // updating text after post process
        this.state.postProcessAiData.updateCurrentDemoStateContent.forEach((currentDemoStateContent) => {
          if (screensWithAIAnnData.length > currentDemoStateContent.id
          && screensWithAIAnnData[currentDemoStateContent.id].aiAnnotationData) {
            if (currentDemoStateContent.nextButtonText) {
              screensWithAIAnnData[currentDemoStateContent.id].aiAnnotationData!
                .nextButtonText = currentDemoStateContent.nextButtonText;
            }
            if (currentDemoStateContent.text) {
              screensWithAIAnnData[currentDemoStateContent.id].aiAnnotationData!
                .text = currentDemoStateContent.text;
            }
            if (currentDemoStateContent.richText) {
              screensWithAIAnnData[currentDemoStateContent.id].aiAnnotationData!
                .richText = currentDemoStateContent.richText;
            }
          }
        });

        const modules = this.state.postProcessAiData.modules;

        // add module content
        modules.forEach((module) => {
          if (screensWithAIAnnData.length > module.moduleStartIndex) {
            screensWithAIAnnData[module.moduleStartIndex].moduleData = {
              name: module.name,
              description: module.description
            };
          }
        });

        // add intro & outro guide to each module
        // need to update screensWithAIAnnData by adding a new screen before module and add module data to it
        let guideIndex = 0;
        const processedAiAnnData: ScreenInfoWithAI[] = [];
        for (let i = 0; i < screensWithAIAnnData.length; i++) {
          const currentScreenData = screensWithAIAnnData[i];
          if (currentScreenData.moduleData) {
            if (guideIndex < modules.length) {
              // add intro guide
              if (modules[guideIndex].module_intro_guide) {
                processedAiAnnData.push({
                  ...currentScreenData,
                  info: currentScreenData.info ? {
                    ...currentScreenData.info,
                    elPath: '$'
                  } : null,
                  aiAnnotationData: {
                    text: modules[guideIndex].module_intro_guide!.text,
                    richText: modules[guideIndex].module_intro_guide!.richText,
                    nextButtonText: modules[guideIndex].module_intro_guide!.nextButtonText,
                    screenId: randomScreenId(),
                    skip: false,
                    element: 'black'
                  },
                  moduleData: currentScreenData.moduleData
                });

                processedAiAnnData.push({
                  ...currentScreenData,
                  moduleData: undefined
                });
              } else {
                processedAiAnnData.push(currentScreenData);
              }
            }
            guideIndex++;
          } else {
            processedAiAnnData.push(currentScreenData);
          }
        }

        screensWithAIAnnData = [...processedAiAnnData];

        // add intro and outro guide
        const introCard: ScreenInfoWithAI = {
          ...screensWithAIAnnData[0],
          info: screensWithAIAnnData[0] === null ? null : {
            ...screensWithAIAnnData[0].info!,
            elPath: '$'
          },
          aiAnnotationData: {
            skip: false,
            element: 'black',
            text: this.state.postProcessAiData.demo_intro_guide.text,
            richText: this.state.postProcessAiData.demo_intro_guide.richText,
            nextButtonText: this.state.postProcessAiData.demo_intro_guide.nextButtonText,
            screenId: randomScreenId()
          },
          moduleData: screensWithAIAnnData[0].moduleData
        };

        screensWithAIAnnData[0].moduleData = undefined;
        screensWithAIAnnData.unshift(introCard);

        const prevScreenData = screensWithAIAnnData[screensWithAIAnnData.length - 1];
        const outroCard: ScreenInfoWithAI = {
          ...prevScreenData,
          info: prevScreenData === null ? null : {
            ...prevScreenData.info!,
            elPath: '$'
          },
          aiAnnotationData: {
            skip: false,
            element: 'black',
            text: this.state.postProcessAiData.demo_outro_guide.text,
            richText: this.state.postProcessAiData.demo_outro_guide.richText,
            nextButtonText: this.state.postProcessAiData.demo_outro_guide.nextButtonText,
            screenId: randomScreenId()
          },
        };
        screensWithAIAnnData.push(outroCard);
      }
    }

    if (this.state.saveType === 'new_tour') {
      this.saveTour(screensWithAIAnnData, demoTitle, demoDescription);
    }

    if (this.state.saveType === 'existing_tour') {
      this.saveInExistingTour(this.state.existingTourRId, screensWithAIAnnData);
    }
  };

  hideShouldBreakIntoModule = ():void => {
    this.setState({ showBreakIntoModule: false, shouldBreakIntoModule: false });
  };

  componentWillUnmount(): void {
    this.db?.close();
  }

  addTextToAllAns = async (
    anonymousDemoId: string,
    imageWithMarkUrls: { id: number; url: string; }[],
    productDetails: string,
    demoObjective: string,
    baseAiData: create_guides_router,
    shouldBreakIntoModule: boolean,
    unmarkedImages: string[],
    saveType: 'new_tour' | 'existing_tour' | null
  ): Promise<void> => {
    const [llmMetadata, themeData] = await Promise.all([
      getDemoMetaData(anonymousDemoId, productDetails, demoObjective, imageWithMarkUrls, baseAiData.categoryOfDemo),
      saveType === 'existing_tour' ? null
        : getThemeData(anonymousDemoId, unmarkedImages, baseAiData.lookAndFeelRequirement)
    ]);

    // handle skip
    const newImageWithMarkUrls = imageWithMarkUrls.filter(obj => !llmMetadata.screenCleanup.includes(obj.id));

    this.setState({ aiThemeData: themeData });

    const annTextData = await getAllDemoAnnotationText(
      anonymousDemoId,
      newImageWithMarkUrls,
      productDetails,
      demoObjective,
      baseAiData,
      (progress) => {
        this.setState({ batchProgress: progress });
      },
      llmMetadata.metaData
    );

    if (!annTextData) {
      this.setState({ showRetryAI: true });
      return;
    }

    const demoState = annTextData.items.map(item => ({
      id: item.screenId,
      text: item.text,
      nextButtonText: item.nextButtonText
    }));
    const processedTextData = await postProcessAIText(
      anonymousDemoId,
      productDetails,
      demoObjective,
      JSON.stringify(demoState),
      shouldBreakIntoModule,
      baseAiData.moduleRequirement
    );

    const aiDataMap = new Map<number, AiItem>();
    annTextData.items.forEach(item => {
      aiDataMap.set(item.screenId, item);
    });

    this.setState({ aiAnnData: aiDataMap, postProcessAiData: processedTextData, isAIProcessed: true });
    if (themeData === null) {
      this.setState({ isReadyToSave: true, selectedPallete: 'global' });
    }

    // if ai content is fetched successfully, add screen_cleanup to skipScreen
    this.skipAnnForScreenIds = [...this.skipAnnForScreenIds, ...llmMetadata.screenCleanup];
  };

  // eslint-disable-next-line class-methods-use-this
  getAnnText = (type: AnnotationThemeType): string => {
    if (type === 'global') {
      return 'This card style is generated from global style configured inside Fable.';
    }

    if (type === 'page-generated') {
      return 'This card style is generated from your page theme.';
    }

    return 'This card style is suggested by us based on your page theme.';
  };

  handleCreateDemoUsingAI = async (
    anonymousDemoId: string,
    productDetails: string,
    demoObjective: string
  ): Promise<void> => {
    const data = await createDemoUsingAI(
      anonymousDemoId,
      productDetails,
      demoObjective
    );

    if (data === null) {
      this.setState({ showRetryAI: true });
      return;
    }
    this.setState({ baseAiData: data });
  };

  handleFinishCreatingDemoManually = (): void => {
    if (this.state.saveType === 'existing_tour') {
      this.setState({
        creationMode: 'manual',
        isReadyToSave: true,
        saving: true,
        showAiFlow: false,
        prevDisplayState: DisplayState.ShowAddExistingTourOptions,
        currentDisplayState: DisplayState.ShowAddExistingTourOptions
      });
    } else {
      this.setState({
        creationMode: 'manual',
        showAiFlow: false,
        showSaveWizard: true,
        prevDisplayState: DisplayState.ShowNewTourOptions,
        currentDisplayState: DisplayState.ShowNewTourOptions
      });
    }
  };

  selectColorPalette = (palette: 'global' | 'ai'): void => {
    this.setState({ saving: true, showAiFlow: false, isReadyToSave: true, selectedPallete: palette });
  };

  addToExistingDemo = async (): Promise<void> => {
    let displayState = DisplayState.ShowAIAddExistingTourCreditOptions;

    let anonymousDemoId = this.state.anonymousDemoId;
    if (this.state.creationMode === 'ai') {
      if (this.state.isAiCreditsAvailable) {
        const currentTour = this.props.tours.find(
          item => item.rid === this.state.existingTourRId
        );

        const productDetails = currentTour?.info.productDetails || '';
        const demoObjective = currentTour?.info.demoObjective || '';
        anonymousDemoId = currentTour?.info.annDemoId || anonymousDemoId;
        const resp = await getDemoRouterFromExistingDemo(anonymousDemoId);

        this.setState({
          baseAiData: resp,
          demoObjective,
          productDetails,
          anonymousDemoId
        });
        displayState = DisplayState.ShowColorPaletteOptions;
      }
      this.setState({
        showSaveWizard: false,
        showAiFlow: true,
        prevDisplayState: displayState,
        currentDisplayState: displayState
      });
    } else {
      this.setState({
        isReadyToSave: true,
        saveType: 'existing_tour',
        saving: true,
        showSaveWizard: false
      });
    }
  };

  render(): ReactElement {
    let heading = '';
    let subheading = '';
    let contentWidth = '45%';
    let step = 0;
    let fullheight = false;
    const totalSteps = 3;
    let fableColorBorderRight = '21%';

    switch (this.state.currentDisplayState) {
      case DisplayState.ShowTourCreationOptions:
        heading = 'Your interactive demo is on its way!';
        subheading = 'Fable has captured all the actions you just undertook on your product including the animations and transition. Let us know where you want these captures to be added. 😄';
        break;

      case DisplayState.ShowAddExistingTourOptions:
        heading = 'Select an existing interactive demo';
        subheading = 'Your current recording would be added to the selected interactive demo.';
        break;

      case DisplayState.ShowNewTourOptions:
        heading = 'New interactive demo name';
        subheading = 'Give your interactive demo a name so that it\'s easy to find. You can always change this later from inside the app.';
        break;

      case DisplayState.ShowColorThemeChoices:
        heading = 'Pick a color for the annotation box';
        subheading = 'We have curated a few themes based on your product’s color scheme. You can always edit this from inside the app after the interactive demo is created.';
        contentWidth = 'calc(100% - 26rem)';
        step = 1;
        fableColorBorderRight = '0%';
        fullheight = true;
        break;

      case DisplayState.ShowBorderChoices:
        heading = 'Pick a shape for the annotation box';
        subheading = 'We have created a couple of variations of annotation boxes for your interactive demo. You can always edit this from inside the app after the interactive demo is created.';
        contentWidth = 'calc(100% - 26rem)';
        step = 2;
        fableColorBorderRight = '0%';
        fullheight = true;
        break;

      case DisplayState.ShowReview:
        heading = 'Review your selections';
        subheading = 'This is how the annotations would look in the interactive demo. You can always edit this from inside the app after the interactive demo is created.';
        step = 3;
        fullheight = true;
        break;

      default:
        break;
    }

    if (this.state.loading || this.props.globalConfig === null || this.props.subs === null) {
      return (
        <FullPageTopLoader showLogo />
      );
    }

    if (this.state.notDataFound) {
      return (
        <RootLayout
          dontShowIllustration
          equalSpaced
          abs
        >
          <div
            style={{
              transform: 'translateY(10rem)',
            }}
          >
            <Tags.HeaderText>A little quiet here today</Tags.HeaderText>
            <Tags.SubheaderText>
              No demos to be created. Use Fable's extension to record an interactive demo.
              <div style={{ fontStyle: 'italic' }}>
                If you've just recorded an interactive demo and this screen is shown, then you might have only recorded empty chrome tabs.
              </div>
            </Tags.SubheaderText>
            <Button
              style={{
                width: '240px'
              }}
              onClick={() => {
                this.props.navigate('/demos');
              }}
            >
              See all Tours
            </Button>
          </div>
        </RootLayout>
      );
    }
    const animIn = this.state.currentDisplayState > this.state.prevDisplayState ? 'fadeInRight' : 'fadeInLeft';
    const animOut = this.state.currentDisplayState > this.state.prevDisplayState ? 'fadeOutLeft' : 'fadeOutRight';

    if (this.state.showSaveWizard) {
      return (
        <RootLayout
          dontShowIllustration
          equalSpaced
          abs
          fullheight={fullheight}
          stackedbarStyle={{
            transition: 'all 0.2s ease-out',
            right: fableColorBorderRight
          }}
        >
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css" />
          <div style={{
            transform: 'translateY(12rem)',
            fontSize: '4rem',
          }}
          >
            <span>🎉</span>
          </div>
          <div style={{ transform: 'translateY(12rem)', width: contentWidth }}>
            <Tags.HeaderText>{heading}
              {step > 0 && (
                <span style={{
                  fontSize: '0.85rem',
                  display: 'inline-block',
                  marginLeft: '1.5rem',
                  fontWeight: 500
                }}
                >
                  {step}/{totalSteps}
                </span>
              )}
            </Tags.HeaderText>
            <Tags.SubheaderText>{subheading}</Tags.SubheaderText>
            <div>
              <reactanimated.Animated
                animationIn={
                  this.state.currentDisplayState < this.state.prevDisplayState
                    ? 'fadeInLeft' : 'jackInTheBox'
                }
                animationOut="fadeOutLeft"
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowTourCreationOptions}
              >
                <div style={{
                  display: 'flex',
                  width: '30rem',
                  position: 'absolute',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
                >
                  {!this.state.aiDemoCreationSupported && (
                    <div
                      className="err-line"
                      style={{
                        color: 'white',
                        fontWeight: 600,
                        lineHeight: '1.25rem'
                      }}
                    >
                      ⚠️ Looks like you are using an older version of Fable's chrome extension.
                      Update Fable's chrome extension to enable Quilly (Fable's AI Demo copilot).
                    </div>
                  )}
                  <Button
                    iconPlacement="left"
                    onClick={() => {
                      this.setState(prevState => {
                        if (prevState.aiDemoCreationSupported) {
                          return {
                            currentDisplayState: DisplayState.ShowAddProductDescriptionOptions,
                            prevDisplayState: DisplayState.ShowTourCreationOptions,
                            showAiFlow: true,
                            showSaveWizard: false,
                            saveType: 'new_tour',
                            creationMode: 'ai'
                          };
                        }

                        return {
                          currentDisplayState: DisplayState.ShowNewTourOptions,
                          prevDisplayState: DisplayState.ShowTourCreationOptions,
                          showAiFlow: false,
                          showSaveWizard: true,
                          saveType: 'new_tour',
                          creationMode: 'manual'
                        };
                      });
                      this.startTime = Date.now();
                    }}
                    icon={<PlusOutlined />}
                    style={{ paddingTop: '14px', paddingBottom: '14px' }}
                  >
                    Save as a new demo
                  </Button>
                  {(!this.props.allToursLoaded || this.props.tours.length !== 0)
                    && (
                      <Button
                        intent="secondary"
                        onClick={() => {
                          this.setState(prevState => {
                            let creationMode: 'ai' | 'manual' = 'manual';
                            if (prevState.aiDemoCreationSupported) {
                              creationMode = 'ai';
                            }
                            return {
                              currentDisplayState: DisplayState.ShowAddExistingTourOptions,
                              prevDisplayState: DisplayState.ShowTourCreationOptions,
                              saveType: 'existing_tour',
                              creationMode
                            };
                          });
                        }}
                        icon={<DownOutlined />}
                        style={{ paddingTop: '14px', paddingBottom: '14px', background: 'white' }}
                      >
                        Save in an existing interactive demo
                      </Button>
                    )}

                  <Tags.DangerButton
                    onClick={() => {
                      confirm({
                        title: 'Are you sure you don\'t want to continue?',
                        icon: <DeleteOutlined />,
                        onOk: async () => {
                          if (this.db) await deleteDataFromDb(this.db, OBJECT_STORE, OBJECT_KEY_VALUE);
                          this.props.navigate('/demos');
                        },
                        onCancel() { }
                      });
                    }}
                  >
                    I've created this by mistake, let's&nbsp;
                    <span className="target">not save this.</span>
                  </Tags.DangerButton>
                </div>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn={animIn}
                animationOut={animOut}
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowAddExistingTourOptions}
              >
                <div style={{ width: '80%', position: 'absolute', maxWidth: '30rem' }}>
                  {this.props.allToursLoaded
                    && this.state.currentDisplayState === DisplayState.ShowAddExistingTourOptions ? (
                      <div>
                        <style>{`
                        .ant-select-selector {
                          border-radius: 8px !important;
                          height: auto !important;
                          padding: 0.2rem 11px !important;

                          & input {
                            font-size: 1.2rem !important;
                            font-weight: 600 !important;
                          }
                        }

                        .ant-select-selection-item {
                          font-size: 1.2rem !important;
                          font-weight: bold !important;
                        }
                        `}
                        </style>
                        <Select
                          style={{ width: '100%', borderRadius: '8px' }}
                          autoFocus
                          open={this.state.openSelect}
                          size="large"
                          onSelect={(selectedTourRId) => this.setState({
                            existingTourRId: selectedTourRId,
                            openSelect: false
                          })}
                          showSearch
                          options={this.props.tours.map(t => ({
                            label: t.displayName,
                            value: t.rid
                          }))}
                          onFocus={() => { this.setState({ openSelect: true }); }}
                          onBlur={() => this.setState({ openSelect: false })}
                        />
                        <Tags.ModalButtonsContainer style={{
                          margin: '2rem 0',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                        >
                          <Button
                            style={{ width: '100%' }}
                            onClick={() => this.setState({
                              currentDisplayState: DisplayState.ShowTourCreationOptions,
                              prevDisplayState: DisplayState.ShowAddExistingTourOptions
                            })}
                            intent="secondary"
                            icon={<ArrowLeftOutlined />}
                            iconPlacement="left"
                          >
                            Back
                          </Button>
                          {this.state.existingTourRId && (
                          <Button
                            onClick={this.addToExistingDemo}
                            disabled={this.state.showAiFlow}
                            icon={<CheckOutlined />}
                            iconPlacement="left"
                            style={{ width: '100%', paddingBlock: '12.4px' }}
                          >
                            Add to Demo
                          </Button>
                          )}
                        </Tags.ModalButtonsContainer>
                      </div>
                    ) : (
                      <Loader width="240px" />
                    )}
                </div>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn={animIn}
                animationOut={animOut}
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowNewTourOptions}
              >
                <div style={{ width: '30rem', position: 'absolute' }}>
                  <Input
                    id="tour-name"
                    placeholder=""
                    value={this.state.tourName}
                    onChange={(e) => this.setState({ tourName: e.target.value })}
                    innerRef={this.nameTourRef}
                    label="Give an interactive demo name"
                    icon={<EditFilled />}
                  />
                  <Tags.ModalButtonsContainer>
                    <Button
                      style={{ flex: 1 }}
                      onClick={() => this.setState({
                        currentDisplayState: DisplayState.ShowTourCreationOptions,
                        prevDisplayState: DisplayState.ShowNewTourOptions,
                        isAIProcessed: false
                      })}
                      icon={<ArrowLeftOutlined />}
                      intent="secondary"
                      iconPlacement="left"
                    >
                      Back
                    </Button>
                    <Button
                      style={{ flex: 1 }}
                      onClick={() => this.setState({
                        currentDisplayState: DisplayState.ShowColorThemeChoices,
                        prevDisplayState: DisplayState.ShowNewTourOptions
                      })}
                      icon={<ArrowRightOutlined />}
                    >
                      Next
                    </Button>
                  </Tags.ModalButtonsContainer>
                </div>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn={animIn}
                animationOut={animOut}
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowColorThemeChoices}
              >
                <div style={{ width: '100%', position: 'absolute' }}>
                  <Tags.AnnotationContainer>
                    {this.state.colorList.map((item, idx) => (
                      <Tags.AnnCardContainer
                        key={idx}
                        onClick={() => {
                          this.setState({
                            selectedColor: item.color,
                            currentDisplayState: DisplayState.ShowBorderChoices,
                            prevDisplayState: DisplayState.ShowColorThemeChoices
                          });
                        }}
                      >
                        <AnnotationContent
                          config={getSampleConfig('$', '', this.props.globalConfig!, this.getAnnText(item.type))}
                          opts={getThemeAnnotationOpts(item.color, this.props.globalConfig!)}
                          isInDisplay
                          width={320}
                          dir="l"
                          tourId={0}
                          top={0}
                          left={0}
                          navigateToAdjacentAnn={() => { }}
                          isThemeAnnotation
                        />

                        <Tags.AnnContentOverlay>
                          <Button
                            style={{ background: '#fff' }}
                            intent="secondary"
                          >
                            Select
                          </Button>
                        </Tags.AnnContentOverlay>
                      </Tags.AnnCardContainer>
                    ))}
                  </Tags.AnnotationContainer>
                  <Tags.ModalButtonsContainer style={{ margin: '3rem 0', justifyContent: 'center' }}>
                    <Button
                      intent="secondary"
                      iconPlacement="left"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => {
                        const rootLayoutDiv = document.getElementById('frtlt');
                        if (rootLayoutDiv) rootLayoutDiv.scrollTop = 0;
                        this.setState({
                          currentDisplayState: DisplayState.ShowNewTourOptions,
                          prevDisplayState: DisplayState.ShowColorThemeChoices
                        });
                      }}
                    >
                      Back
                    </Button>
                  </Tags.ModalButtonsContainer>
                </div>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn={animIn}
                animationOut={animOut}
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowBorderChoices}
              >
                <div style={{ width: '100%', position: 'absolute' }}>
                  <Tags.AnnotationContainer>
                    {this.state.borderRadiusList.map((r, idx) => (
                      <Tags.AnnCardContainer
                        key={idx}
                        onClick={() => {
                          this.setState({
                            selectedBorderRadius: r.value,
                            currentDisplayState: DisplayState.ShowReview,
                            prevDisplayState: DisplayState.ShowBorderChoices
                          });
                        }}
                      >
                        <AnnotationContent
                          config={getSampleConfig('$', '', this.props.globalConfig!, this.getAnnText(r.type))}
                          opts={getThemeAnnotationOpts(this.state.selectedColor, this.props.globalConfig!, r.value)}
                          isInDisplay
                          width={320}
                          dir="l"
                          tourId={0}
                          top={0}
                          left={0}
                          navigateToAdjacentAnn={() => { }}
                          isThemeAnnotation
                        />
                        <Tags.AnnContentOverlay>
                          <Button
                            style={{ background: '#fff' }}
                            intent="secondary"
                          >
                            Select
                          </Button>
                        </Tags.AnnContentOverlay>
                      </Tags.AnnCardContainer>
                    ))}
                  </Tags.AnnotationContainer>
                  <Tags.ModalButtonsContainer style={{ margin: '3rem 0', justifyContent: 'center' }}>
                    <Button
                      onClick={() => {
                        const rootLayoutDiv = document.getElementById('frtlt');
                        if (rootLayoutDiv) rootLayoutDiv.scrollTop = 0;
                        this.setState({
                          currentDisplayState: DisplayState.ShowColorThemeChoices,
                          prevDisplayState: DisplayState.ShowBorderChoices
                        });
                      }}
                      intent="secondary"
                      icon={<ArrowLeftOutlined />}
                    >
                      Back
                    </Button>
                  </Tags.ModalButtonsContainer>
                </div>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn={animIn}
                animationOut={animOut}
                animationInDuration={500}
                animationOutDuration={500}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowReview}
              >
                <div style={{
                  fontSize: '1.25rem',
                  marginBottom: '2rem'
                }}
                >
                  Interactive demo name
                  <span style={{ fontWeight: 500, marginLeft: '0.5rem' }}>
                    {this.state.tourName}
                  </span>
                </div>
                <div>
                  <AnnotationContent
                    config={getSampleConfig('$', '', this.props.globalConfig!)}
                    opts={getThemeAnnotationOpts(
                      this.state.selectedColor,
                      this.props.globalConfig!,
                      this.state.selectedBorderRadius || DEFAULT_BORDER_RADIUS
                    )}
                    isInDisplay
                    width={320}
                    dir="l"
                    tourId={0}
                    top={0}
                    left={0}
                    navigateToAdjacentAnn={() => { }}
                    isThemeAnnotation
                  />
                </div>
                <Tags.ModalButtonsContainer style={{
                  width: '360px',
                  margin: '2rem 0',
                  flexDirection: 'column',
                }}
                >
                  <Button
                    onClick={() => this.setState({
                      currentDisplayState: DisplayState.ShowBorderChoices,
                      prevDisplayState: DisplayState.ShowReview
                    })}
                    icon={<ArrowLeftOutlined />}
                    iconPlacement="left"
                    intent="secondary"
                    style={{ background: '#fff' }}
                  >
                    Back
                  </Button>

                  <Button
                    onClick={this.createNewTour}
                    disabled={this.state.saving}
                    icon={<CheckOutlined />}
                    iconPlacement="left"
                  >
                    Create Interactive Demo
                  </Button>
                </Tags.ModalButtonsContainer>
              </reactanimated.Animated>
            </div>
          </div>
        </RootLayout>
      );
    }

    if (this.state.showAiFlow) {
      return (
        <>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css" />
          {this.state.showRetryAI && (
            <Tags.RetryOverlay>
              <div style={{
                maxWidth: '600px'
              }}
              >
                <p
                  className="typ-h1"
                >
                  Quilly has faced a problem while fine tuning the demo.
                </p>
                <div className="typ-reg">
                  This issue might be transient, try again to create demo using Quilly. If the issue persists you can go can go ahead and create the demo manually. Our engineering team has been notified about the issue. If you have any concerns you can use the in app chatbot.
                </div>
              </div>
              <Button
                className="typ-btn"
                onClick={this.handleFinishCreatingDemoManually}
              >Create demo manually
              </Button>
              <Button
                className="typ-btn sec"
                onClick={() => {
                  if (this.state.baseAiData && this.state.imageWithMarkUrls) {
                    this.addTextToAllAns(
                      this.state.anonymousDemoId,
                      this.state.imageWithMarkUrls,
                      this.state.productDetails,
                      this.state.demoObjective,
                      this.state.baseAiData,
                      this.state.shouldBreakIntoModule,
                      this.state.unmarkedImages,
                      this.state.saveType
                    );
                  } else if (this.state.baseAiData === null) {
                    this.handleCreateDemoUsingAI(
                      this.state.anonymousDemoId,
                      this.state.productDetails,
                      this.state.demoObjective
                    );
                  }
                  this.setState({ showRetryAI: false });
                }}
              >
                Retry again using AI
              </Button>
            </Tags.RetryOverlay>
          )}
          <OnbordingTags.Con style={{
            background: 'linear-gradient(to right top, #fafafa, #f3f2fb, #eceafc, #e4e2fd, #dcdafe, #dccffc, #dfc3f8, #e5b6f1, #f9a0d8, #ff8ab3, #ff7a84, #ff7450)',
            filter: this.state.showRetryAI ? 'blur(6px) saturate(60%) invert(0.4)' : 'none'
          }}
          >
            <OnbordingTags.FableLogoImg
              src={FableLogo}
              alt=""
              height={30}
            />
            <div style={{
              display: 'flex',
              width: '100%',
              position: 'absolute',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'auto',
            }}
            >
              <reactanimated.Animated
                animationIn="fadeInRight"
                animationOut="fadeOutLeft"
                animationInDuration={200}
                animationOutDuration={200}
                animateOnMount
                style={{
                  zIndex: this.state.currentDisplayState === DisplayState.ShowAddProductDescriptionOptions ? 5 : 1
                }}
                isVisible={this.state.currentDisplayState === DisplayState.ShowAddProductDescriptionOptions}
              >
                <Tags.Con style={{ transform: 'translate(50px, 50px)' }}>
                  <Tags.ProductCardCon className="typ-reg" large>
                    <Tags.CardContentCon>
                      <Tags.CardHeading>
                        <p className="typ-h1">
                          Meet Quilly, your AI Demo Copilot
                        </p>
                        <div
                          className="typ-reg subinfo"
                          style={{
                            display: 'flex',
                            gap: '3rem',
                            alignItems: 'center'
                          }}
                        >
                          <Suspense fallback={null}>
                            <div>
                              <LottiePlayer
                                style={{ height: '80px' }}
                                src="./quilly.json"
                                autoplay
                                loop
                              />
                            </div>
                          </Suspense>
                          <div>
                            <p>
                              Quilly automagically creates your demo by
                            </p>
                            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                              <li>Applying appropriate theme</li>
                              <li>Filtering out unecessary steps</li>
                              <li>Generating content based on your prompt below</li>
                              <li>Adjusting selected element on screen</li>
                            </ul>
                          </div>
                        </div>
                      </Tags.CardHeading>
                      <Tags.TextAreaContentCon>
                        <Tags.CardHeading>
                          <p className="typ-h1">
                            Tell Quilly how she should create the demo
                          </p>
                        </Tags.CardHeading>
                        <div style={{ width: '100%', marginBottom: '1rem' }}>
                          <TextArea
                            label="Tell Quilly about the product feature you just recorded"
                            defaultValue={this.state.productDetails}
                            onFocus={() => this.setState({ highlightProductDetailsHelpText: true })}
                            onBlur={() => this.setState({ highlightProductDetailsHelpText: false })}
                            onChange={e => { this.setState({ productDetails: e.target.value }); }}
                          />
                          <p className="typ-sm subinfo">
                            <MessageFilled />&nbsp;
                            <span className={`anim-bg ${this.state.highlightProductDetailsHelpText ? 'hl' : ''}`}>
                              You should write about the product feature you just recorded and how it helps your buyers.
                              You should explain any kind of product knowledge relevant to this recording.
                            </span>
                            &nbsp;
                            <Tooltip
                              placement="right"
                              title={(
                                <>
                                  <p>Example:</p>
                                  <ul>
                                    <li style={{ marginBottom: '1rem' }}>Slack organises conversations into dedicated spaces called channels. Public channels promote transparency and inclusivity. Private channels are for conversations that should not be open to all members.</li>
                                    <li>With Zoom, share your screen, desktop, or other content during a meeting, even while your video is on. Screen sharing during Zoom meetings is designed with a collaborative environment in mind. This feature gives only the users, who choose to share their screen, full control over their own screen and what other meeting participants can or cannot see.</li>
                                  </ul>
                                </>
                            )}
                            >
                              <span
                                style={{
                                  textDecoration: 'underline'
                                }}
                              >
                                Need inspiration?
                              </span>
                            </Tooltip>
                          </p>
                        </div>
                        <div style={{ width: '100%' }}>
                          <TextArea
                            label="Tell Quilly about this demo's objective"
                            defaultValue={this.state.demoObjective}
                            onFocus={() => this.setState({ highlightDemoObjHelpText: true })}
                            onBlur={() => this.setState({ highlightDemoObjHelpText: false })}
                            onChange={e => { this.setState({ demoObjective: e.target.value }); }}
                          />
                          <p className="typ-sm subinfo">
                            <MessageFilled />&nbsp;
                            <span className={`anim-bg ${this.state.highlightDemoObjHelpText ? 'hl' : ''}`}>
                              You should write about how the demo content should be generated.
                              For example, tell Quilly how you are gonna use this demo, target audience of this demo, tone of the demo, module, language requirement etc.
                            </span>
                            &nbsp;
                            <Tooltip
                              placement="right"
                              title={(
                                <ul>
                                  <li style={{ marginBottom: '1rem' }}>I want to embed this demo on my website's landing page. My target audience is 30-40 years old in south america region who wants to travel to Europe in next 2 months. Use movie reference which they can connect to.</li>
                                  <li>I want to create a step by step guide that I want to use it in my help center. My audience speaks german.</li>
                                </ul>
                            )}
                            >
                              <span
                                style={{
                                  textDecoration: 'underline'
                                }}
                              >
                                Need inspiration?
                              </span>
                            </Tooltip>
                          </p>
                        </div>
                      </Tags.TextAreaContentCon>
                      {this.state.showBreakIntoModule
                      && (
                        <OurCheckbox
                          onChange={e => { this.setState({ shouldBreakIntoModule: e.target.checked }); }}
                        >
                          <Tags.CheckboxContent>
                            <p className="typ-reg">Break demo into multiple modules</p>
                            <p className="typ-sm subinfo">
                              You have recoded a lot of steps in your demo. It's recommended that you break your demo
                              in multiple modules so that your user engages with different part of your demo.
                              Demo modules are like youtube chapters.
                            </p>
                          </Tags.CheckboxContent>
                        </OurCheckbox>
                      )}
                      { this.state.isAiCreditsAvailable ? (
                        <Button
                          type="submit"
                          onClick={() => {
                            this.setState({
                              currentDisplayState: DisplayState.ShowColorPaletteOptions,
                              prevDisplayState: DisplayState.ShowAddProductDescriptionOptions,
                            });
                            this.handleCreateDemoUsingAI(
                              this.state.anonymousDemoId,
                              this.state.productDetails,
                              this.state.demoObjective
                            );
                          }}
                        >
                          Finish creating demo using Quilly
                        </Button>
                      ) : (
                        <BuyMoreCredit
                          currentCredit={this.props.subs.availableCredits}
                          isBuyMoreCreditInProcess={this.state.isBuyMoreCreditInProcess}
                          buyMoreCredit={this.buyMoreCredit}
                        />
                      )}
                    </Tags.CardContentCon>
                  </Tags.ProductCardCon>
                  <Tags.ManualDemoContainer>
                    <Tags.ManualDemo
                      onClick={this.handleFinishCreatingDemoManually}
                    >
                      Finish creating the demo manually
                    </Tags.ManualDemo>
                  </Tags.ManualDemoContainer>
                </Tags.Con>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn="fadeInRight"
                animationOut="fadeOutLeft"
                animationInDuration={200}
                animationOutDuration={200}
                animateOnMount={false}
                style={{
                  zIndex: this.state.currentDisplayState === DisplayState.ShowColorPaletteOptions ? 5 : 1
                }}
                isVisible={this.state.currentDisplayState === DisplayState.ShowColorPaletteOptions}
              >
                <Tags.Con>
                  <Tags.ProductCardCon className="typ-reg">
                    <Tags.CardContentCon>
                      {
                      this.state.baseAiData === null || this.state.aiThemeData === null
                        ? (
                          <div>
                            <TypeAnimation
                              preRenderFirstString
                              cursor={false}
                              sequence={[
                                500,
                                'Please wait while Quilly comes up with a demo theme',
                                500,
                                'Please wait while Quilly comes up with a demo theme.',
                                500,
                                'Please wait while Quilly comes up with a demo theme..',
                                500,
                                'Please wait while Quilly comes up with a demo theme...',
                                500,
                              ]}
                              speed={75}
                              style={{ fontSize: '1.8rem' }}
                              repeat={Infinity}
                            />
                            <div style={{
                              display: 'flex',
                              gap: '2rem'
                            }}
                            >
                              <Suspense fallback={null}>
                                <div>
                                  <LottiePlayer
                                    style={{ height: '120px' }}
                                    src="./quilly.json"
                                    autoplay
                                    loop
                                  />
                                  <p className="typ-sm">
                                    Meet <em>Quilly</em>, <br />Your AI Demo Copilot.
                                  </p>
                                </div>
                              </Suspense>
                              <div className="typ-reg" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <TypeAnimation
                                  cursor={false}
                                  sequence={[
                                    500,
                                    'Quilly is\n  ● analyzing your product details & demo objective\n  ● getting style information from your product html capture\n  ● creating a color palette that fits your product for this demo',
                                    15000,
                                    '',
                                  ]}
                                  omitDeletionAnimation
                                  speed={68}
                                  style={{ fontSize: '1.25rem', whiteSpace: 'pre-line', display: 'block', minHeight: '48px' }}
                                  repeat={Infinity}
                                />
                              </div>
                            </div>
                          </div>
                        )
                        : (
                          <Tags.ColorPaletteCon>
                            <Tags.CardHeading>
                              <p className="typ-h1">
                                Choose a theme for your interactive demo
                              </p>
                              <div className="typ-sm subinfo">
                                Choose a colorscheme for your demo guides. You can change every aspect of this theme from inside the app.
                              </div>
                            </Tags.CardHeading>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                              <Tags.ColorPaletteSuggest>
                                <Tags.ColorPalette
                                  bgColor={this.state.aiThemeData.backgroundColor}
                                  fontColor={this.state.aiThemeData.fontColor}
                                  borderColor={this.state.aiThemeData.borderColor}
                                  primaryColor={this.state.aiThemeData.primaryColor}
                                >
                                  <Tags.AnnContentOverlay>
                                    <Button
                                      style={{ background: '#fff' }}
                                      intent="secondary"
                                      onClick={() => this.selectColorPalette('ai')}
                                    >
                                      Select
                                    </Button>
                                  </Tags.AnnContentOverlay>
                                  <div className="text-container">
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                  </div>
                                  <div className="btn-container">
                                    <div className="btn" />
                                  </div>
                                </Tags.ColorPalette>
                                <p className="typ-sm subinfo" style={{ marginTop: '1rem' }}>This theme suggested by Quilly</p>
                              </Tags.ColorPaletteSuggest>
                              <Tags.ColorPaletteSuggest>
                                <Tags.ColorPalette
                                  bgColor={this.props.globalConfig.annBodyBgColor}
                                  fontColor={this.props.globalConfig.fontColor}
                                  borderColor={this.props.globalConfig.annBorderColor}
                                  primaryColor={this.props.globalConfig.primaryColor}
                                >
                                  <Tags.AnnContentOverlay>
                                    <Button
                                      style={{ background: '#fff' }}
                                      intent="secondary"
                                      onClick={() => this.selectColorPalette('global')}
                                    >
                                      Select
                                    </Button>
                                  </Tags.AnnContentOverlay>
                                  <div className="text-container">
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                    <div className="line" />
                                  </div>
                                  <div className="btn-container">
                                    <div className="btn" />
                                  </div>
                                </Tags.ColorPalette>
                                <p className="typ-sm subinfo" style={{ marginTop: '1rem' }}>This theme is defined in Fable's global demo styling.</p>
                              </Tags.ColorPaletteSuggest>
                            </div>
                          </Tags.ColorPaletteCon>
                        )
                    }
                    </Tags.CardContentCon>
                  </Tags.ProductCardCon>
                  <Tags.ManualDemoContainer>
                    <Tags.ManualDemo
                      className="typ-sm"
                      onClick={this.handleFinishCreatingDemoManually}
                    >
                      Finish creating the demo manually
                    </Tags.ManualDemo>
                  </Tags.ManualDemoContainer>
                </Tags.Con>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn="fadeInRight"
                animationOut="fadeOutLeft"
                animationInDuration={200}
                animationOutDuration={200}
                animateOnMount={false}
                style={{
                  zIndex: this.state.currentDisplayState === DisplayState.ShowAIAddExistingTourCreditOptions ? 5 : 1
                }}
                isVisible={this.state.currentDisplayState === DisplayState.ShowAIAddExistingTourCreditOptions}
              >
                <Tags.Con>
                  <Tags.ProductCardCon className="typ-reg">
                    <Tags.CardContentCon>
                      <BuyMoreCredit
                        currentCredit={this.props.subs.availableCredits}
                        isBuyMoreCreditInProcess={this.state.isBuyMoreCreditInProcess}
                        buyMoreCredit={this.buyMoreCredit}
                      />
                    </Tags.CardContentCon>
                  </Tags.ProductCardCon>
                  <Tags.ManualDemoContainer>
                    <Tags.ManualDemo
                      className="typ-sm"
                      onClick={this.handleFinishCreatingDemoManually}
                    >
                      Finish creating the demo manually
                    </Tags.ManualDemo>
                  </Tags.ManualDemoContainer>
                </Tags.Con>
              </reactanimated.Animated>
              <reactanimated.Animated
                animationIn="fadeInRight"
                animationOut="fadeOutLeft"
                animationInDuration={200}
                animationOutDuration={200}
                animateOnMount={false}
                isVisible={this.state.currentDisplayState === DisplayState.ShowAiGenerationNotPossible}
              >
                <Tags.Con>
                  <Tags.ProductCardCon className="typ-reg">
                    <Tags.CardContentCon>
                      You haven't recorded enough screens for AI Demo creation. Please manually create the demo.
                    </Tags.CardContentCon>
                  </Tags.ProductCardCon>
                  <Tags.ManualDemoContainer>
                    <Tags.ManualDemo
                      className="typ-sm"
                      onClick={this.handleFinishCreatingDemoManually}
                    >
                      Finish creating the demo manually
                    </Tags.ManualDemo>
                  </Tags.ManualDemoContainer>
                </Tags.Con>
              </reactanimated.Animated>
            </div>
          </OnbordingTags.Con>
        </>
      );
    }

    if (this.state.saving) {
      return (
        <RootLayout
          dontShowIllustration
          dontShowStackedBars
          equalSpaced
          abs
          fullheight
        >
          <Tags.SkeletonCon style={{ transform: 'translateY(10rem)' }}>
            <Tags.HeaderText
              style={{ marginBottom: '0rem' }}
            >{this.state.allScreensCreated ? 'Almost there! Applying final touches to your demo' : 'Processing your product html for this interactive demo'}
            </Tags.HeaderText>
            {!this.state.allScreensCreated && (
              <Tags.SubheaderText>
                We are linking your product's colorscheme, styling, animations etc... so that your product's experiences
                could be showcased with highest fidelity.  It might take a little bit of time based on how your app is
                engineered.&nbsp;
                <i>
                  Please keep this tab open while we create your interactive demo.
                  You will be automatically redirected to the demo once we are done.
                </i>
              </Tags.SubheaderText>
            )}
            <Tags.SkeletonGrid>
              {this.state.creationMode === 'ai' && this.state.allScreensCreated && (
                <div style={{
                  background: '#fbf6ff',
                  padding: '1rem 2rem',
                  borderRadius: '8px',
                  boxShadow: 'rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 1px 3px 1px'
                }}
                >
                  <TypeAnimation
                    preRenderFirstString
                    cursor={false}
                    sequence={[
                      500,
                      'Please wait while Quilly fine tunes your demo',
                      500,
                      'Please wait while Quilly fine tunes your demo.',
                      500,
                      'Please wait while Quilly fine tunes your demo..',
                      500,
                      'Please wait while Quilly fine tunes your demo...',
                      500,
                    ]}
                    speed={75}
                    style={{ fontSize: '1.8rem' }}
                    repeat={Infinity}
                  />
                  <div style={{
                    display: 'flex',
                    gap: '2rem'
                  }}
                  >
                    <Suspense fallback={null}>
                      <div>
                        <LottiePlayer
                          style={{ height: '120px' }}
                          src="./quilly.json"
                          autoplay
                          loop
                        />
                        <p className="typ-sm">
                          Meet <em>Quilly</em>, <br />Your AI Demo Copilot.
                        </p>
                      </div>
                    </Suspense>
                    <div className="typ-reg" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', width: '100%', minHeight: '100px' }}>
                        <TypeAnimation
                          cursor={false}
                          sequence={[
                            500,
                            'Quilly is\n  ● analyzing your product details & demo objective\n  ● linking color palette to your product\'s html capture\n  ● generating content based on your demo objective\n  ● checking if your demo can be modularized',
                            15000,
                            '',
                          ]}
                          omitDeletionAnimation
                          speed={68}
                          style={{
                            fontSize: '1.25rem',
                            whiteSpace: 'pre-line',
                            display: 'block',
                            minHeight: '48px',
                            width: '80%'
                          }}
                          repeat={Infinity}
                        />
                        <Progress
                          type="circle"
                          percent={this.state.batchProgress}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: '100px',
                          }}
                          size="small"
                          showInfo={false}
                          strokeColor="#7567ff"
                        />
                      </div>
                      <p className="typ-sm" style={{ margin: '1rem 0' }}>
                        Please do not navigate away from this page while the demo is being created. You will be automatically redirected once the demo creation finishes.
                        <br />It might take few minutes if you have recorded a large demo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                flexWrap: 'wrap',
                width: '100%',
                opacity: this.state.allScreensCreated ? 0.5 : 1,
                margin: this.state.allScreensCreated ? '2rem 0' : 0,
                transition: 'all 0.2s ease-out'
              }}
              >
                {this.frameDataToBeProcessed.map((frameData, idx) => (
                  this.state.screens.length > idx
                    ? <ScreenCard
                        key={idx}
                        frameData={frameData}
                        favicon={this.state.screens[idx].info?.icon || null}
                    />
                    : <SkeletonCard key={idx} progress={this.state.percentageProgress[idx]} />
                ))}
              </div>
            </Tags.SkeletonGrid>
          </Tags.SkeletonCon>
        </RootLayout>
      );
    }
    return <></>;
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(CreateTour));
