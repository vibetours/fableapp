import { PlusOutlined } from '@ant-design/icons';
import { RespUser } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import message from 'antd/lib/message';
import Modal from 'antd/lib/modal';
import { traceEvent } from '@fable/common/dist/amplitude';
import {
  createNewTour,
  getAllTours,
  renameTour,
  duplicateTour,
  deleteTour,
  publishTour,
  createDefaultTour,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { Ops } from '../../types';
import * as Tags from './styled';
import Button from '../../component/button';
import Input from '../../component/input';
import TourCard from '../../component/tour/tour-card';
import EmptyTourState from '../../component/tour/empty-state';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import SelectorComponent from '../../user-guides/selector-component';
import TourCardGuide from '../../user-guides/tour-card-guide';
import { createIframeSrc, isExtensionInstalled } from '../../utils';
import ExtDownloadRemainder from '../../component/ext-download';
import TextArea from '../../component/text-area';

const userGuides = [TourCardGuide];

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: (tourName: string, description: string) => void;
  renameTour: (tour: P_RespTour, newVal: string, newDescription: string) => void;
  duplicateTour: (tour: P_RespTour, displayName: string) => void;
  deleteTour: (tourRid: string) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  createDefaultTour: () => void
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
  createDefaultTour: () => dispatch(createDefaultTour()),
});

interface IAppStateProps {
  tours: P_RespTour[];
  defaultTours: P_RespTour[];
  userCreatedTours: P_RespTour[];
  subs: P_RespSubscription | null;
  allToursLoadingStatus: LoadingStatus;
  principal: RespUser | null;
  opsInProgress: Ops;
  pubTourAssetPath: string;
  manifestFileName: string;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  defaultTours: state.default.tours.filter(tour => tour.onboarding),
  userCreatedTours: state.default.tours.filter(tour => !tour.onboarding),
  subs: state.default.subs,
  principal: state.default.principal,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  opsInProgress: state.default.opsInProgress,
  pubTourAssetPath: state.default.commonConfig?.pubTourAssetPath || '',
  manifestFileName: state.default.commonConfig?.manifestFileName || '',
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
}
const { confirm } = Modal;

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  renameOrDuplicateOrCreateIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  interval : null | NodeJS.Timeout = null;

  renameOrDuplicateOrCreateDescRef: React.RefObject<HTMLTextAreaElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = { showModal: false, selectedTour: null, ctxAction: CtxAction.NA, isExtInstalled: false };
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
          this.setState({ isExtInstalled });
        }), 5000);
    } else this.clearExtensionInstallInterval();
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

    if (prevProps.allToursLoadingStatus !== this.props.allToursLoadingStatus
      && this.props.allToursLoadingStatus === LoadingStatus.Done) {
      const shouldCreateDefaultTour = this.props.tours.length === 0;
      if (shouldCreateDefaultTour) {
        this.props.createDefaultTour();
      }
    }
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

  render(): ReactElement {
    const toursLoaded = this.props.allToursLoadingStatus === LoadingStatus.Done;

    return (
      <GTags.ColCon className="tour-con">
        <SkipLink />
        <div style={{ height: '48px' }}>
          <Header
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
            manifestPath=""
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
              style={{ height: '100%', overflowY: 'auto', flexDirection: 'row', gap: '3rem' }}
              id="main"
            >
              {toursLoaded ? (
                <>
                  {
                    this.props.userCreatedTours.length === 0 ? (
                      <EmptyTourState
                        principal={this.props.principal}
                        defaultTours={this.props.defaultTours}
                        publishTour={this.props.publishTour}
                        pubTourAssetPath={this.props.pubTourAssetPath}
                        manifestFileName={this.props.manifestFileName}
                        handleShowModal={this.handleShowModal}
                        handleDelete={this.handleDelete}
                        extensionInstalled={this.state.isExtInstalled}
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
                          <Tags.BottomPanel style={{ overflow: 'auto' }}>
                            {this.props.tours.map((tour) => (
                              <TourCard
                                publishTour={this.props.publishTour}
                                key={tour.rid}
                                tour={tour}
                                handleShowModal={this.handleShowModal}
                                handleDelete={this.handleDelete}
                                manifestPath={`${this.props.pubTourAssetPath}${tour.rid}/${this.props.manifestFileName}`}
                              />
                            ))}
                          </Tags.BottomPanel>
                          <SelectorComponent userGuides={userGuides} />
                        </div>
                        <ExtDownloadRemainder
                          extensionInstalled={this.state.isExtInstalled}
                          isAtleastOneTourPublished={this.getIsAtleastOneAnnPublished()}
                        />
                      </>
                    )
                  }
                </>
              ) : (
                <div style={{ width: '100%' }}>
                  <Loader width="80px" txtBefore="Loading demos for you" showAtPageCenter />
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
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
