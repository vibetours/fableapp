import React from 'react';
import { connect } from 'react-redux';
import { LoadingStatus } from '@fable/common/dist/types';
import { MenuOutlined } from '@ant-design/icons';
import Popover from 'antd/lib/popover';
import Modal from 'antd/lib/modal';
import { TState } from '../../reducer';
import SidePanel from '../../component/side-panel';
import Header from '../../component/header';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import { createNewTour, getAllTours, renameTour } from '../../action/creator';
import { P_RespTour } from '../../entity-processor';
import Btn from '../../component/btn';
import tourIcon from '../../assets/tours-icon-dark.svg';
import Loader from '../../component/loader';
import { withRouter, WithRouterProps } from '../../router-hoc';

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
  newTourLoadingStatus: LoadingStatus;
  currentTour: P_RespTour | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tours: state.default.tours,
  newTourLoadingStatus: state.default.newTourLoadingStatus,
  currentTour: state.default.currentTour,
});

interface IOwnProps {}
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
  }

  handleShowModal = (e: React.MouseEvent<HTMLDivElement>, tour: P_RespTour) => {
    e.stopPropagation();
    e.preventDefault();
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
    const hasTours = this.props.tours.length > 0;
    return (
      <GTags.RowCon className="tour-con">
        <GTags.SidePanelCon>
          <SidePanel selected="tours" />
        </GTags.SidePanelCon>
        <GTags.MainCon>
          <GTags.HeaderCon>
            <Header />
          </GTags.HeaderCon>
          <GTags.BodyCon style={{ height: '100%' }}>
            {hasTours ? (
              <>
                {this.props.newTourLoadingStatus === LoadingStatus.InProgress ? (
                  <Loader width="80px" txtBefore="Creating a new flow for you" />
                ) : (
                  <Tags.TopPanel>
                    <Btn icon="plus" onClick={this.props.createNewTour}>
                      Create a new tour
                    </Btn>
                  </Tags.TopPanel>
                )}
                <Tags.BottomPanel>
                  {this.props.tours.map((tour) => (
                    <Tags.TourCardCon key={tour.rid} to={`/tour/${tour.rid}`}>
                      <Tags.TourCardLane>
                        <img src={tourIcon} alt="" style={{ height: '16px', width: '16px', marginRight: '0.25rem' }} />
                        <GTags.Txt className="title">
                          {tour.displayName}
                        </GTags.Txt>
                        <Popover
                          content={
                            <GTags.PopoverMenuItem onClick={e => this.handleShowModal(e, tour)}>
                              Rename Tour
                            </GTags.PopoverMenuItem>
                          }
                          trigger="hover"
                          placement="right"
                        >
                          <MenuOutlined
                            onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            style={{ display: 'block', marginLeft: 'auto', padding: '0.4rem', color: '#bdbdbd' }}
                          />
                        </Popover>
                      </Tags.TourCardLane>
                      <Tags.TourCardLane style={{ justifyContent: 'space-between' }}>
                        <GTags.Txt
                          className="faded"
                          style={{
                            marginLeft: '20px',
                          }}
                        >
                          Edited {tour.displayableUpdatedAt}
                        </GTags.Txt>
                        <img
                          src="https://avatars.dicebear.com/api/adventurer/tris.svg"
                          alt=""
                          style={{ height: '24px', width: '24px' }}
                        />
                      </Tags.TourCardLane>
                    </Tags.TourCardCon>
                  ))}
                </Tags.BottomPanel>
              </>
            ) : (
              <div>
                <em>TODO</em> You don't have any screen recorded yet.
              </div>
            )}
          </GTags.BodyCon>
        </GTags.MainCon>
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
                style={{ padding: '0.5rem 1rem',
                  marginTop: '0.75rem',
                  fontSize: '1rem',
                  borderRadius: '8px',
                  width: 'calc(100% - 2rem)'
                }}
                value={this.state.selectedTourName}
                onChange={e => this.setState({ selectedTourName: e.target.value })}
              />
            </label>
          </form>
        </Modal>
      </GTags.RowCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
