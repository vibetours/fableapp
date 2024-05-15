import React from 'react';
import { connect } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
import { RespUser, Status, UserOrgAssociation } from '@fable/common/dist/api-contract';
import { CmnEvtProp, LoadingStatus } from '@fable/common/dist/types';
import { setSec } from '@fable/common/dist/fsec';
import { resetProductAnalytics, setProductAnalyticsUserId } from '@fable/common/dist/amplitude';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { isProdEnv } from '@fable/common/dist/utils';
import { TState } from '../../reducer';
import { WithRouterProps, withRouter } from '../../router-hoc';
// import Auth0Config from '../../component/auth/auth0-config.json';
import { iam } from '../../action/creator';
import { setEventCommonState } from '../../utils';
import { P_RespSubscription } from '../../entity-processor';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;
export const ENV = process.env.REACT_APP_ENVIRONMENT;

function addSupportBot(name: string, email: string, createdAt: Date): void {
  const id = 'fable-support-bot';

  let script = document.getElementById(id);
  if (script) return;

  script = document.createElement('script');
  script.setAttribute('id', id);
  script.innerHTML = `
  window.intercomSettings = {
    api_base: "https://api-iam.intercom.io",
    app_id: "btay1o4i",
    user_id: "${email}",
    name: "${name}",
    email: "${email}",
    created_at: "${createdAt}"
  };


 // We pre-filled your app ID in the widget URL: 'https://widget.intercom.io/widget/btay1o4i'
  (function(){var w=window;var ic=w.Intercom;if(typeof ic==="function"){ic('reattach_activator');ic('update',w.intercomSettings);}else{var d=document;var i=function(){i.c(arguments);};i.q=[];i.c=function(args){i.q.push(args);};w.Intercom=i;var l=function(){var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src='https://widget.intercom.io/widget/btay1o4i';var x=d.getElementsByTagName('script')[0];x.parentNode.insertBefore(s,x);};if(document.readyState==='complete'){l();}else if(w.attachEvent){w.attachEvent('onload',l);}else{w.addEventListener('load',l,false);}}})();
  `;
  document.body.appendChild(script);
}

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

      try {
        setProductAnalyticsUserId(this.props.principal.email);
        /* if (ENV === 'prod') */ addSupportBot(this.props.principal.firstName, this.props.principal.email, this.props.principal.createdAt);
        if (!this.props.auth0.isAuthenticated) {
          resetProductAnalytics();
        }
      } catch (e) {
        raiseDeferredError(e as Error);
      }
    }
  }

  shouldNavigateToBillingRoute = (): boolean => {
    // if (!isProdEnv()) return false;
    // if (this.props.location.pathname.includes('billing')) return false;
    // if (!this.props.subs) return false;

    // const currBillingStatus = this.props.subs.status;
    // if (currBillingStatus === Status.CANCELLED || currBillingStatus === Status.PAUSED) {
    //   return true;
    // }
    this.props.subs;
    const res = false;

    return res;
  };

  render(): JSX.Element {
    if (this.props.auth0.isLoading) {
      return <FullPageTopLoader showLogo />;
    }
    if (!this.props.auth0.isAuthenticated) {
      window.location.replace('/login');
      return <div />;
    }
    if (!this.props.isPrincipalLoaded) {
      return <div />;
    }
    if (!this.props.principal) {
      window.location.replace('/login');
      return <div />;
    }

    if (!this.props.principal.firstName) {
      // If user details are not yet completed
      if (!document.location.pathname.startsWith('/user-details')) {
        window.location.replace('/user-details');
        return <FullPageTopLoader showLogo />;
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
