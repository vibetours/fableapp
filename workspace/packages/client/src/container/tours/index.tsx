import { BarChartOutlined, BranchesOutlined, CaretRightOutlined, DeleteOutlined, EditOutlined, MoreOutlined, NodeIndexOutlined, ShareAltOutlined } from '@ant-design/icons';
import { RespUser } from '@fable/common/dist/api-contract';
import { LoadingStatus } from '@fable/common/dist/types';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Popover from 'antd/lib/popover';
import Tooltip from 'antd/lib/tooltip';
import React from 'react';
import { connect } from 'react-redux';
import { createNewTour, getAllTours, renameTour } from '../../action/creator';
import * as GTags from '../../common-styled';
import Btn from '../../component/btn';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import { P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: () => void;
  renameTour: (tour: P_RespTour, newVal: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours()),
  createNewTour: () => dispatch(createNewTour(true)),
  renameTour: (tour: P_RespTour, newVal: string) => dispatch(renameTour(tour, newVal)),
});

interface IAppStateProps {
  tours: P_RespTour[];
  allToursLoadingStatus: LoadingStatus;
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  principal: state.default.principal,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;
interface IOwnStateProps {
  showModal: boolean;
  selectedTour: P_RespTour | null;
  selectedTourName: string;
}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { showModal: false, selectedTour: null, selectedTourName: '' };
  }

  componentDidMount(): void {
    this.props.getAllTours();
    document.title = this.props.title;
  }

  handleShowModal = (e: React.MouseEvent<HTMLDivElement>, tour: P_RespTour) => {
    this.setState({ selectedTour: tour, selectedTourName: tour.displayName, showModal: true });
  };

  handleModalOk = () => {
    const newVal = this.state.selectedTourName.trim().replace(/\s+/, ' ');
    if (newVal.toLowerCase() === this.state.selectedTour!.displayName.toLowerCase()) {
      return;
    }
    this.props.renameTour(this.state.selectedTour!, newVal);
    this.state.selectedTour!.displayName = newVal;
    this.setState({ selectedTour: null, selectedTourName: '', showModal: false });
  };

  handleRenameTourFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    this.handleModalOk();
  };

  handleModalCancel = () => {
    this.setState({ selectedTour: null, selectedTourName: '', showModal: false });
  };

  render() {
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
                            <GTags.Avatar src={this.props.principal?.avatar} />
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
                                <>
                                  <GTags.PopoverMenuItem onClick={e => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  >
                                    <ShareAltOutlined />&nbsp;&nbsp;&nbsp; Share / Embed Tour
                                  </GTags.PopoverMenuItem>
                                  <GTags.PopoverMenuItem onClick={e => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    this.handleShowModal(e, tour);
                                  }}
                                  >
                                    <EditOutlined />&nbsp;&nbsp;&nbsp;Rename Tour
                                  </GTags.PopoverMenuItem>
                                  <GTags.PopoverMenuItemDivider color="#ff735050" />
                                  <GTags.PopoverMenuItem
                                    onClick={e => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      window.alert('Delete :: Coming soon...');
                                    }}
                                    style={{
                                      color: '#ff7350'
                                    }}
                                  >
                                    <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Tour
                                  </GTags.PopoverMenuItem>
                                </>
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
        <Modal
          title="Rename Tour"
          open={this.state.showModal}
          onOk={this.handleModalOk}
          onCancel={this.handleModalCancel}
        >
          <form onSubmit={this.handleRenameTourFormSubmit}>
            <label htmlFor="renameTour">
              What would you like to rename the selected tour?
              <input
                id="renameTour"
                style={{
                  marginTop: '0.75rem',
                  fontSize: '1rem',
                  padding: '0.75rem',
                  borderRadius: '2px',
                  width: 'calc(100% - 2rem)'
                }}
                value={this.state.selectedTourName}
                onChange={e => this.setState({ selectedTourName: e.target.value })}
              />
            </label>
          </form>
        </Modal>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
