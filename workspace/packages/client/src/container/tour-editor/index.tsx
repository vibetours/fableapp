import React from 'react';
import { connect } from 'react-redux';
import { ScreenData, TourData } from '@fable/common/dist/types';
import { createPlaceholderTour, getAllScreens, loadScreenAndData, loadTourAndData } from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import Header from '../../component/header';
// import * as Tags from "./styled";
import * as GTags from '../../common-styled';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Canvas from '../../component/tour-canvas';
import ScreenEditor from '../../component/screen-editor';

interface IDispatchProps {
  loadTourAndData: (rid: string) => void;
  getAllScreens: () => void;
  createPlaceholderTour: () => void;
  loadScreenAndData: (rid: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
  getAllScreens: () => dispatch(getAllScreens()),
  createPlaceholderTour: () => dispatch(createPlaceholderTour()),
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  screen: P_RespScreen | null;
  screenData: ScreenData | null;
  tourData: TourData | null;
  isScreenLoaded: boolean;
  isTourLoaded: boolean;
  screens: P_RespScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  tourData: state.default.tourData,
  isTourLoaded: state.default.tourLoaded,
  screen: state.default.currentScreen,
  screenData: state.default.screenData,
  isScreenLoaded: state.default.screenLoaded,
  screens: state.default.screens,
});

interface IOwnProps {
  // When a screen is open for preview a placeholder blank tour page is opened. Blank tour is not an entity that is
  // present in server. However, when user makes changes to the scree, a Untitled Tour gets created. If user does not do
  // anything to the screen, the placeholder blank tour is rejected.
  isPlaceholderTour?: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
  }>;
interface IOwnStateProps {}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    if (this.props.isPlaceholderTour) {
      this.props.createPlaceholderTour();
      this.props.loadScreenAndData(this.props.match.params.screenId);
    } else {
      this.props.loadTourAndData(this.props.match.params.tourId);
    }
    this.props.getAllScreens();
  }

  isLoadingComplete = () => (
    (this.props.isPlaceholderTour && this.props.isScreenLoaded)
      || (!this.props.isPlaceholderTour && this.props.isTourLoaded)
  );

  getHeaderTxtEl = (): React.ReactElement => {
    if (!this.isLoadingComplete()) {
      return <></>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GTags.Txt className="subsubhead">Edit {this.props.tour?.isPlaceholder ? 'screen' : 'tour'}</GTags.Txt>
        <GTags.Txt className="head" style={{ lineHeight: '1.5rem' }}>
          {this.props.isPlaceholderTour ? this.props.screen?.displayName : this.props.tour?.displayName}
        </GTags.Txt>
      </div>
    );
  };

  render() {
    if (!this.isLoadingComplete()) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            shouldShowLogoOnLeft
            navigateToWhenLogoIsClicked={this.props.tour?.isPlaceholder ? '/screens' : '/tours'}
            titleElOnLeft={this.getHeaderTxtEl()}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fff', /* padding: '0px' */ }}>
          {this.props.tour?.isPlaceholder ? (
            /*
              TODO this is temp until siddhi is done with the screen zooming via canvas
                   after that integrate as part of Canvas
              */
            <ScreenEditor screen={this.props.screen!} screenData={this.props.screenData!} />
          ) : (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div>
          )}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
