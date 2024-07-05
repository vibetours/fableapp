import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CheckOutlined,
  DeleteOutlined,
  DownOutlined,
  EditFilled,
  PlusOutlined
} from '@ant-design/icons';
import { sentryTxReport } from '@fable/common/dist/sentry';
import {
  DEFAULT_BORDER_RADIUS,
  CmnEvtProp,
  LoadingStatus,
  NODE_NAME,
  SerDoc,
  ThemeCandidature,
  ThemeStats,
  IGlobalConfig
} from '@fable/common/dist/types';
import { getSampleConfig } from '@fable/common/dist/utils';
import { captureException, startTransaction, Transaction } from '@sentry/react';
import { Modal, Select } from 'antd';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { traceEvent } from '@fable/common/dist/amplitude';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { RespProxyAsset, RespTour } from '@fable/common/dist/api-contract';
import { addNewTourToAllTours, getAllTours, getGlobalConfig } from '../../action/creator';
import { AnnotationContent } from '../../component/annotation';
import ScreenCard from '../../component/create-tour/screen-card';
import SkeletonCard from '../../component/create-tour/skeleton-card';
import Loader from '../../component/loader';
import RootLayout from '../../component/ext-onboarding/root-layout';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { DB_NAME, OBJECT_KEY, OBJECT_KEY_VALUE, OBJECT_STORE } from './constants';
import { deleteDataFromDb, getDataFromDb, openDb } from './db-utils';
import * as Tags from './styled';
import { AnnotationThemeType, BorderRadiusThemeItem, ColorThemeItem, DBData, FrameDataToBeProcessed, ScreenInfo } from './types';
import { getBorderRadius, getOrderedColorsWithScore, getThemeAnnotationOpts, saveAsTour, saveScreen } from './utils';
import Button from '../../component/button';
import Input from '../../component/input';
import { amplitudeAddScreensToTour } from '../../amplitude';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc, setEventCommonState } from '../../utils';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';
import { PREVIEW_BASE_URL } from '../../constants';

const reactanimated = require('react-animated-css');

const { confirm } = Modal;

interface IDispatchProps {
  getAllTours: () => void;
  addNewTourToAllTours: (tour: RespTour)=> void;
  getGlobalConfig: () => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours(false)),
  addNewTourToAllTours: (tour: RespTour) => dispatch(addNewTourToAllTours(tour)),
  getGlobalConfig: () => dispatch(getGlobalConfig()),
});

interface IAppStateProps {
  tours: P_RespTour[];
  allToursLoaded: boolean;
  globalConfig: IGlobalConfig | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  allToursLoaded: state.default.allToursLoadingStatus === LoadingStatus.Done,
  globalConfig: state.default.globalConfig,
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

enum DisplayState {
  ShowTourCreationOptions = 1,
  ShowNewTourOptions,
  ShowAddExistingTourOptions,
  ShowColorThemeChoices,
  ShowBorderChoices,
  ShowReview,
}

type IOwnStateProps = {
  loading: boolean;
  showSaveWizard: boolean;
  saving: boolean;
  notDataFound: boolean;
  tourName: string;
  percentageProgress: Record<string, number>;
  showExistingTours: boolean;
  options: {
    value: string,
    label: JSX.Element
  }[];
  isReadyToSave: boolean,
  isScreenProcessed: boolean,
  saveType: 'new_tour' | 'existing_tour' | null,
  existingTourRId: string | null,
  screens: ScreenInfo[];
  colorList: ColorThemeItem[];
  selectedColor: string;
  borderRadiusList: Array<BorderRadiusThemeItem>;
  showMoreAnnotation: number;
  selectedBorderRadius: number | 'global' | null;
  currentDisplayState: DisplayState;
  prevDisplayState: DisplayState;
  openSelect: boolean;
}

class CreateTour extends React.PureComponent<IProps, IOwnStateProps> {
  private data: DBData | null;

  private db: IDBDatabase | null;

  private frameDataToBeProcessed: FrameDataToBeProcessed[][];

  private nameTourRef = React.createRef<HTMLInputElement>();

  private sentryTransaction : Transaction | null;

  private static readonly DEFAULT_SUGGESTED_COLORS = ['#0057ff', '#321b3a', '#051527', '#ffd073', '#7567ff'];

  private startTime: number | null;

  private defaultColorsInList: string[] = [];

  private proxyCache = new Map<string, RespProxyAsset>();

