import React from 'react';
import { connect } from 'react-redux';
import { LoadingStatus } from '@fable/common/dist/types';
import { TState } from '../../reducer';
import SidePanel from '../../component/side-panel';
import Header from '../../component/header';
import * as Tags from './styled';
import * as GTags from '../../common-styled';
import { createNewTour, getAllTours } from '../../action/creator';
import { P_RespTour } from '../../entity-processor';
import Btn from '../../component/btn';
import tourIcon from '../../assets/tours-icon-dark.svg';
import Loader from '../../component/loader';
import { withRouter, WithRouterProps } from '../../router-hoc';

interface IDispatchProps {
  getAllTours: () => void;
  createNewTour: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllTours: () => dispatch(getAllTours()),
  createNewTour: () => dispatch(createNewTour()),
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
interface IOwnStateProps {}

class Tours extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.getAllTours();
  }

  render() {
    const hasTours = this.props.tours.length > 0;
    if (hasTours && this.props.newTourLoadingStatus === LoadingStatus.Done && this.props.currentTour) {
      requestAnimationFrame(
        ((rid) => () => {
          this.props.navigate(`/tour/${rid}`);
        })(this.props.currentTour.rid)
      );
    }
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
                        <GTags.Txt className="title editable">{tour.displayName}</GTags.Txt>
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
      </GTags.RowCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Tours));
