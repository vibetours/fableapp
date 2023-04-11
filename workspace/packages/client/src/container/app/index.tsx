import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
import { setSec } from '@fable/common/dist/fsec';
import { LoadingStatus } from '@fable/common/dist/types';
import { RespUser, UserOrgAssociation } from '@fable/common/dist/api-contract';
import Screens from '../screens';
import { TState } from '../../reducer';
import { init, iam } from '../../action/creator';
import Tours from '../tours';
import TourEditor from '../tour-editor';
import Screen from '../screen';
import Player from '../player';
import Form from '../form';
import HeartLoader from '../../component/loader/heart';
import CreateTour from '../create-tour';
import AuthCB from '../auth-cb';
import NewOrgCreation from '../org/new-org-creation';
import DefaultOrgAssignment from '../org/default-org-assignment';
import IamDetails from '../org/iam-details';
import Login, { LoginErrorType } from '../../component/auth/login';
import Logout from '../../component/auth/logout';
import Auth0Config from '../../component/auth/auth0-config.json';
import Loader from '../../component/loader';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  init: () => void;
  iam: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  init: () => dispatch(init()),
  iam: () => dispatch(iam()),
});

interface IAppStateProps {
  isInitied: boolean;
  isPrincipalLoaded: boolean;
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
  isPrincipalLoaded: state.default.principalLoadingStatus === LoadingStatus.Done,
  principal: state.default.principal,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props;

interface IOwnStateProps {}

class App extends React.PureComponent<IProps, IOwnStateProps> {
  static doesRouteNeedAuth() {
    return !(
      document.location.pathname.startsWith('/p')
     || document.location.pathname === '/login'
      // Ideally logout path should have auth requirement. We kept logout out of the auth checking route because
      // sometime we need to just call logout incase there is a rule change from auth0 end and server is throwing error
      // this logout -> login would help this sort out.
     || document.location.pathname === '/logout'
    );
  }

  componentDidMount(): void {
    if (App.doesRouteNeedAuth()) {
      const { getAccessTokenSilently } = this.props.auth0;
      setSec('getAccessToken', async () => {
        const accessToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: Auth0Config.audience,
            scope: Auth0Config.scope,
          }
        });
        return accessToken;
      });
    }
    this.props.init();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (prevProps && prevProps.auth0.isLoading && !this.props.auth0.isLoading && this.props.auth0.isAuthenticated) {
      this.props.iam();
    }
  }

  render() {
    if (!this.props.isInitied || (App.doesRouteNeedAuth() && this.props.auth0.isLoading)) {
      return <HeartLoader />;
    }

    if (App.doesRouteNeedAuth()) {
      if (!this.props.auth0.isAuthenticated) {
        window.location.replace('/login');
        return <HeartLoader />;
      }
      if (!this.props.isPrincipalLoaded) {
        return <HeartLoader />;
      }
      if (!this.props.principal) {
        window.location.replace('/login');
        return <div />;
      }
      if (this.props.principal.personalEmail) {
        this.props.auth0.logout({
          logoutParams: {
            returnTo: `${
              APP_CLIENT_ENDPOINT
            }/login?t=${LoginErrorType.UserUsedPersonalEmail}&e=${this.props.principal.email}`,
          }
        });
        return <HeartLoader />;
      }

      if (!this.props.principal.firstName) {
        // If user details are not yet completed
        if (!document.location.pathname.startsWith('/iamdetails')) {
          window.location.replace('/iamdetails');
          return <HeartLoader />;
        }
      } else if (this.props.principal.orgAssociation !== UserOrgAssociation.Explicit) {
        // If org creation is not yet done then create org first
        if (!document.location.pathname.startsWith('/org/')) {
          window.location.replace(
            this.props.principal.orgAssociation === UserOrgAssociation.Implicit ? '/org/assign' : '/org/create'
          );
        }
      }
    }

    return (
      <Router>
        <div className="app">
          <Routes>
            <Route path="/logout" element={<Logout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cb/auth" element={<AuthCB />} />
            <Route path="/iamdetails" element={<IamDetails />} />
            <Route path="/org/create" element={<NewOrgCreation />} />
            <Route path="/org/assign" element={<DefaultOrgAssignment />} />
            <Route path="/screens" element={<Screens />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/screen/:screenId" element={<Screen />} />
            <Route path="/tour/:tourId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId/:annotationId" element={<TourEditor />} />
            <Route path="/p/tour/:tourId" element={<Player />} />
            <Route path="/p/tour/:tourId/:screenRid/:annotationId" element={<Player />} />
            <Route path="/form/:formId" element={<Form />} />
            <Route path="/createtour" element={<CreateTour />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withAuth0(App));
