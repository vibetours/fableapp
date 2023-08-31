import React from 'react';
import { connect } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
import Auth0Config from '../../component/auth/auth0-config.json';
import WithPrincipalCheck from './with-principal-check';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps { }

const mapDispatchToProps = (dispatch: any) => ({ });

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps { }

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps { }

// Auth0Provider needs to be installed in this component not any component upstream
// Auth0 in it's free version use cross domain cookie that is blocked by some browser
// If we add the provider on the upstream component the Auth0Provider executes code that throws error.
// Since during the /p or /form route does not need any auth we don't even initialize the auth0 for those

class ProtectedRoutes extends React.PureComponent<IProps, IOwnStateProps> {
  render(): JSX.Element {
    const pathname = this.props.location.pathname.toLowerCase();
    const shouldResolvePrincipal = !(pathname === '/login' || pathname === '/logout');

    return (
      <Auth0Provider
        domain={Auth0Config.domain}
        clientId={Auth0Config.clientId}
        useRefreshTokens
        cacheLocation="localstorage"
        authorizationParams={{
          audience: Auth0Config.audience,
          redirect_uri: `${APP_CLIENT_ENDPOINT}/cb/auth`,
          scope: Auth0Config.scope,
        }}
      >
        {
          shouldResolvePrincipal ? (<WithPrincipalCheck />) : (<Outlet />)
        }
      </Auth0Provider>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ProtectedRoutes));
