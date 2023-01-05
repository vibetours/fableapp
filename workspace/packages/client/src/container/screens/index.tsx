import React from "react";
import { connect } from "react-redux";
import { getAllScreens } from "../../action/creator";
import { P_RespScreen } from "../../entity-processor";
import { TState } from "../../reducer";
import SidePanel from "../../component/side-panel";
import Header from "../../component/header";
import * as Tags from "./styled";
import { PageType } from "../../constant";

interface IDispatchProps {
  getAllScreens: () => void;
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    getAllScreens: () => dispatch(getAllScreens()),
  };
};

interface IAppStateProps {
  screens: P_RespScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  screens: state.default.screens,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps {}

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.getAllScreens();
  }

  render() {
    const hasScreen = this.props.screens.length > 0;
    return (
      <Tags.Con className="screen-con">
        <Tags.SidePanelCon>
          <SidePanel selected="screens" />
        </Tags.SidePanelCon>
        <Tags.MainCon>
          <Tags.HeaderCon>
            <Header from={PageType.Screen}></Header>
          </Tags.HeaderCon>
          <Tags.BodyCon className={hasScreen ? "" : "centered"}>
            {hasScreen ? (
              <>
                <Tags.TxtCon>
                  <Tags.Txt className="head">All screens</Tags.Txt>
                  <Tags.Txt className="subhead">
                    Screens are like interactive snapshot of your product that you record from Fable's extension. You
                    can edit a screen, annotate part of the screen and stitch multiple screens to create guided tour of
                    your product.
                  </Tags.Txt>
                </Tags.TxtCon>
                <Tags.ScreenCardsCon>
                  {this.props.screens.map((screen) => (
                    <Tags.CardCon key={screen.rid}>
                      <Tags.CardImg src={screen.thumbnailUri.href} />
                    </Tags.CardCon>
                  ))}
                </Tags.ScreenCardsCon>
              </>
            ) : (
              <Tags.NoScreenMsgCon>
                <em>TODO</em> You don't have any screen recorded yet.
              </Tags.NoScreenMsgCon>
            )}
          </Tags.BodyCon>
        </Tags.MainCon>
      </Tags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(mapStateToProps, mapDispatchToProps)(Screens);
