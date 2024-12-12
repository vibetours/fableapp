import { CaretRightOutlined, PlusOutlined } from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { ReqTourPropUpdate, RespOrg, RespSubscription, RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import { Modal, message } from 'antd';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import {
  createNewTour,
  deleteTour,
  duplicateTour,
  getAllTours,
  getCustomDomains,
  getSubscriptionOrCheckoutNew,
  publishTour,
  renameTour,
  updateTourProp
} from '../../action/creator';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import * as GTags from '../../common-styled';
import Button from '../../component/button';
import { StepContainer } from '../../component/ext-download';
import Header from '../../component/header';
import HomeDropDown from '../../component/homepage/home-dropdown';
import Input from '../../component/input';
import TopLoader from '../../component/loader/top-loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import TextArea from '../../component/text-area';
import EmptyTourState from '../../component/tour/empty-state';
import TourCard from '../../component/tour/tour-card';
import UpgradeModal from '../../component/upgrade/upgrade-modal';
import { TOP_LOADER_DURATION } from '../../constants';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { FeatureForPlan } from '../../plans';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { FeatureAvailability, Ops } from '../../types';
import SelectorComponent from '../../user-guides/selector-component';
import TourCardGuide from '../../user-guides/tour-card-guide';
import { createIframeSrc, fallbackFeatureAvailability, isExtensionInstalled, isFeatureAvailable } from '../../utils';
import * as Tags from './styled';
import Upgrade from '../../component/upgrade';

const userGuides = [TourCardGuide];

// TODO[now] delete code and states for upgrade modal if not required

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: (tourName: string, description: string) => void;
  renameTour: (tour: P_RespTour, newVal: string, newDescription: string) => void;
  duplicateTour: (tour: P_RespTour, displayName: string) => void;
  deleteTour: (tourRid: string) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void,
  getVanityDomains: () => void;
  getSubscriptionOrCheckoutNew: ()=> Promise<RespSubscription>;
}

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  publishTour: (tour) => dispatch(publishTour(tour)),
  getAllTours: () => dispatch(getAllTours(false)),
  createNewTour: (tourName: string, description: string) => dispatch(createNewTour(true, tourName, 'new', description)),
  renameTour: (tour: P_RespTour, newDisplayName: string, newDescription: string) => dispatch(
    renameTour(tour, newDisplayName, newDescription)
  ),
  duplicateTour: (tour: P_RespTour, displayName: string) => dispatch(duplicateTour(tour, displayName)),
  deleteTour: (tourRid: string) => dispatch(deleteTour(tourRid)),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
  getVanityDomains: () => dispatch(getCustomDomains()),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew()),
});

