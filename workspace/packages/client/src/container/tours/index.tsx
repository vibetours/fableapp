import { DeleteOutlined, PlusOutlined, SisternodeOutlined } from '@ant-design/icons';
import { RespUser } from '@fable/common/dist/api-contract';
import { LoadingStatus } from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import message from 'antd/lib/message';
import Modal from 'antd/lib/modal';
import { createNewTour, getAllTours, renameTour, duplicateTour, deleteTour } from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { Ops } from '../../types';
import * as Tags from './styled';
import Button from '../../component/button';
import Input from '../../component/input';
// import EmptyTourState from './empty-state';
import TourCard from '../../component/tour/tour-card';
import EmptyTourState from '../../component/tour/empty-state';
import { Text } from './styled';

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: (tourName: string) => void;
  renameTour: (tour: P_RespTour, newVal: string) => void;
  duplicateTour: (tour: P_RespTour, displayName: string) => void;
  deleteTour: (tourRid: string) => void;
}

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllTours: () => dispatch(getAllTours()),
  createNewTour: (tourName: string) => dispatch(createNewTour(true, tourName)),
  renameTour: (tour: P_RespTour, newDisplayName: string) => dispatch(renameTour(tour, newDisplayName)),
  duplicateTour: (tour: P_RespTour, displayName: string) => dispatch(duplicateTour(tour, displayName)),
  deleteTour: (tourRid: string) => dispatch(deleteTour(tourRid)),
});

interface IAppStateProps {
  tours: P_RespTour[];
  allToursLoadingStatus: LoadingStatus;
  principal: RespUser | null;
  opsInProgress: Ops
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  principal: state.default.principal,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  opsInProgress: state.default.opsInProgress,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;
interface IOwnStateProps {
  showModal: boolean;
  selectedTour: P_RespTour | null;
  ctxAction: CtxAction;
}
const { confirm } = Modal;

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  renameOrDuplicateOrCreateIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = { showModal: false, selectedTour: null, ctxAction: CtxAction.NA };
  }

  componentDidMount(): void {
    this.props.getAllTours();
    document.title = this.props.title;
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (prevProps.opsInProgress !== this.props.opsInProgress) {
      if (this.props.opsInProgress === Ops.DuplicateTour) {
        message.warning({
          content: 'Tour duplication is in progress! Please don\'t close this tab',
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
  }

  handleShowModal = (tour: P_RespTour | null, ctxAction: CtxAction): void => {
    this.setState({ selectedTour: tour, showModal: true, ctxAction });
  };

  handleDelete = (tour: P_RespTour | null): void => {
    confirm({
      title: 'Are you sure you want to delete this tour ?',
      icon: <DeleteOutlined />,
      onOk: () => { this.props.deleteTour(tour!.rid); },
    });
  };

  handleModalOk = (): void => {
    const newVal = this.renameOrDuplicateOrCreateIpRef.current!.value.trim().replace(/\s+/, ' ');
    if (!newVal) return;
    if (this.state.ctxAction === CtxAction.Rename) {
      if (newVal.toLowerCase() === this.state.selectedTour!.displayName.toLowerCase()) {
        return;
      }
      this.props.renameTour(this.state.selectedTour!, newVal);
      this.state.selectedTour!.displayName = newVal;
    } else if (this.state.ctxAction === CtxAction.Duplicate) {
      this.props.duplicateTour(this.state.selectedTour!, newVal);
    } else if (this.state.ctxAction === CtxAction.Create) {
      this.props.createNewTour(newVal);
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
        return 'Duplicate Tour';
      case CtxAction.Rename:
        return 'Rename Tour';
      case CtxAction.Create:
        return 'Create Tour';
      default:
        return '';
    }
  };

  getModalDesc = (): string => {
    switch (this.state.ctxAction) {
      case CtxAction.Duplicate:
        return 'Choose a name for the new duplicated tour.';
      case CtxAction.Rename:
      case CtxAction.Create:
        return 'Give a new name for this tour';
      default:
        return '';
    }
  };

  render(): ReactElement {
    const toursLoaded = this.props.allToursLoadingStatus === LoadingStatus.Done;
    return (
      <GTags.ColCon className="tour-con">
        <SkipLink />
        <div style={{ height: '48px' }}>
          <Header shouldShowFullLogo principal={this.props.principal} leftElGroups={[]} />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="tours" />
          </GTags.SidePanelCon>
          <GTags.MainCon>
            <GTags.BodyCon style={{ height: '100%', position: 'relative', overflowY: 'scroll' }} id="main">
              {toursLoaded ? (
                <>
                  {
                    this.props.tours.length === 0 ? (
                      <EmptyTourState />
                    ) : (
                      <div style={{ maxWidth: '43.5rem' }}>
                        <Tags.TopPanel style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        >
                          <Tags.ToursHeading style={{ fontWeight: 400 }}>All tours in your org</Tags.ToursHeading>
                          <Button
                            icon={<PlusOutlined />}
                            iconPlacement="left"
                            onClick={() => this.handleShowModal(null, CtxAction.Create)}
                          >
                            Create a tour
                          </Button>
                        </Tags.TopPanel>
                        <Tags.BottomPanel style={{ overflow: 'auto' }}>
                          {this.props.tours.map((tour) => (
                            <TourCard
                              key={tour.rid}
                              tour={tour}
                              handleShowModal={this.handleShowModal}
                              handleDelete={this.handleDelete}
                            />
                          ))}
                        </Tags.BottomPanel>
                      </div>
                    )
                  }
                </>
              ) : (
                <div>
                  <Loader width="80px" txtBefore="Loading tours for you" showAtPageCenter />
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
                style={{ paddingTop: '1rem' }}
              >
                <Input
                  label={this.getModalDesc()}
                  id="renameOrDuplicateOrCreateTour"
                  innerRef={this.renameOrDuplicateOrCreateIpRef}
                  defaultValue={this.getModalInputDefaultVal()}
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
