import React from 'react';
import { connect } from 'react-redux';
import { LoadingStatus } from '@fable/common/dist/types';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
import Header from '../../component/header';
import * as GTags from '../../common-styled';
import SidePanel from '../../component/side-panel';
import Loader from '../../component/loader';
import HeartLoader from '../../component/loader/heart';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';

export enum LoadingScreen {
  HEART = 'heart',
  DEMO = 'demo',
  SKELETON = 'skeleton'
}

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps {
  isPrincipalLoaded: boolean;

 }

const mapStateToProps = (state: TState): IAppStateProps => ({
  isPrincipalLoaded: state.default.principalLoadingStatus === LoadingStatus.Done,

});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props & WithRouterProps;

interface IOwnStateProps {
  loadingScreen: LoadingScreen
}

class Skeleton extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      loadingScreen: LoadingScreen.HEART
    };
  }

  componentDidMount(): void {
    // added this check because in with-principal-check we are showing
    // heart loader so it feels like screen flashing if this is removed.
    if (!this.props.isPrincipalLoaded) {
      this.setState({ loadingScreen: LoadingScreen.HEART });
    } else if (window.location.pathname.includes('/demo/')) {
      this.setState({ loadingScreen: LoadingScreen.DEMO });
    } else if (window.location.pathname.includes('/billing')) {
      this.setState({ loadingScreen: LoadingScreen.SKELETON });
    } else if (window.location.pathname.includes('/users')) {
      this.setState({ loadingScreen: LoadingScreen.SKELETON });
    } else if (window.location.pathname.includes('/integrations')) {
      this.setState({ loadingScreen: LoadingScreen.SKELETON });
    } else if (window.location.pathname.includes('/demos')) {
      this.setState({ loadingScreen: LoadingScreen.HEART });
    }
  }

  render(): React.ReactNode {
    return (
      <>
        {this.state.loadingScreen === LoadingScreen.SKELETON && (
        <GTags.ColCon>
          <div style={{ height: '48px' }}>
            <Header
              tour={null}
              shouldShowFullLogo
              leftElGroups={[]}
              manifestPath=""
            />
          </div>
          <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
            <GTags.SidePanelCon>
              <SidePanel selected="" subs={null} />
            </GTags.SidePanelCon>
            <GTags.MainCon>
              <GTags.BodyCon style={{ height: '100%', position: 'relative', overflowY: 'scroll' }}>
                <div>
                  <Loader width="80px" txtBefore="Loading information" showAtPageCenter />
                </div>
              </GTags.BodyCon>
            </GTags.MainCon>
          </GTags.RowCon>
        </GTags.ColCon>
        )}
        {this.state.loadingScreen === LoadingScreen.DEMO && (
        <Loader width="80px" txtBefore="Loading demo" showAtPageCenter />
        )}
        {this.state.loadingScreen === LoadingScreen.HEART && (
        <div style={{ width: '100vw', height: '100vh' }}>
          <HeartLoader />
        </div>
        )}
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(withAuth0(Skeleton)));