interface IAppStateProps {
  tours: P_RespTour[];
  userCreatedTours: P_RespTour[];
  subs: P_RespSubscription | null;
  allToursLoadingStatus: LoadingStatus;
  principal: RespUser | null;
  opsInProgress: Ops;
  org: RespOrg | null;
  featurePlan: FeatureForPlan | null;
  vanityDomains: P_RespVanityDomain[] | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  userCreatedTours: state.default.tours,
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  opsInProgress: state.default.opsInProgress,
  featurePlan: state.default.featureForPlan,
  vanityDomains: state.default.vanityDomains,

});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;
interface IOwnStateProps {
  showModal: boolean;
  selectedTour: P_RespTour | null;
  ctxAction: CtxAction;
  isExtInstalled: boolean;
  showUpgradeModal: boolean;
  createNewDemoFeatureAvailable: FeatureAvailability;
  shouldShowOnboardingVideoModal: boolean;
}
const { confirm } = Modal;

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  renameOrDuplicateOrCreateIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  interval : null | NodeJS.Timeout = null;

  renameOrDuplicateOrCreateDescRef: React.RefObject<HTMLTextAreaElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showModal: false,
      selectedTour: null,
      ctxAction: CtxAction.NA,
      isExtInstalled: false,
      showUpgradeModal: false,
      createNewDemoFeatureAvailable: fallbackFeatureAvailability,
      shouldShowOnboardingVideoModal: false,
    };
  }

  componentDidMount(): void {
    this.props.getAllTours();
    document.title = this.props.title;
    isExtensionInstalled()
      .then((isExtInstalled) => {
        this.setState({ isExtInstalled });
      });

    if (!this.state.isExtInstalled) {
      this.interval = setInterval(() => isExtensionInstalled()
        .then((isExtInstalled) => {
          isExtInstalled && this.clearExtensionInstallInterval();
          this.setState({ isExtInstalled });
        }), 3000);
    } else this.clearExtensionInstallInterval();

    if (this.props.featurePlan) this.handleFeatureAvailable();
    this.props.getVanityDomains();
  }

  clearExtensionInstallInterval = () : void => {
    if (this.interval) { clearInterval(this.interval); }
  };

  componentWillUnmount(): void {
    this.clearExtensionInstallInterval();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (prevProps.opsInProgress !== this.props.opsInProgress) {
      if (this.props.opsInProgress === Ops.DuplicateTour) {
        message.warning({
          content: 'Demo duplication is in progress! Please don\'t close this tab',
        });
      } else if (this.props.opsInProgress === Ops.None) {
        message.info({
          content: 'Duplication successful!',
          duration: 2
        });
      }
    }

    if (prevState.showModal !== this.state.showModal && this.state.showModal && this.state.ctxAction !== CtxAction.Create) {
      setTimeout(() => {
        this.renameOrDuplicateOrCreateIpRef.current!.focus();
        this.renameOrDuplicateOrCreateIpRef.current!.select();
      });
    }

    if ((this.props.featurePlan !== prevProps.featurePlan || this.props.tours !== prevProps.tours)
       && this.props.tours && this.props.featurePlan) {
      this.handleFeatureAvailable();
    }

    if (this.props.allToursLoadingStatus !== prevProps.allToursLoadingStatus && this.props.allToursLoadingStatus === LoadingStatus.Done) {
      this.setState({
        // shouldShowOnboardingVideoModal: this.props.userCreatedTours.length === 0 && localStorage.getItem('fable/ovs') !== '1',
        // INFO only show this when user has clicked on the button explicitly
        shouldShowOnboardingVideoModal: false,
      });
    }
  }

  handleFeatureAvailable(): void {
    // the reason length + 1 is done: for solo plan allowed number of demo is 1 and the feature plan conditon is <= 1
    // so when there are length = 0 demos length + 1 <= 1 is true, hence the demo would be created
    // so when there are length = 1 demo length + 1 <= 1 is false, hence the demo would be created
    // Sicne the feature plan test condition is <= 1, and we are detecting if more demos can be created or not we have
    // to do lenght + 1
    const isAvailable = isFeatureAvailable(this.props.featurePlan, 'no_of_demos', this.props.tours.length + 1);
    this.setState({ createNewDemoFeatureAvailable: isAvailable });
  }

  handleShowModal = (tour: P_RespTour | null, ctxAction: CtxAction): void => {
    this.setState({ selectedTour: tour, showModal: true, ctxAction });
  };

  handleDelete = (tour: P_RespTour | null): void => {
    confirm({
      title: 'Are you sure you want to delete this demo ?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        traceEvent(AMPLITUDE_EVENTS.GENERAL_TOUR_ACTIONS, {
          tour_action_type: 'delete',
          tour_url: createIframeSrc(`/demo/${tour!.rid}`)
        }, [CmnEvtProp.EMAIL]);
        this.props.deleteTour(tour!.rid);
      },
    });
  };

  handleModalOk = (): void => {
    const newVal = this.renameOrDuplicateOrCreateIpRef.current!.value.trim().replace(/\s+/, ' ');
    const descriptionVal = this.renameOrDuplicateOrCreateDescRef.current!.value.trim();
    if (!newVal) return;
    if (this.state.ctxAction === CtxAction.Rename) {
      if (newVal.toLowerCase() === this.state.selectedTour!.displayName.toLowerCase()
       && descriptionVal.toLowerCase() === this.state.selectedTour!.description.toLowerCase()) {
        return;
      }
      traceEvent(AMPLITUDE_EVENTS.GENERAL_TOUR_ACTIONS, {
        tour_action_type: 'rename',
        tour_url: createIframeSrc(`/demo/${this.state.selectedTour!.rid}`)
      }, [CmnEvtProp.EMAIL]);
      this.props.renameTour(this.state.selectedTour!, newVal, descriptionVal);
      this.state.selectedTour!.displayName = newVal;
    } else if (this.state.ctxAction === CtxAction.Duplicate) {
      traceEvent(AMPLITUDE_EVENTS.GENERAL_TOUR_ACTIONS, {
        tour_action_type: 'duplicate',
        tour_url: createIframeSrc(`/demo/${this.state.selectedTour!.rid}`)
      }, [CmnEvtProp.EMAIL]);
      this.props.duplicateTour(this.state.selectedTour!, newVal);
    } else if (this.state.ctxAction === CtxAction.Create) {
      traceEvent(
        AMPLITUDE_EVENTS.CREATE_NEW_TOUR,
        { from: 'app', tour_name: newVal },
        [CmnEvtProp.EMAIL]
      );
      this.props.createNewTour(newVal, descriptionVal);
    }

    this.setState({ selectedTour: null, showModal: false, ctxAction: CtxAction.NA });
  };

  handleRenameOrDuplicateOrCreateTourFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    this.handleModalOk();
  };

  handleModalCancel = (): void => {
    this.setState({ selectedTour: null, showModal: false, ctxAction: CtxAction.NA });
  };

  getModalInputDefaultVal = (): string => {
    switch (this.state.ctxAction) {
      case CtxAction.Duplicate:
        return `Copy of ${this.state.selectedTour!.displayName}`;
      case CtxAction.Rename:
        return `${this.state.selectedTour!.displayName}`;
      case CtxAction.Create:
        return 'Untitled';
      default:
        return '';
    }
  };

  getModalTitle = (): string => {
    switch (this.state.ctxAction) {
      case CtxAction.Duplicate:
        return 'Duplicate Demo';
      case CtxAction.Rename:
        return 'Rename Demo';
      case CtxAction.Create:
        return 'Create Demo';
      default:
        return '';
    }
  };

  getModalDesc = (): string => {
    switch (this.state.ctxAction) {
      case CtxAction.Duplicate:
        return 'Choose a name for the new duplicated demo.';
      case CtxAction.Rename:
      case CtxAction.Create:
        return 'Give a new name for this demo';
      default:
        return '';
    }
  };

  getIsAtleastOneAnnPublished = () : boolean => {
    const publishedTours = this.props.tours.filter((tour) => tour.lastPublishedDate !== undefined);
    if (publishedTours.length !== 0) return true;
    return false;
  };

  getIsAtleastOneDemoCreated = (): boolean => Boolean(this.props.tours.find(tour => tour.onboarding === false));

  skipOnboadingVideo = () => {
    traceEvent(AMPLITUDE_EVENTS.ONBOARDING_DEMO_MODAL_CLOSED, {}, [CmnEvtProp.EMAIL]);
    this.setState({
      shouldShowOnboardingVideoModal: false
    }),
    localStorage.setItem('fable/ovs', '1');
  };

  render(): ReactElement {
    const toursLoaded = this.props.allToursLoadingStatus === LoadingStatus.Done;

    return (
      <GTags.ColCon className="tour-con">
        {this.props.loadingState === 'loading' && <TopLoader
          duration={TOP_LOADER_DURATION}
          showLogo={false}
          showOverlay
        />}
        <SkipLink />
        <div style={{ height: '48px' }}>
          <Header
            subs={this.props.subs}
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            org={this.props.org}
            leftElGroups={[]}
            vanityDomains={this.props.vanityDomains}
            checkCredit={this.props.getSubscriptionOrCheckoutNew}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          { toursLoaded && (
            <GTags.SidePanelCon>
              <SidePanel
                selected="tours"
                subs={this.props.subs}
                compact={this.props.userCreatedTours.length === 0}
              />
            </GTags.SidePanelCon>
          )}
          <GTags.MainCon>
            <GTags.BodyCon
              style={{
                height: '100%',
                overflowY: 'auto',
                flexDirection: 'row',
                gap: '3rem',
                paddingLeft: '3%',
                background: '#f5f5f5',
                transition: 'background 0.1s ease-in',
              }}
              id="main"
            >
              {toursLoaded ? (
                <>
                  {
                    this.props.userCreatedTours.length === 0 ? (
                      <EmptyTourState
                        isAtleastOneDemoCreated={this.getIsAtleastOneDemoCreated()}
                        extensionInstalled={this.state.isExtInstalled}
                        isAtleastOneTourPublished={this.getIsAtleastOneAnnPublished()}
                        openOnboardingVideo={() => {
                          traceEvent(AMPLITUDE_EVENTS.ONBOARDING_DEMO_URL_CLICKED, {}, [CmnEvtProp.EMAIL]);
                          this.setState({ shouldShowOnboardingVideoModal: true });
                        }}
                      />
                    ) : (
                      <>
                        <div style={{ width: '100%', minWidth: '43.5rem' }}>
                          {!this.getIsAtleastOneAnnPublished() && (
                          <Tags.TopPanel style={{
                            display: 'flex',
                            alignItems: 'stretch',
                            gap: ''
                          }}
                          >
                            <StepContainer
                              isAtleastOneDemoCreated={this.getIsAtleastOneDemoCreated()}
                              extensionInstalled={this.state.isExtInstalled}
                              isAtleastOneTourPublished={this.getIsAtleastOneAnnPublished()}
                            />

                          </Tags.TopPanel>
                          )}
                          <GTags.BottomPanel style={{
                            width: '100%',
                            overflow: 'auto',
                            display: 'flex',
                            gap: '4rem',
                            alignItems: 'start'
                          }}
                          >
                            <div style={{ width: '60%', overflow: 'auto', padding: '0 4px', maxWidth: '680px' }}>
                              <div
                                style={{
                                  margin: '1rem 0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <Tags.ToursHeading style={{ fontWeight: 400 }}>All demos in your org</Tags.ToursHeading>
                                <Button
                                  icon={<PlusOutlined />}
                                  iconPlacement="left"
                                  onClick={() => this.handleShowModal(null, CtxAction.Create)}
                                  intent={this.state.isExtInstalled ? 'primary' : 'secondary'}
                                >
                                  Create a demo
                                </Button>
                              </div>
                              {this.props.tours.map((tour, index) => (
                                <TourCard
                                  publishTour={this.props.publishTour}
                                  key={tour.rid}
                                  tour={tour}
                                  i={index}
                                  handleShowModal={this.handleShowModal}
                                  handleDelete={this.handleDelete}
                                  updateTourProp={this.props.updateTourProp}
                                  vanityDomains={this.props.vanityDomains}
                                />
                              ))}
                            </div>
                            <HomeDropDown
                              isExtInstalled={!this.state.isExtInstalled ? !this.getIsAtleastOneAnnPublished() : true}
                              firstTourId={this.props.userCreatedTours[0]?.rid}
                              atLeastOneDemoCreated={this.getIsAtleastOneDemoCreated()}
                            />
                          </GTags.BottomPanel>
                          <SelectorComponent userGuides={userGuides} />
                        </div>
                      </>
                    )
                  }
                </>
              ) : (
                <div style={{ width: '100%', position: 'relative', transform: 'translate(-3%, 0px)' }}>
                  <TopLoader duration={TOP_LOADER_DURATION} showLogo text="Loading demos for you" />
                </div>
              )}
            </GTags.BodyCon>
          </GTags.MainCon>
        </GTags.RowCon>
        {this.state.ctxAction !== CtxAction.NA && (
          <GTags.BorderedModal
            donotShowHeaderStip
            containerBg="#f5f5f5"
            style={{ height: '10px' }}
            open={this.state.showModal}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}
            footer={(
              <div className="button-two-col-cont">
                <Button
                  type="button"
                  intent="secondary"
                  onClick={this.handleModalCancel}
                  style={{ flex: 1 }}
                >
                  Cancel
                </Button>
                {this.state.ctxAction !== CtxAction.Create && (
                  <Button
                    style={{ flex: 1 }}
                    onClick={this.handleModalOk}
                  >
                    Save
                  </Button>
                )}
              </div>
            )}
          >
            <div className="modal-content-cont">
              {this.state.ctxAction === CtxAction.Create ? (
                <div>
                  <p className="typ-h2">Use Fable's Chrome Extension to create a new demo</p>
                  <ol className="typ-reg">
                    {!this.state.isExtInstalled && (
                      <li>Install Fable's Chrome Extension</li>
                    )}
                    <li>Go to the website/ application that you want to create a demo of</li>
                    <li>Once you are ready, click on the “Start Recording” button in Fable's extension</li>
                    <li>After the recording is complete, click on the “Stop Recording” button in the extension</li>
                  </ol>
                  <GTags.OurCollapse
                    shadow="none"
                    expandIconPosition="start"
                    // eslint-disable-next-line react/no-unstable-nested-components
                    expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
                    size="small"
                    bordered={false}
                    items={[{
                      key: '1',
                      label: <div className="typ-h2">Create a new demo by uploading images</div>,
                      children: (
                        this.state.createNewDemoFeatureAvailable.isAvailable ? (
                          <form
                            onSubmit={this.handleRenameOrDuplicateOrCreateTourFormSubmit}
                            style={{ paddingTop: '1rem', gap: '1rem', flexDirection: 'column', display: 'flex' }}
                          >
                            <Input
                              label={this.getModalDesc()}
                              id="renameOrDuplicateOrCreateTour"
                              innerRef={this.renameOrDuplicateOrCreateIpRef}
                              defaultValue={this.getModalInputDefaultVal()}
                            />
                            <TextArea
                              label="Enter description for this demo"
                              innerRef={this.renameOrDuplicateOrCreateDescRef}
                              defaultValue=""
                            />
                            <Button
                              style={{ flex: 1 }}
                              onClick={this.handleModalOk}
                            >
                              Save
                            </Button>
                          </form>
                        ) : (<Upgrade subs={this.props.subs} inline />)
                      )
                    }]}
                  />
                </div>
              ) : (
                <>
                  <div className="typ-h2">{this.getModalTitle()}</div>
                  <form
                    onSubmit={this.handleRenameOrDuplicateOrCreateTourFormSubmit}
                    style={{ marginTop: '0.5rem', paddingTop: '1rem', gap: '1rem', flexDirection: 'column', display: 'flex' }}
                  >
                    <Input
                      label={this.getModalDesc()}
                      id="renameOrDuplicateOrCreateTour"
                      innerRef={this.renameOrDuplicateOrCreateIpRef}
                      defaultValue={this.getModalInputDefaultVal()}
                    />
                    <TextArea
                      label="Enter description for this demo"
                      innerRef={this.renameOrDuplicateOrCreateDescRef}
                      defaultValue={this.state.ctxAction === CtxAction.Duplicate
                        ? '' : this.state.selectedTour?.description || ''}
                    />
                  </form>
                </>
              )}
            </div>
          </GTags.BorderedModal>
        )}
        <GTags.BorderedModal
          donotShowHeaderStip
          containerBg="#212121"
          destroyOnClose
          style={{ height: '10px' }}
          open={this.state.shouldShowOnboardingVideoModal}
          onOk={this.skipOnboadingVideo}
          onCancel={this.skipOnboadingVideo}
          width={880}
          footer={(
            <div className="button-two-col-cont">
              <Button
                type="button"
                intent="link"
                onClick={this.skipOnboadingVideo}
                style={{ flex: 1, color: '#f5f5f5' }}
              >
                Close
              </Button>
            </div>
            )}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <iframe
              src={`https://app.sharefable.com/embed/demo/fable-onboarding-demo-baehgzwhn5gfz1ly?email=${this.props.principal?.email}`}
              title="How to use Fable"
              style={{
                border: 'none',
                width: '850px',
                height: '600px'
              }}
              allow="fullscreen"
              allowFullScreen
            />
          </div>
        </GTags.BorderedModal>
        <UpgradeModal
          showUpgradePlanModal={this.state.showUpgradeModal}
          setShowUpgradePlanModal={(upgrade: boolean) => { this.setState({ showUpgradeModal: upgrade }); }}
          subs={this.props.subs}
          isInBeta={this.state.createNewDemoFeatureAvailable.isInBeta}
        />
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
