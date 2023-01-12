import React from "react";
import { connect } from "react-redux";
import { getAllScreens, loadTourAndData } from "../../action/creator";
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
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    loadTourAndData: (rid: string) => dispatch(loadTourAndData(rid)),
    getAllScreens: () => dispatch(getAllScreens()),
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

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
  }>;
interface IOwnStateProps {}

class TourEditor extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.loadTourAndData(this.props.match.params.tourId);
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
            navigateToWhenLogoIsClicked="/tours"
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
