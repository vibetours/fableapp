import { LoadingStatus } from '@fable/common/dist/types';
import React from 'react';
import { connect } from 'react-redux';
import { copyScreenForCurrentTour, getAllScreens } from '../../action/creator';
import linkOpenIcon from '../../assets/link.svg';
import tourIcon from '../../assets/tours-icon-dark.svg';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import Loader from '../../component/loader';
import SidePanel from '../../component/side-panel';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';

interface IDispatchProps {
  getAllScreens: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllScreens: () => dispatch(getAllScreens()),
  copyScreenForCurrentTour:
    (tour: P_RespTour, screen: P_RespScreen) => dispatch(copyScreenForCurrentTour(tour, screen)),
});

interface IAppStateProps {
  screens: P_RespScreen[];
  loadingStatus: LoadingStatus;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  screens: state.default.allScreens,
  loadingStatus: state.default.allScreensLoadingStatus,
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

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.getAllScreens();
  }

  render() {
    const hasScreen = this.props.screens.length > 0;
    const isLoaded = this.props.loadingStatus === LoadingStatus.Done;

    return (
      <GTags.RowCon className="screen-con">
        <GTags.SidePanelCon>
          <SidePanel selected="screens" />
        </GTags.SidePanelCon>
        <GTags.MainCon>
          <GTags.HeaderCon>
            <Header rBtnTxt="Record a screen" />
          </GTags.HeaderCon>
          <GTags.BodyCon className={hasScreen ? '' : 'centered'}>
            {isLoaded && hasScreen ? (
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
                      to={!screen.isRootScreen ? `/tour/${screen.tour?.rid}/${screen.rid}` : `/screen/${screen.rid}`}
                    >
                      <Tags.CardImg src={screen.thumbnailUri.href} />
                      <Tags.CardFlexColCon style={{ marginTop: '0.35rem' }}>
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
                        <Tags.CardFlexRowCon style={{ alignItems: 'center' }}>
                          { !screen.isRootScreen && (<Tags.CardIconMd src={tourIcon} alt="screen icon" />)}
                          <GTags.Txt className="faded">
                            {screen.isRootScreen
                              ? 'Recorded screen from extension'
                              : (<>Used in <em>{screen.tour?.displayName}</em> tour</>)}
                          </GTags.Txt>
                        </Tags.CardFlexRowCon>
                        <Tags.CardFlexRowCon style={{ justifyContent: 'space-between' }}>
                          <GTags.Txt>Edited {screen.displayableUpdatedAt}</GTags.Txt>
                          <Tags.CardIconLg src="https://avatars.dicebear.com/api/adventurer/tris.svg" />
                        </Tags.CardFlexRowCon>
                      </Tags.CardFlexColCon>
                    </Tags.CardCon>
                  ))}
                </Tags.ScreenCardsCon>
              </>
            ) : (
              !isLoaded ? (
                <Loader width="240px" />
              ) : (
                <Tags.NoScreenMsgCon>
                  <em>TODO</em> You don't have any screen recorded yet.
                </Tags.NoScreenMsgCon>
              )
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
