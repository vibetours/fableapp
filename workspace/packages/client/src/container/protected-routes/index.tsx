import React from 'react';
import { connect } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
import { LoadingStatus } from '@fable/common/dist/types';
import { RespUser, UserOrgAssociation } from '@fable/common/dist/api-contract';
import { setSec } from '@fable/common/dist/fsec';
import { TState } from '../../reducer';
import HeartLoader from '../../component/loader/heart';
import { LoginErrorType } from '../../component/auth/login';
import { WithRouterProps, withRouter } from '../../router-hoc';
import Auth0Config from '../../component/auth/auth0-config.json';
import { iam } from '../../action/creator';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  iam: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  iam: () => dispatch(iam()),
});

interface IAppStateProps {
  isPrincipalLoaded: boolean;
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isPrincipalLoaded: state.default.principalLoadingStatus === LoadingStatus.Done,
  principal: state.default.principal,
});

interface IOwnProps { }
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props & WithRouterProps;

interface IOwnStateProps { }

class ProtectedRoutes extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
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

  componentDidMount(): void {
    if (this.props.auth0.isAuthenticated) {
      this.props.iam();
    }
  }

  componentDidUpdate(prevProps: Readonly<IProps>): void {
    if (prevProps.auth0.isAuthenticated !== this.props.auth0.isAuthenticated && this.props.auth0.isAuthenticated) {
      this.props.iam();
    }
  }

  render() {
    if (this.props.auth0.isLoading) {
      return <HeartLoader />;
    }
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
          returnTo: `${APP_CLIENT_ENDPOINT
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

    return <Outlet />;
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(withAuth0(ProtectedRoutes)));
