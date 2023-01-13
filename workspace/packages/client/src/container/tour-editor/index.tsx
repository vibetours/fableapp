import React from "react";
import { connect } from "react-redux";
import { createPlaceholderTour, getAllScreens, loadTourAndData } from "../../action/creator";
import { P_RespTour, P_RespScreen } from "../../entity-processor";
import { TState } from "../../reducer";
import Header from "../../component/header";
// import * as Tags from "./styled";
import * as GTags from "../../common-styled";
import { withRouter, WithRouterProps } from "../../router-hoc";
import { TourData } from "@fable/common/dist/types";
import Canvas from "../../component/tour-canvas";

interface IDispatchProps {
  loadTourAndData: (rid: string) => void;
  getAllScreens: () => void;
  createPlaceholderTour: () => void;
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
    getAllScreens: () => dispatch(getAllScreens()),
    createPlaceholderTour: () => dispatch(createPlaceholderTour()),
  };
};

interface IAppStateProps {
  tour: P_RespTour | null;
  tourData: TourData | null;
  isLoaded: boolean;
  screens: P_RespScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  tourData: state.default.tourData,
  isLoaded: state.default.tourLoaded,
  screens: state.default.screens,
});

interface IOwnProps {
  // When a screen is open for preview a placeholder blank tour page is opened. Blank tour is not an entity that is present in
  // server. However when user makes changes to the scree, a Untitled Tour gets created. If user does not do anything to
  // the screen, the placeholder blank tour is rejected.
  isPlaceholderTour?: boolean;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
  }>;
interface IOwnStateProps {}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    if (this.props.isPlaceholderTour) {
      this.props.createPlaceholderTour();
    } else {
      this.props.loadTourAndData(this.props.match.params.tourId);
    }
    this.props.getAllScreens();
  }

  getHeaderTxtEl = (): React.ReactElement => {
    if (!this.props.isLoaded) {
      return <></>;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <GTags.Txt className="subsubhead">Edit tour</GTags.Txt>
        <GTags.Txt className="head" style={{ lineHeight: "1.5rem" }}>
          {this.props.tour?.displayName}
        </GTags.Txt>
      </div>
    );
  };

  render() {
    if (!this.props.isLoaded) {
      return <div>TODO show loader</div>;
    }
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            shouldShowLogoOnLeft={true}
            navigateToWhenLogoIsClicked={this.props.tour?.isPlaceholder ? "/screens" : "/tours"}
            titleElOnLeft={this.getHeaderTxtEl()}
          ></Header>
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: "100%", background: "#fff", padding: "0px" }}>
          <div style={{ position: "relative", height: "100%", width: "100%" }}>
            <Canvas cellWidth={20} screens={this.props.screens} />
          </div>
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(TourEditor));
