import {
  BarChartOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  NodeIndexOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { RespUser } from '@fable/common/dist/api-contract';
import { LoadingStatus } from '@fable/common/dist/types';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Popover from 'antd/lib/popover';
import Tooltip from 'antd/lib/tooltip';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import message from 'antd/lib/message';
import { createNewTour, getAllTours, renameTour, duplicateTour } from '../../action/creator';
import * as GTags from '../../common-styled';
import Btn from '../../component/btn';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { Ops } from '../../types';
import * as Tags from './styled';

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: () => void;
  renameTour: (tour: P_RespTour, newVal: string) => void;
  duplicateTour: (tour: P_RespTour, displayName: string) => void;
}

enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate'
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours()),
  createNewTour: () => dispatch(createNewTour(true)),
  renameTour: (tour: P_RespTour, newDisplayName: string) => dispatch(renameTour(tour, newDisplayName)),
  duplicateTour: (tour: P_RespTour, displayName: string) => dispatch(duplicateTour(tour, displayName)),
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

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  renameOrDuplicateIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = { showModal: false, selectedTour: null, ctxAction: CtxAction.NA };
  }

  componentDidMount(): void {
    this.props.getAllTours();
    document.title = this.props.title;
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
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
  }

  handleShowModal = (tour: P_RespTour, ctxAction: CtxAction): void => {
    this.setState({ selectedTour: tour, showModal: true, ctxAction });
  };

  handleModalOk = (): void => {
    const newVal = this.renameOrDuplicateIpRef.current!.value.trim().replace(/\s+/, ' ');
    if (!newVal) return;
    if (this.state.ctxAction === CtxAction.Rename) {
      if (newVal.toLowerCase() === this.state.selectedTour!.displayName.toLowerCase()) {
        return;
      }
      this.props.renameTour(this.state.selectedTour!, newVal);
      this.state.selectedTour!.displayName = newVal;
    } else if (this.state.ctxAction === CtxAction.Duplicate) {
      this.props.duplicateTour(this.state.selectedTour!, newVal);
    }
    this.setState({ selectedTour: null, showModal: false, ctxAction: CtxAction.NA });
  };

  handleRenameOrDuplicateTourFormSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    this.handleModalOk();
  };

  handleModalCancel = (): void => {
    this.setState({ selectedTour: null, showModal: false, ctxAction: CtxAction.NA });
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
            <GTags.BodyCon style={{ height: '100%' }} id="main">
              {toursLoaded ? (
                <>
                  <Tags.TopPanel style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginRight: '44%'
                  }}
                  >
                    <Tags.ToursHeading style={{ fontWeight: 400 }}>All tours in your org</Tags.ToursHeading>
                    <Btn
                      icon="plus"
                      onClick={this.props.createNewTour}
                      style={{
                        margin: '0',
                        border: '1px solid #150345',
                        color: '#150345',
                        borderRadius: '2px'
                      }}
                    >
                      Create a new tour
                    </Btn>
                  </Tags.TopPanel>
                  <Tags.BottomPanel style={{ overflow: 'auto' }}>
                    {this.props.tours.map((tour) => (
                      <Tags.TourCardCon key={tour.rid} to={`/tour/${tour.rid}`}>
                        <Tags.TourCardLane style={{ justifyContent: 'space-between' }}>
                          <Tags.LaneGroup>
                            <NodeIndexOutlined />
                            <GTags.Txt className="title">
                              {tour.displayName}
                            </GTags.Txt>
                          </Tags.LaneGroup>
                          <Tags.LaneGroup>
                            <GTags.Txt className="faded">
                              Edited {tour.displayableUpdatedAt}
                            </GTags.Txt>
                            <GTags.Avatar src={tour.createdBy.avatar} referrerPolicy="no-referrer" />
                          </Tags.LaneGroup>
                        </Tags.TourCardLane>
                        <Tags.TourCardLane style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}>
                          <Tags.LaneGroup style={{ gap: '0' }}>
                            <Tooltip title="Preview" overlayStyle={{ fontSize: '0.75rem' }}>
                              <Button
                                size="small"
                                shape="circle"
                                type="text"
                                icon={<CaretRightOutlined />}
                                onClick={e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.open(`/p/tour/${tour.rid}`)?.focus();
                                }}
                              />
                            </Tooltip>
                            <Tooltip title="Analytics" overlayStyle={{ fontSize: '0.75rem' }}>
                              <Button
                                size="small"
                                shape="circle"
                                type="text"
                                icon={<BarChartOutlined />}
                                onClick={e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  window.alert('ANALYTICS :: Coming soon...');
                                }}
                              />
                            </Tooltip>
                          </Tags.LaneGroup>
                          <Tags.LaneGroup style={{ gap: '0' }}>
                            <Popover
                              content={
                                <div onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                >
                                  <GTags.PopoverMenuItem
                                    onMouseDown={e => { }}
                                  >
                                    <ShareAltOutlined />&nbsp;&nbsp;&nbsp;Share / Embed Tour
                                  </GTags.PopoverMenuItem>
                                  <GTags.PopoverMenuItem
                                    onMouseDown={e => this.handleShowModal(tour, CtxAction.Rename)}
                                  >
                                    <EditOutlined />&nbsp;&nbsp;&nbsp;Rename Tour
                                  </GTags.PopoverMenuItem>
                                  <GTags.PopoverMenuItem
                                    onMouseDown={e => this.handleShowModal(tour, CtxAction.Duplicate)}
                                  >
                                    <CopyOutlined />&nbsp;&nbsp;&nbsp;Duplicate Tour
                                  </GTags.PopoverMenuItem>
                                  <GTags.PopoverMenuItemDivider color="#ff735050" />
                                  <GTags.PopoverMenuItem
                                    onMouseDown={e => window.alert('Delete :: Coming soon...')}
                                    style={{
                                      color: '#ff7350'
                                    }}
                                  >
                                    <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Tour
                                  </GTags.PopoverMenuItem>
                                </div>
                            }
                              trigger="focus"
                              placement="right"
                            >
                              <Button
                                size="small"
                                shape="circle"
                                type="text"
                                icon={<MoreOutlined />}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              />
                            </Popover>
                          </Tags.LaneGroup>
                        </Tags.TourCardLane>
                      </Tags.TourCardCon>
                    ))}
                  </Tags.BottomPanel>
                </>
              ) : (
                <div>
                  <Loader width="80px" txtBefore="Loading tours for you" />
                </div>
              )}
            </GTags.BodyCon>
          </GTags.MainCon>
        </GTags.RowCon>
        {this.state.ctxAction !== CtxAction.NA && (
          <Modal
            title={this.state.ctxAction === CtxAction.Rename ? 'Rename Tour' : 'Duplicate Tour'}
            open={this.state.showModal}
            onOk={this.handleModalOk}
            onCancel={this.handleModalCancel}
          >
            <form onSubmit={this.handleRenameOrDuplicateTourFormSubmit}>
              <label htmlFor="renameOrDuplicateTour">
                {this.state.ctxAction === CtxAction.Rename
                  ? 'Give a new name for this tour'
                  : 'Choose a name for duplicated tour. A new tour would be created with this name'}
                <input
                  id="renameOrDuplicateTour"
                  ref={this.renameOrDuplicateIpRef}
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '1rem',
                    padding: '0.75rem',
                    borderRadius: '2px',
                    width: 'calc(100% - 2rem)'
                  }}
                  defaultValue={`${this.state.ctxAction === CtxAction.Rename ? '' : 'Copy of '}${this.state.selectedTour!.displayName}`}
                />
              </label>
            </form>
          </Modal>
        )}
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
