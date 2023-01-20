import React from "react";
import { connect } from "react-redux";
import Modal from "antd/lib/modal";
import { getAllScreens } from "../../action/creator";
import { P_RespScreen } from "../../entity-processor";
import { TState } from "../../reducer";
import SidePanel from "../../component/side-panel";
import Header from "../../component/header";
import * as Tags from "./styled";
import * as GTags from "../../common-styled";
import linkOpenIcon from "../../assets/link.svg";
import { withRouter, WithRouterProps } from "../../router-hoc";
import tourIcon from "../../assets/tours-icon-dark.svg";
import plusOutlined from "../../assets/plus-outlined.svg";

interface IDispatchProps {
  getAllScreens: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllScreens: () => dispatch(getAllScreens()),
});

interface IAppStateProps {
  screens: P_RespScreen[];
}

const mapStateToProps = (state: TState): IAppStateProps => ({
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

interface IOwnStateProps {
  showGroupedScreenFor: number;
}

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { showGroupedScreenFor: -1 };
  }

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
                  {this.props.screens.map((screen, i) => (
                    <Tags.CardCon
                      key={screen.rid}
                      className={screen.related.length > 0 ? "multi" : ""}
                      onClick={((idx) => () => {
                        if (screen.related.length) {
                          this.setState({ showGroupedScreenFor: idx });
                        }
                      })(i)}
                      to={screen.related.length > 0 ? "" : `/screen/${screen.rid}`}
                    >
                      <Tags.CardImg src={screen.thumbnailUri.href} />
                      <Tags.CardFlexColCon style={{ marginTop: "0.35rem" }}>
                        <Tags.CardFlexRowCon>
                          {screen.icon && <Tags.CardIconMd src={screen.icon} alt="screen icon" />}
                          <GTags.Txt className="title oneline" title={screen.displayName}>
                            {screen.displayName}
                          </GTags.Txt>
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
                <Modal
                  title={
                    <div>
                      <GTags.Txt className="head">Select a screen</GTags.Txt>
                      <GTags.Txt className="subsubhead">
                        This screen has been used in multple tours. Edit or view a screen by selecting it from the
                        following list.
                      </GTags.Txt>
                    </div>
                  }
                  centered
                  open={this.state.showGroupedScreenFor !== -1}
                  onCancel={() => this.setState({ showGroupedScreenFor: -1 })}
                  footer={null}
                  width="50%"
                >
                  {this.state.showGroupedScreenFor > -1 &&
                    this.props.screens[this.state.showGroupedScreenFor].related.length && (
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {[
                          this.props.screens[this.state.showGroupedScreenFor],
                          ...this.props.screens[this.state.showGroupedScreenFor].related,
                        ].map((s) =>
                          s.tour ? (
                            <Tags.MultiScreenChooserLineItem key={s.rid} to={`/tour/${s.tour.rid}/${s.rid}`}>
                              <div>Edit the screen used in</div>
                              <div className="ent mark-tour">
                                <img
                                  src={tourIcon}
                                  alt=""
                                  height={16}
                                  width={16}
                                  style={{ margin: "0 0.15rem 0 0.5rem" }}
                                />
                                {s.tour.displayName}
                              </div>
                              <div>tour</div>
                              <div style={{ marginLeft: "1rem", opacity: 0.55, fontSize: "0.9rem" }}>
                                Edited {s.displayableUpdatedAt}
                              </div>
                            </Tags.MultiScreenChooserLineItem>
                          ) : (
                            <Tags.MultiScreenChooserLineItem key={s.rid} to={`/screen/${s.rid}`}>
                              <div>Edit screen by </div>
                              <div className="ent mark-new">
                                <img
                                  src={plusOutlined}
                                  alt=""
                                  height={12}
                                  width={12}
                                  style={{ margin: "0 0.35rem 0 0.5rem" }}
                                />
                                creating a new tour
                              </div>
                            </Tags.MultiScreenChooserLineItem>
                          )
                        )}
                      </div>
                    )}
                </Modal>
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

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Screens));
