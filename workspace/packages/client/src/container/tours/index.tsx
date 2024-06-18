import { PlusOutlined } from '@ant-design/icons';
import { ApiResp, OnboardingTourForPrev, ReqTourPropUpdate, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { message, Modal } from 'antd';
import { traceEvent } from '@fable/common/dist/amplitude';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import {
  createNewTour,
  getAllTours,
  renameTour,
  duplicateTour,
  deleteTour,
  publishTour,
  updateTourProp,
  getCustomDomains,
  // createDefaultTour,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { P_RespSubscription, P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { FeatureAvailability, Ops, SiteData } from '../../types';
import * as Tags from './styled';
import OnboardingDemos from '../../component/tour/onboarding-demos';
import Button from '../../component/button';
import Input from '../../component/input';
import TourCard from '../../component/tour/tour-card';
import EmptyTourState from '../../component/tour/empty-state';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import SelectorComponent from '../../user-guides/selector-component';
import TourCardGuide from '../../user-guides/tour-card-guide';
import { createIframeSrc, fallbackFeatureAvailability, isExtensionInstalled, isFeatureAvailable } from '../../utils';
import ExtDownloadRemainder from '../../component/ext-download';
import TextArea from '../../component/text-area';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import { FeatureForPlan } from '../../plans';
import UpgradeModal from '../../component/upgrade/upgrade-modal';

const userGuides = [TourCardGuide];

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
  onboardingToursForPreview: OnboardingTourForPrev[]
  showUpgradeModal: boolean;
  createNewDemoFeatureAvailable: FeatureAvailability;
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
      onboardingToursForPreview: [],
      showUpgradeModal: false,
      createNewDemoFeatureAvailable: fallbackFeatureAvailability
    };
  }

  getPreviewTours = async () => {
    try {
      const resp = await api<null, ApiResp<OnboardingTourForPrev[]>>('/onbtrspreview', { auth: true });
      this.setState({
        onboardingToursForPreview: resp.data,
      });
    } catch (e) {
      raiseDeferredError(e as Error);
    }
  };

  componentDidMount(): void {
    this.getPreviewTours();
    this.props.getAllTours();
    document.title = this.props.title;
    isExtensionInstalled()
      .then((isExtInstalled) => {
        this.setState({ isExtInstalled });
      });

    if (!this.state.isExtInstalled) {
      this.interval = setInterval(() => isExtensionInstalled()
        .then((isExtInstalled) => {
          this.setState({ isExtInstalled });
        }), 5000);
    } else this.clearExtensionInstallInterval();

    if (this.props.featurePlan) {
      this.handleFeatureAvailable();
    }
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

    if (prevState.showModal !== this.state.showModal && this.state.showModal) {
      setTimeout(() => {
        this.renameOrDuplicateOrCreateIpRef.current!.focus();
        this.renameOrDuplicateOrCreateIpRef.current!.select();
      });
    }

    if ((this.props.featurePlan !== prevProps.featurePlan || this.props.tours !== prevProps.tours)
       && this.props.tours && this.props.featurePlan) {
      this.handleFeatureAvailable();
    }
  }

  handleFeatureAvailable(): void {
    const isAvailable = isFeatureAvailable(this.props.featurePlan, 'no_of_demos', this.props.tours.length);
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
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            org={this.props.org}
            leftElGroups={[]}
            vanityDomains={this.props.vanityDomains}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel
              selected="tours"
              tourAvailable={this.props.tours.length > 0}
              firstTourRid={this.props.tours[0]?.rid}
              subs={this.props.subs}
            />
          </GTags.SidePanelCon>
          <GTags.MainCon>
            <GTags.BodyCon
              style={{ height: '100%', overflowY: 'auto', flexDirection: 'row', gap: '3rem', paddingLeft: '3%' }}
              id="main"
            >
              {toursLoaded ? (
                <>
                  {
                    this.props.userCreatedTours.length === 0 ? (
                      <EmptyTourState
                        isAtleastOneDemoCreated={this.getIsAtleastOneDemoCreated()}
                        principal={this.props.principal}
                        defaultTours={this.state.onboardingToursForPreview}
                        extensionInstalled={this.state.isExtInstalled}
                        isAtleastOneTourPublished={this.getIsAtleastOneAnnPublished()}
                      />
                    ) : (
                      <>
                        <div style={{ width: '45%', minWidth: '43.5rem' }}>
                          <Tags.TopPanel style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
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
                          </Tags.TopPanel>
                          <GTags.BottomPanel style={{ overflow: 'auto' }}>
                            {this.props.tours.map((tour, index) => (
                              <TourCard
                                publishTour={this.props.publishTour}
                                key={tour.rid}
                                tour={tour}
                                handleShowModal={this.handleShowModal}
                                handleDelete={this.handleDelete}
                                updateTourProp={this.props.updateTourProp}
                                disable={index >= this.props.tours.length - 1 ? false
                                  : !this.state.createNewDemoFeatureAvailable.isAvailable}
                                showUpgradeModal={() => { this.setState({ showUpgradeModal: true }); }}
                                vanityDomains={this.props.vanityDomains}
                              />
                            ))}
                          </GTags.BottomPanel>
                          <SelectorComponent userGuides={userGuides} />
                        </div>
                        <div>
                          <ExtDownloadRemainder
                            isAtleastOneDemoCreated={this.getIsAtleastOneDemoCreated()}
                            extensionInstalled={this.state.isExtInstalled}
                            isAtleastOneTourPublished={this.getIsAtleastOneAnnPublished()}
                          />
                          <OnboardingDemos
                            layout="column"
                            previewTours={this.state.onboardingToursForPreview}
                          />
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
                <Button
                  style={{ flex: 1 }}
                  onClick={this.handleModalOk}
                >
                  Save
                </Button>
              </div>
            )}
          >
            <div className="modal-content-cont">
              <div className="modal-title">{this.getModalTitle()}</div>
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
                  defaultValue={this.state.ctxAction === CtxAction.Duplicate
                    ? '' : this.state.selectedTour?.description || ''}
                />
              </form>
            </div>
          </GTags.BorderedModal>
        )}
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
