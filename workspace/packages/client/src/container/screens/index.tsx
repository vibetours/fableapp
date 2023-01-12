import React from "react";
import { connect } from "react-redux";
import { getAllScreens } from "../../action/creator";
import { P_RespScreen } from "../../entity-processor";
import { TState } from "../../reducer";
import SidePanel from "../../component/side-panel";
import Header from "../../component/header";
import * as Tags from "./styled";
import * as GTags from "../../common-styled";
import linkOpenIcon from "../../assets/link.svg";

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
      <GTags.RowCon className="screen-con">
        <GTags.SidePanelCon>
          <SidePanel selected="screens" />
        </GTags.SidePanelCon>
        <GTags.MainCon>
          <GTags.HeaderCon>
            <Header rBtnTxt="Record a screen" />
          </GTags.HeaderCon>
          <GTags.BodyCon className={hasScreen ? "" : "centered"}>
            {hasScreen ? (
              <>
                <Tags.TxtCon>
                  <GTags.Txt className="head">All screens</GTags.Txt>
                  <GTags.Txt className="subhead">
                    Screens are like interactive snapshot of your product that you record from Fable's extension. You
                    can edit a screen, annotate part of the screen and stitch multiple screens to create guided tour of
                    your product.
                  </GTags.Txt>
                </Tags.TxtCon>
                <Tags.ScreenCardsCon>
                  {this.props.screens.map((screen) => (
                    <Tags.CardCon
                      key={screen.rid}
                      className={screen.related.length > 0 ? "multi" : ""}
                      to={`/screen/${screen.rid}`}
                    >
                      <Tags.CardImg src={screen.thumbnailUri.href} />
                      <Tags.CardFlexColCon style={{ marginTop: "0.35rem" }}>
                        <Tags.CardFlexRowCon>
                          {screen.icon && <Tags.CardIconMd src={screen.icon} alt="screen icon" />}
                          <GTags.Txt className="title">{screen.displayName}</GTags.Txt>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon>
                          <Tags.CardIconSm src={linkOpenIcon} alt="screen icon" />
                          <GTags.Txt className="link faded" title={screen.url}>
                            {screen.urlStructured.hostname}
                          </GTags.Txt>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon style={{ justifyContent: "space-between" }}>
                          <GTags.Txt>Edited {screen.displayableUpdatedAt}</GTags.Txt>
                          <Tags.CardIconLg src="https://avatars.dicebear.com/api/adventurer/tris.svg" />
                        </Tags.CardFlexRowCon>
                      </Tags.CardFlexColCon>
                    </Tags.CardCon>
                  ))}
                </Tags.ScreenCardsCon>
              </>
            ) : (
              <Tags.NoScreenMsgCon>
                <em>TODO</em> You don't have any screen recorded yet.
              </Tags.NoScreenMsgCon>
            )}
          </GTags.BodyCon>
        </GTags.MainCon>
      </GTags.RowCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(mapStateToProps, mapDispatchToProps)(Screens);
