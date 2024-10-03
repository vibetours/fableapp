import React from 'react';
import { connect } from 'react-redux';
import { ReqTourPropUpdate, RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import { Link } from 'react-router-dom';
import { Button as AntButton, Dropdown, MenuProps, Popover, Progress, Tooltip } from 'antd';
import {
  ClockCircleFilled,
  CloseOutlined,
  CodeFilled,
  EditOutlined,
  ShareAltOutlined,
  UndoOutlined
} from '@ant-design/icons';
import { CmnEvtProp, IAnnotationConfig, LoadingStatus, TourData, TourDataWoScheme } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import {
  clearCurrentTourSelection,
  flushTourDataToMasterFile,
  getCustomDomains,
  getSubscriptionOrCheckoutNew,
  loadTourAndData,
  publishTour,
  upateTourDataUsingLLM,
  updateTourProp
} from '../../action/creator';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import {
  DisplaySize,
  RESP_MOBILE_SRN_HEIGHT,
  RESP_MOBILE_SRN_WIDTH,
  getDimensionsBasedOnDisplaySize,
  initLLMSurvey,
  isEventValid,
  isMobilePreviewDisplaySize,
  sendPreviewHeaderClick,
} from '../../utils';
import * as Tags from './styled';
import Header from '../../component/header';
import PublishOptions from '../../component/publish-preview/publish-options';
import Button from '../../component/button';
import { DEMO_LOADED_AFTER_AI_UPDATE, IFRAME_BASE_URL } from '../../constants';
import { EditItem, ExtMsg, QuillyInPreviewProgress, ScreenSizeData, SiteData, UpdateDemoUsingQuillyError } from '../../types';
import PersonalVarEditor from '../../component/personal-var-editor/personal-var-editor';
import BuyMoreCredit from '../../component/create-tour/buy-more-credit';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

const progressMap = {
  [QuillyInPreviewProgress.NOT_STARTED]: 0,
  [QuillyInPreviewProgress.ROOT_ROUTER]: 40,
  [QuillyInPreviewProgress.LLM_CALL_FOR_TOUR_UPDATE]: 75,
  [QuillyInPreviewProgress.UPDATE_TOUR]: 90,
  [QuillyInPreviewProgress.LOAD_TOUR]: 99
};
const progressStepOrder: QuillyInPreviewProgress[] = Object.keys(progressMap) as QuillyInPreviewProgress[];

interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  clearCurrentTour: () => void;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  getVanityDomains: () => void;
  upateTourDataUsingLLM: (
    newDemoObjective: string,
    currentAnnotationRefId: string | null,
    updateCompletedStep: (currStep: QuillyInPreviewProgress) => void,
  ) => void;
  flushTourDataToMasterFile: (tour: P_RespTour, edits: TourDataWoScheme) => Promise<void>;
  getSubscriptionOrCheckoutNew: () => Promise<RespSubscription>;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true, true)),
  publishTour: (tour) => dispatch(publishTour(tour)),
  clearCurrentTour: () => dispatch(clearCurrentTourSelection()),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
  getVanityDomains: () => dispatch(getCustomDomains()),
  upateTourDataUsingLLM: (
    newDemoObjective: string,
    currentAnnotationRefId: string | null,
    updateCompletedStep: (currStep: QuillyInPreviewProgress) => void,
  ) => dispatch(upateTourDataUsingLLM(newDemoObjective, currentAnnotationRefId, updateCompletedStep)),
  flushTourDataToMasterFile:
    (tour: P_RespTour, updatedTour: TourDataWoScheme) => dispatch(flushTourDataToMasterFile(tour, updatedTour)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  org: RespOrg | null;
  principal: RespUser | null;
  isTourLoaded: boolean;
  vanityDomains: P_RespVanityDomain[] | null;
  subs: P_RespSubscription | null;
  tourData: TourData | null;
  annotationsForScreens: Record<string, IAnnotationConfig[]>;
  updateDemoUsingAIError: UpdateDemoUsingQuillyError;
  globalEdits: EditItem[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  principal: state.default.principal,
  isTourLoaded: state.default.tourLoaded,
  org: state.default.org,
  vanityDomains: state.default.vanityDomains,
  subs: state.default.subs,
  annotationsForScreens: state.default.remoteAnnotations,
  tourData: state.default.tourData,
  updateDemoUsingAIError: state.default.updateDemoUsingAIError,
  globalEdits: state.default.remoteGlobalEdits,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{ tourId: string }>;

interface IOwnStateProps {
  showReplayOverlay: boolean;
  previewIframeKey: number;
  showShareModal: boolean;
  viewScale: number;
  minimalHeader: boolean;
  embedQueryParams: string;
  showPersVarsEditor: boolean;
  currentAnnRefId: string | null;
  screenSizeData: ScreenSizeData | null;
  newDemoObjective: string;
  quillyProgress: number;
  tourDataEditStack: {id: number, tourData: TourData, description: string}[];
  nextEditId: number;
  activeEditId: number;
  tourUpdateMode: 'ai' | 'history' | 'na';
  isBuyMoreCreditInProcess: boolean;
  aiCreditsAvailable: number;
  placeholderText: string;
  placeholderWordIndex: number;
  prevDescription: string;
  completedStep: QuillyInPreviewProgress | null;
  updateDemoLoadingStatus: LoadingStatus;
}

const MAX_EDIT_STACK = 5;
const CREDIT_USED_FOR_LLM_CALL = 2;
const placeholderOptions = [
  'Tell Quilly what modification you\'d want to do in the demo [Beta]',
  'Translate the demo content to Spanish',
  'Personalize demo by addressing by {{ first_name }}',
  'Switch the demo to dark theme',
  'Make the demo content humorous and engaging'
];

class PublishPreview extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private frameConRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private originalQueryParams = '?staging=true';

  private intervalId: NodeJS.Timeout | null = null;

  private placeholderTimer: NodeJS.Timeout | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      screenSizeData: null,
      previewIframeKey: 0,
      showShareModal: false,
      viewScale: 1,
      minimalHeader: false,
      embedQueryParams: this.originalQueryParams,
      showPersVarsEditor: false,
      currentAnnRefId: null,
      newDemoObjective: '',
      quillyProgress: 0,
      tourDataEditStack: [],
      tourUpdateMode: 'na',
      nextEditId: 1,
      activeEditId: -1,
      isBuyMoreCreditInProcess: false,
      aiCreditsAvailable: 0,
      placeholderText: '',
      placeholderWordIndex: 0,
      prevDescription: '',
      completedStep: null,
      updateDemoLoadingStatus: LoadingStatus.NotStarted
    };
  }

  receiveMessage = (e: MessageEvent): void => {
    if (!isEventValid(e)) return;
    if (e.data.type === 'lastAnnotation') {
      this.setState({ showReplayOverlay: true });
      initLLMSurvey();
    } else if (e.data.sender === 'sharefable.com' && e.data.type === ExtMsg.OnNavigation) {
      const annRefId = e.data.payload.currentAnnotationRefId;
      this.setState({ currentAnnRefId: annRefId });
    } else if (e.data.type === 'screen-size-data') {
      this.setState({
        screenSizeData: {
          // TODO fix the types
          iframePos: (e.data as any).iframePos,
          scaleFactor: (e.data as any).scaleFactor
        }
      });
    } else if (e.data.type === DEMO_LOADED_AFTER_AI_UPDATE) {
      this.amplitudeEvtForQuillyTextAreaUsed(true);
      this.resetQuillyProgress();
    }
  };

  resetQuillyProgress = () : void => {
    this.setState({
      newDemoObjective: '',
      completedStep: null,
      updateDemoLoadingStatus: LoadingStatus.NotStarted
    });
    this.placeholderTimer && clearTimeout(this.placeholderTimer);
    this.placeholderTimer = null;
    this.typewritePlaceholderTextInQuillyTextbox();
    this.intervalId && clearInterval(this.intervalId);
  };

  componentDidMount(): void {
    document.title = this.props.title;

    window.addEventListener('message', this.receiveMessage, false);

    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);
    this.showMinimalHeaderIfReq();
    this.props.getVanityDomains();
    if (this.props.subs) this.setState({ aiCreditsAvailable: this.props.subs.availableCredits });
    this.typewritePlaceholderTextInQuillyTextbox();
  }

  showMinimalHeaderIfReq(): void {
    const isMinimalHeader = this.props.searchParams.get('i');
    if (isMinimalHeader === '1') {
      this.setState({ minimalHeader: true });
    }
  }

  amplitudeEvtForQuillyTextAreaUsed = (isUpdateSuccessfull: boolean): void => {
    if (this.state.tourUpdateMode !== 'ai') return;
    traceEvent(AMPLITUDE_EVENTS.PREVIEW_DEMO_QUILLY_USED, {
      anonymous_demo_id: this.props.tour!.info.annDemoId || '',
      update_requested: this.state.newDemoObjective,
      is_update_successfull: isUpdateSuccessfull
    }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  };

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
      if (this.props.searchParams.get('s') !== '3') {
        this.setState({ viewScale: 1 });
      } else {
        const timer = setTimeout(() => {
          const vpdW = RESP_MOBILE_SRN_WIDTH;
          const vpdH = RESP_MOBILE_SRN_HEIGHT;
          const headerHeight = 76;

          const frameConRect = this.frameConRef.current?.getBoundingClientRect();

          if (frameConRect && (frameConRect.width < vpdW || frameConRect.height < vpdH)) {
            const scaleX = frameConRect.width / vpdW;
            const scaleY = (frameConRect.height - headerHeight) / vpdH;
            const scale = Math.round(Math.min(scaleX, scaleY) * 100) / 100;

            this.setState({ viewScale: scale });
          }
          clearTimeout(timer);
        }, 50);
      }
    }

    if (prevProps.searchParams.get('i') !== this.props.searchParams.get('i')) {
      this.showMinimalHeaderIfReq();
    }

    if (prevProps.updateDemoUsingAIError.hasErr !== this.props.updateDemoUsingAIError.hasErr
       && this.props.updateDemoUsingAIError.hasErr) {
      this.amplitudeEvtForQuillyTextAreaUsed(false);
      if (this.props.updateDemoUsingAIError.isSkillNa) {
        traceEvent(
          AMPLITUDE_EVENTS.QUILLY_RETURNED_SKILL_AS_NA,
          {
            update_requested: this.state.newDemoObjective,
          },
          [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
        );
      }
      this.setState({ updateDemoLoadingStatus: LoadingStatus.Error, completedStep: null });
    }

    if (this.props.subs !== prevProps.subs && !this.state.isBuyMoreCreditInProcess && this.props.subs) {
      this.setState({ aiCreditsAvailable: this.props.subs.availableCredits });
    }

    if (this.state.completedStep !== prevState.completedStep) {
      // load tour in iframe
      if (this.state.completedStep === QuillyInPreviewProgress.UPDATE_TOUR) {
        this.previewFrameRef.current && this.previewFrameRef.current.contentWindow!.postMessage(
          {
            type: ExtMsg.UpdateDemo,
            demoUpdated: true,
          },
          '*'
        );
      }

      // update progress
      const currentStepIdx = progressStepOrder.findIndex((ele) => ele === this.state.completedStep);
      this.setState(ps => (ps.completedStep && { ...ps, quillyProgress: progressMap[ps.completedStep] }));
      const nextStepIdx = Math.min(currentStepIdx + 1, progressStepOrder.length - 1);
      const nextStep = progressStepOrder[nextStepIdx];
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      this.intervalId = setInterval(() => {
        this.setState((ps) => {
          const progress = ps.quillyProgress;

          const newProgress = Math.min(progress + 1, progressMap[nextStep]);

          return { ...ps, quillyProgress: newProgress };
        });
      }, 600);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);
  }

  updateDisplaySize = (displaySize: DisplaySize): void => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.set('s', displaySize.toString());
    const updatedUrl = url.pathname + url.search;
    this.props.navigate(updatedUrl);
  };

  handleReplayClick = (): void => {
    this.setState({ showReplayOverlay: false, previewIframeKey: Math.random() });
    sendPreviewHeaderClick();
  };

  private onSiteDataChange = (site: SiteData): void => {
    this.props.updateTourProp(this.props.tour!.rid, 'site', site);
  };

  handleUpdateDisplaySize = (selectedDisplaySize: DisplaySize): void => {
    sendPreviewHeaderClick();
    this.updateDisplaySize(selectedDisplaySize);
  };

  addPrevTourToEditStack = (): void => {
    if (!this.props.tourData) return;
    if (this.props.updateDemoUsingAIError.hasErr) {
      this.setState(prevState => ({
        prevDescription: prevState.newDemoObjective,
        activeEditId: -1
      }));
      return;
    }

    this.setState(prevState => {
      const newEdit = {
        id: prevState.nextEditId,
        description: prevState.prevDescription || 'base',
        tourData: this.props.tourData!
      };

      let allEdits;
      const activeEditIndex = prevState.tourDataEditStack.findIndex(item => item.id === prevState.activeEditId);
      if (activeEditIndex === -1) {
        allEdits = [newEdit, ...prevState.tourDataEditStack].slice(0, MAX_EDIT_STACK);
      } else {
        allEdits = [...prevState.tourDataEditStack.slice(activeEditIndex)].slice(0, MAX_EDIT_STACK);
      }

      return {
        nextEditId: prevState.nextEditId + 1,
        tourDataEditStack: allEdits,
        prevDescription: prevState.newDemoObjective,
        activeEditId: -1
      };
    });
  };

  updateCompletedStep = (currStep: QuillyInPreviewProgress): void => {
    this.setState({ completedStep: currStep });
  };

  handleQuillySubmit = async (isDisabled: boolean): Promise<void> => {
    if (isDisabled) return;
    this.addPrevTourToEditStack();
    this.setState({ tourUpdateMode: 'ai', updateDemoLoadingStatus: LoadingStatus.InProgress });
    this.props.upateTourDataUsingLLM(this.state.newDemoObjective, this.state.currentAnnRefId, this.updateCompletedStep);
  };

  handleHistoryUpdate = async (item: {
    id: number;
    tourData: TourData;
    description: string;
  }): Promise<void> => {
    if (this.state.updateDemoLoadingStatus === LoadingStatus.InProgress) return;
    if (this.state.tourUpdateMode === 'ai') this.addPrevTourToEditStack();
    this.setState({
      tourUpdateMode: 'history',
      activeEditId: item.id,
      updateDemoLoadingStatus: LoadingStatus.InProgress
    });
    await this.props.flushTourDataToMasterFile(this.props.tour!, item.tourData);
    this.setState({ completedStep: QuillyInPreviewProgress.UPDATE_TOUR });
    traceEvent(AMPLITUDE_EVENTS.PREVIEW_DEMO_HISTORY_SELECTED, {
      anonymous_demo_id: this.props.tour!.info.annDemoId || '',
      edit_id: item.id,
      edit_description: item.description
    }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  };

  checkCredit = (): void => {
    this.setState({ isBuyMoreCreditInProcess: true });
    const interval = setInterval(() => {
      this.props.getSubscriptionOrCheckoutNew().then((data: RespSubscription) => {
        if (data.availableCredits > this.state.aiCreditsAvailable) {
          this.setState({
            isBuyMoreCreditInProcess: false,
            aiCreditsAvailable: data.availableCredits
            //  buyCreditModalOpen: false
          });
          clearInterval(interval);
        }
      });
    }, 2000);
  };

  // TODO use react-type-animation package
  // This also has some experiencial issue -- once the sentence is finished, the next sentence is started immediately
  // without waiting for the user to wait
  typewritePlaceholderTextInQuillyTextbox = (): void => {
    const wordIndex = this.state.placeholderWordIndex;
    const placeholder = this.state.placeholderText;
    const currentWord = placeholderOptions[wordIndex];

    if (placeholder.length < currentWord.length) {
      this.setState(prevState => ({
        placeholderText: currentWord.substring(0, prevState.placeholderText.length + 1)
      }));
      this.placeholderTimer = setTimeout(this.typewritePlaceholderTextInQuillyTextbox, 100);
    } else {
      this.setState(prevState => ({
        placeholderText: '',
        placeholderWordIndex: (prevState.placeholderWordIndex + 1) % placeholderOptions.length
      }));
      this.placeholderTimer = setTimeout(() => {
        this.typewritePlaceholderTextInQuillyTextbox();
      }, 500);
    }
  };

  handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    if (this.placeholderTimer) {
      clearTimeout(this.placeholderTimer);
      this.placeholderTimer = null;
    } else if (e.target.value.length === 0) {
      this.typewritePlaceholderTextInQuillyTextbox();
    }
    this.setState({ newDemoObjective: e.target.value });
  };

  handleTextAreaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, quillySubmitDisabled: boolean): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      this.handleQuillySubmit(quillySubmitDisabled);
    }
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);
    const isMobilePreview = isMobilePreviewDisplaySize(+displaySize);
    const embedParams = isMobilePreview ? '&fframe=noframe' : '';
    const quillySubmitDisabled = this.state.updateDemoLoadingStatus === LoadingStatus.InProgress
      || this.state.newDemoObjective.trim().length === 0;
    const items: MenuProps['items'] = this.state.tourDataEditStack.length === 0
      ? [{
        label: <p>No history available, please make <br />some edit using quilly first</p>,
        key: 0
      }]
      : this.state.tourDataEditStack.map((item, index) => {
        const t = {
          label: (
            <div
              onClick={() => this.handleHistoryUpdate(item)}
              style={{
                backgroundColor: item.id === this.state.activeEditId ? 'whitesmoke' : 'white',
                padding: '0.3rem 1rem'
              }}
            >
              Edit {item.id}
              <br />
              <span className="typ-sm">{item.description}</span>
            </div>
          ),
          key: index,
          style: { padding: 0 },
        };
        return t;
      });

    return (
      <Tags.Con ref={this.frameConRef}>
        <Tags.HeaderCon>
          {this.props.tour && <Header
            subs={this.props.subs}
            org={this.props.org}
            userGuidesToShow={['Sharing or embedding your interactive demo']}
            showOnboardingGuides
            onLogoClicked={() => this.props.clearCurrentTour()}
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={(
              <div
                style={{ display: 'flex', alignItems: 'center' }}
              >
                <span className="overflow-ellipsis">
                  {this.props.tour.displayName}
                </span>
              </div>
            )}
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour.rid}`} style={{ color: 'black' }}>
                <AntButton
                  size="small"
                  className="edit-btn"
                  type="default"
                  onClick={sendPreviewHeaderClick}
                >
                  Edit demo
                </AntButton>
              </Link>
            )]}
            principal={this.props.principal}
            tour={this.props.tour}
            publishOptions={<PublishOptions
              showShareModal={this.state.showShareModal}
              setShowShareModal={(showShareModal: boolean) => this.setState({ showShareModal })}
              handleReplayClick={this.handleReplayClick}
              publishTour={this.props.publishTour}
              tour={this.props.tour}
              selectedDisplaySize={+displaySize}
              setSelectedDisplaySize={this.handleUpdateDisplaySize}
              onSiteDataChange={this.onSiteDataChange}
              minimalHeader={this.state.minimalHeader}
              vanityDomains={this.props.vanityDomains}
            />}
            tourOpts={null}
            onSiteDataChange={this.onSiteDataChange}
            showCalendar
            minimalHeader={this.state.minimalHeader}
            vanityDomains={this.props.vanityDomains}
          />}
        </Tags.HeaderCon>

        <Tags.PreviewFrameWrapper
          showOverlay={this.state.showReplayOverlay}
          style={{ transform: `scale(${this.state.viewScale})` }}
        >
          {this.state.showReplayOverlay && (
            <div className="replay-overlay" style={{ height, width }}>
              <Button
                intent="secondary"
                icon={<UndoOutlined />}
                iconPlacement="left"
                style={{ background: '#fff' }}
                onClick={this.handleReplayClick}
              >
                Replay
              </Button>

              <Button
                intent="secondary"
                icon={<EditOutlined />}
                iconPlacement="left"
                onClick={() => this.props.navigate(`/demo/${this.props.tour?.rid}`)}
                style={{ background: '#7ceaf3' }}
              >
                Edit
              </Button>

              {
                !this.state.minimalHeader && (
                  <Button
                    intent="primary"
                    icon={<ShareAltOutlined />}
                    iconPlacement="left"
                    onClick={() => this.setState({ showShareModal: true })}
                  >
                    Share
                  </Button>
                )
              }
            </div>
          )}

          {this.props.isTourLoaded && (
            <iframe
              key={this.state.previewIframeKey}
              ref={this.previewFrameRef}
              id="preview-frame"
              height={height}
              width={width}
              className="preview-frame"
              src={`${baseURL}/${IFRAME_BASE_URL}/demo/${this.props.tour?.rid}${this.state.embedQueryParams}${embedParams}`}
              title="hello"
            />
          )}
          <Tags.EditCon>
            {this.props.isTourLoaded && this.state.screenSizeData && (
            <Tags.QuickEditPanel
              h={this.state.screenSizeData.iframePos.height}
              y={this.state.screenSizeData.iframePos.top}
              x={this.state.screenSizeData.iframePos.left}
            >
              <div
                className="panel-item"
              >
                <Popover
                  overlayClassName="quick-edit-popover"
                  content={
                    <Tags.QuickEditPopoverCon>
                      <div className="close-btn" onClick={() => this.setState({ showPersVarsEditor: false })}>
                        <CloseOutlined />
                      </div>
                      <div>
                        <PersonalVarEditor
                          setShowEditor={(showPersVarsEditor: boolean) => {
                            this.setState({ showPersVarsEditor });
                          }}
                          annotationsForScreens={this.props.annotationsForScreens}
                          tour={this.props.tour!}
                          changePersVarParams={(embedQueryParams: string) => {
                            this.setState({ embedQueryParams });
                          }}
                          originalPersVarsParams={this.originalQueryParams}
                          datasets={this.props.tour!.datasets!}
                          edits={this.props.globalEdits}
                        />
                      </div>
                    </Tags.QuickEditPopoverCon>
                  }
                  open={this.state.showPersVarsEditor}
                  placement="left"
                >
                  <div onClick={() => this.setState(state => ({ showPersVarsEditor: !state.showPersVarsEditor }))}>
                    <Tooltip title="Customize demo" placement="left">
                      <CodeFilled />
                    </Tooltip>
                  </div>
                </Popover>
              </div>
              {displaySize === '0' && (
                <div className="panel-item">
                  <Tooltip placement="left" title="History">
                    <Dropdown
                      menu={{ items }}
                      trigger={['click']}
                      placement="topRight"
                    >
                      <ClockCircleFilled />
                    </Dropdown>
                  </Tooltip>
                </div>
              )}
            </Tags.QuickEditPanel>
            )}
          </Tags.EditCon>
        </Tags.PreviewFrameWrapper>
        {this.props.subs && this.props.isTourLoaded && displaySize === '0' && (
          <Tags.QuillyCon>
            <Tags.QuillyInputCon>
              <div
                style={{
                  visibility: this.state.updateDemoLoadingStatus === LoadingStatus.Error ? 'visible' : 'hidden',
                  fontWeight: 500,
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
                className="err-line"
              >
                <span>Failed to update demo. Please try by changing the prompt in the textarea.&nbsp;
                  {this.props.updateDemoUsingAIError.errMsg
                 && <span>[Message from Quilly: {this.props.updateDemoUsingAIError.errMsg}]</span>}
                </span>
                <CloseOutlined
                  style={{ cursor: 'pointer' }}
                  onClick={this.resetQuillyProgress}
                />
              </div>
              <Progress
                showInfo={false}
                size="small"
                style={{
                  margin: 0,
                  lineHeight: 0,
                  padding: '0px 4px',
                  visibility: this.state.updateDemoLoadingStatus === LoadingStatus.InProgress ? 'visible' : 'hidden'
                }}
                strokeLinecap="round"
                percent={this.state.quillyProgress}
                strokeColor="#9ba7ae"
              />
              <textarea
                onChange={this.handleTextAreaChange}
                placeholder={this.state.placeholderText}
                value={this.state.newDemoObjective}
                onKeyDown={(e) => this.handleTextAreaKeyDown(e, quillySubmitDisabled)}
                disabled={this.state.updateDemoLoadingStatus === LoadingStatus.InProgress}
              />
            </Tags.QuillyInputCon>
            { this.state.aiCreditsAvailable < CREDIT_USED_FOR_LLM_CALL
              ? <BuyMoreCredit
                  currentCredit={this.props.subs.availableCredits}
                  isBuyMoreCreditInProcess={this.state.isBuyMoreCreditInProcess}
                  checkCredit={this.checkCredit}
                  showCreditInfo={false}
                  onBuyMoreCreditClick={() => {}}
              />
              : (
                <Tooltip
                  placement="topLeft"
                  title={
                  quillySubmitDisabled
                    ? 'Tell Quilly what edit you want to do and press Ctrl/Cmd + Enter'
                    : 'Submit (or press Ctrl/Cmd + Enter)'
                }
                >
                  <Tags.QuillySubmit
                    onClick={() => this.handleQuillySubmit(quillySubmitDisabled)}
                    disabled={quillySubmitDisabled}
                  />
                </Tooltip>
              )}
          </Tags.QuillyCon>
        )}
      </Tags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PublishPreview));
