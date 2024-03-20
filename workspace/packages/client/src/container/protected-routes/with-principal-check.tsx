import React from 'react';
import { connect } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { withAuth0, WithAuth0Props, Auth0Provider } from '@auth0/auth0-react';
import { RespUser, Status, UserOrgAssociation } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import { setSec } from '@fable/common/dist/fsec';
import { resetAmplitude, setAmplitudeUserId } from '@fable/common/dist/amplitude';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { isProdEnv } from '@fable/common/dist/utils';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
// import Auth0Config from '../../component/auth/auth0-config.json';
import { iam } from '../../action/creator';
import HeartLoader from '../../component/loader/heart';
import { LoginErrorType } from '../../component/auth/login';
import { setEventCommonState } from '../../utils';
import { P_RespSubscription } from '../../entity-processor';

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
  subs: P_RespSubscription | null,
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isPrincipalLoaded: state.default.principalLoadingStatus === LoadingStatus.Done,
  principal: state.default.principal,
  subs: state.default.subs,
});

interface IOwnProps { }
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props & WithRouterProps;

interface IOwnStateProps { }

class WithPrincipalCheck extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    const { getAccessTokenSilently } = this.props.auth0;
    setSec('getAccessToken', async () => {
      const accessToken = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUD,
          scope: 'openid profile email',
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
    if (prevProps.principal !== this.props.principal && this.props.principal) {
      setEventCommonState(CmnEvtProp.EMAIL, this.props.principal.email);
      setEventCommonState(CmnEvtProp.FIRST_NAME, this.props.principal.firstName);
      setEventCommonState(CmnEvtProp.LAST_NAME, this.props.principal.lastName);
      setAmplitudeUserId(this.props.principal.email);

      let twakApi: any;
      if (twakApi = (window as any).Tawk_API) {
        twakApi.visitor = {
          name: this.props.principal.firstName,
          email: this.props.principal.email
        };
      }
    }
    if (!this.props.auth0.isAuthenticated) {
      resetAmplitude();
    }
  }

  shouldNavigateToBillingRoute = ():boolean => {
    if (!isProdEnv()) return false;
    if (this.props.location.pathname.includes('billing')) return false;
    if (!this.props.subs) return false;

    const currBillingStatus = this.props.subs.status;
    if (currBillingStatus === Status.CANCELLED || currBillingStatus === Status.PAUSED) {
      return true;
    }

    return false;
  };

  render(): JSX.Element {
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

    if (!this.props.principal.firstName) {
      // If user details are not yet completed
      if (!document.location.pathname.startsWith('/user-details')) {
        window.location.replace('/user-details');
        return <HeartLoader />;
      }
    } else if (this.props.principal.orgAssociation !== UserOrgAssociation.Explicit) {
      try {
        // @ts-ignore
        window.gr('track', 'conversion', { email: this.props.principal.email });
      } catch (e) {
        raiseDeferredError(new Error('User not defined for Reditus logging'));
      }
      // If org creation is not yet done then create org first
      if (!document.location.pathname.startsWith('/organization-')) {
        window.location.replace(
          this.props.principal.orgAssociation === UserOrgAssociation.Implicit ? '/organization-join' : '/organization-details'
        );
      }
    }

    if (this.shouldNavigateToBillingRoute()) {
      return <Navigate to="/billing" />;
    }

    return (
      <Outlet />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(withAuth0(WithPrincipalCheck)));