  constructor(props: IProps) {
    super(props);
    this.state = {
      loading: true,
      showSaveWizard: false,
      saving: false,
      percentageProgress: {},
      notDataFound: false,
      tourName: 'Untitled',
      showExistingTours: false,
      options: [],
      isReadyToSave: false,
      isScreenProcessed: false,
      saveType: null,
      existingTourRId: null,
      screens: [],
      colorList: [],
      selectedColor: '',
      borderRadiusList: [],
      showMoreAnnotation: 4,
      selectedBorderRadius: null,
      currentDisplayState: DisplayState.ShowTourCreationOptions,
      prevDisplayState: DisplayState.ShowTourCreationOptions,
      openSelect: false
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
      this.setState({ loading: false, showSaveWizard: true });
      this.processScreens();
      this.createSuggestionsForTheme();
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

    const cookieData = JSON.parse(this.data!.cookies);

    for (let i = 0; i < frameDataToBeProcessed.length; i++) {
      const frames = frameDataToBeProcessed[i];
      const screen = await saveScreen(this.proxyCache, frames, cookieData, (m, t) => {
        // eslint-disable-next-line no-mixed-operators
        const percentageProgress = Math.min(Math.ceil(m / t * 100), 100);
        this.setState(s => ({
          percentageProgress: {
            ...s.percentageProgress,
            [i]: percentageProgress
          },
        }));
      });
      this.setState((prevState: Readonly<IOwnStateProps>) => (
        { ...prevState, screens: [...prevState.screens, screen] }
      ));
    }

    this.setState({ isScreenProcessed: true });
  };

  createNewTour = (): void => {
    this.setState({ saveType: 'new_tour', isReadyToSave: true, saving: true, showSaveWizard: false });
  };

  saveTour = async (): Promise<void> => {
    if (!this.db) {
      return;
    }
    this.setState({ saving: true, showSaveWizard: false });

    const tour = await saveAsTour(
      this.state.screens,
      null,
      this.props.globalConfig!,
      this.state.tourName,
      this.state.selectedColor,
      this.state.selectedBorderRadius || DEFAULT_BORDER_RADIUS
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
        { },
        [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
      );
    } else {
      traceEvent(AMPLITUDE_EVENTS.SUGGESTED_COLOR_THEME_CHOOSEN, {
        color: this.state.selectedColor
      }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
    }

    this.props.navigate(`/${PREVIEW_BASE_URL}/demo/${tour.data.rid}?i=1`);
  };

  saveInExistingTour = async (value: string | null): Promise<void> => {
    if (!this.data || !this.db || !value) {
      return;
    }
    const existingTour = this.props.tours.filter(el => el.rid === value)[0];
    this.setState({ saving: true, showSaveWizard: false, tourName: existingTour.displayName });
    const tour = await saveAsTour(
      this.state.screens,
      existingTour,
      this.props.globalConfig!,
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
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevState.isReadyToSave !== this.state.isReadyToSave
      || prevState.isScreenProcessed !== this.state.isScreenProcessed) {
      if (this.state.isReadyToSave && this.state.isScreenProcessed) {
        if (this.state.saveType === 'new_tour') {
          this.saveTour();
        }

        if (this.state.saveType === 'existing_tour') {
          this.saveInExistingTour(this.state.existingTourRId);
        }
      }
    }

    if (this.state.currentDisplayState === DisplayState.ShowAddExistingTourOptions
      && this.state.currentDisplayState !== prevState.currentDisplayState) {
      this.setState({ openSelect: false });
      setTimeout(() => {
        this.setState({ openSelect: true });
      }, 500);
    }
  }

  componentWillUnmount(): void {
    this.db?.close();
  }

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

  render(): ReactElement {
    if (this.state.loading || this.props.globalConfig === null) {
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
                  <Button
                    iconPlacement="left"
                    onClick={() => {
                      this.setState({
                        currentDisplayState: DisplayState.ShowNewTourOptions,
                        prevDisplayState: DisplayState.ShowTourCreationOptions
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
                          this.setState({
                            showExistingTours: true,
                            currentDisplayState: DisplayState.ShowAddExistingTourOptions,
                            prevDisplayState: DisplayState.ShowTourCreationOptions
                          });
                        }}
                        icon={<DownOutlined />}
                        style={{ paddingTop: '14px', paddingBottom: '14px' }}
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
                            onClick={() => this.setState({
                              isReadyToSave: true,
                              saveType: 'existing_tour',
                              saving: true,
                              showSaveWizard: false
                            })}
                            disabled={this.state.saving}
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
                        prevDisplayState: DisplayState.ShowNewTourOptions
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
                          annotationSerialIdMap={{}}
                          navigateToAdjacentAnn={() => {}}
                          isThemeAnnotation
                        />

                        <Tags.AnnContentOverlay>
                          <Button
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
                          annotationSerialIdMap={{}}
                          navigateToAdjacentAnn={() => {}}
                          isThemeAnnotation
                        />
                        <Tags.AnnContentOverlay>
                          <Button
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
                    annotationSerialIdMap={{}}
                    navigateToAdjacentAnn={() => {}}
                    isThemeAnnotation
                  />
                </div>
                <Tags.ModalButtonsContainer style={{
                  width: '360px',
                  margin: '2rem 0',
                  flexDirection: 'column',
                  // alignItems: 'center'
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
            >Creating the interactive demo...
            </Tags.HeaderText>
            <Tags.SubheaderText>
              We are linking your product's colorscheme, styling, animations etc... so that your product's experiences could be showcased with highest fidelity. It might take a little bit of time based on how your app is engineered. <i>Please keep this tab open while we create your interactive demo. You will be automatically redirected to the demo once we are done.</i>
            </Tags.SubheaderText>
            <Tags.SkeletonGrid>
              {this.frameDataToBeProcessed.map((frameData, idx) => (
                this.state.screens.length > idx
                  ? <ScreenCard
                      key={idx}
                      frameData={frameData}
                      favicon={this.state.screens[idx].info?.icon || null}
                  />
                  : <SkeletonCard key={idx} progress={this.state.percentageProgress[idx]} />
              ))}
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
