import React from 'react';
import { connect } from 'react-redux';
import { ScreenData, TourData } from '@fable/common/dist/types';
import {
  createPlaceholderTour,
  getAllScreens,
  loadScreenAndData,
  loadTourAndData,
  savePlaceHolderTour,
  copyScreenForCurrentTour,
} from '../../action/creator';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import Header from '../../component/header';
import * as GTags from '../../common-styled';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Canvas from '../../component/tour-canvas';
import ScreenEditor from '../../component/screen-editor';

interface IDispatchProps {
  loadTourAndData: (rid: string) => void;
  getAllScreens: () => void;
  createPlaceholderTour: () => void;
  loadScreenAndData: (rid: string) => void;
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => void;
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
  getAllScreens: () => dispatch(getAllScreens()),
  createPlaceholderTour: () => dispatch(createPlaceholderTour()),
  loadScreenAndData: (rid: string) => dispatch(loadScreenAndData(rid)),
  savePlaceHolderTour: (tour: P_RespTour, screen: P_RespScreen) => dispatch(savePlaceHolderTour(tour, screen)),
  copyScreenForCurrentTour: (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
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

interface IOwnProps {}

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
    if (this.props.match.params.tourId) {
      this.props.loadTourAndData(this.props.match.params.tourId);
    } else {
      this.props.createPlaceholderTour();
    }
    if (this.props.match.params.screenId) {
      this.props.loadScreenAndData(this.props.match.params.screenId);
    }

    // TODO do this only when add screen to tour button is clicked from
    this.props.getAllScreens();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (prevProps.isTourLoaded && prevProps.tour?.isPlaceholder === true && !this.props.tour?.isPlaceholder) {
      this.props.copyScreenForCurrentTour(this.props.tour!, this.props.screen!);
    }
  }

  isLoadingComplete = () => {
    let result = true;
    if (this.props.match.params.tourId) {
      result = result && this.props.isTourLoaded;
    }
    if (this.props.match.params.screenId) {
      result = result && this.props.isScreenLoaded;
    }
    return result;
  };

  shouldShowScreen = () => {
    let result = false;
    if (this.props.match.params.screenId) {
      result = this.props.isScreenLoaded;
      if (this.props.match.params.tourId) {
        result = result && this.props.isTourLoaded;
      }
    }
    return result;
  };

  getHeaderTxtEl = (): React.ReactElement => {
    if (!this.isLoadingComplete()) {
      return <>TODO show loading bar</>;
    }

    let firstLine;
    let secondLine;
    if (this.props.match.params.tourId && this.props.match.params.screenId) {
      firstLine = (
        <>
          For tour <span className="emph">{this.props.tour?.displayName}</span> edit screen
        </>
      );
      secondLine = this.props.screen?.displayName;
    } else if (this.props.match.params.tourId) {
      firstLine = <>Edit tour</>;
      secondLine = this.props.tour?.displayName;
    } else {
      firstLine = <>Edit screen</>;
      secondLine = this.props.screen?.displayName;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <GTags.Txt className="subsubhead">{firstLine}</GTags.Txt>
        <GTags.Txt className="head" style={{ lineHeight: '1.5rem' }}>
          {secondLine}
        </GTags.Txt>
      </div>
    );
  };

  private onScreenEditStart = () => {
    if (this.props.tour?.isPlaceholder) {
      this.props.savePlaceHolderTour(this.props.tour, this.props.screen!);
    }
  };

  private onScreenEditFinish = () => {};

  render() {
    if (!this.isLoadingComplete()) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            shouldShowLogoOnLeft
            navigateToWhenLogoIsClicked={!this.props.match.params.tourId ? '/screens' : '/tours'}
            titleElOnLeft={this.getHeaderTxtEl()}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fff' /* padding: '0px' */ }}>
          {/*
              TODO this is temp until siddhi is done with the screen zooming via canvas
                   after that integrate as part of Canvas
            */}
          {this.shouldShowScreen() ? (
            <ScreenEditor
              screen={this.props.screen!}
              screenData={this.props.screenData!}
              screenEdits={null}
              onScreenEditStart={this.onScreenEditStart}
              onScreenEditFinish={this.onScreenEditFinish}
            />
          ) : (
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div>
          )}
          {/*
            <div style={{ position: 'relative', height: '100%', width: '100%' }}>
              <Canvas cellWidth={20} screens={this.props.screens} />
            </div> */}
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
