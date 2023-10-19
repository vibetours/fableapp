import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import PublishPreview from '../publish-preview';
import { TState } from '../../reducer';
import { init, iam } from '../../action/creator';
import Tours from '../tours';
import UserManagement from '../user-management';
import Billing from '../billing';
import TourEditor from '../tour-editor';
import Player from '../player';
import Form from '../form';
import HeartLoader from '../../component/loader/heart';
import CreateTour from '../create-tour';
import AuthCB from '../auth-cb';
import NewOrgCreation from '../org/new-org-creation';
import DefaultOrgAssignment from '../org/default-org-assignment';
import IamDetails from '../org/iam-details';
import Login from '../../component/auth/login';
import Logout from '../../component/auth/logout';
import Onboarding from '../onboarding';
import PinExt from '../../component/onboarding/pages/pin-ext';
import PrepTour from '../create-tour/prep-tour';
import ToursPage from '../../component/onboarding/pages/tours';
import ProductTours from '../../component/onboarding/pages/product-tours';
import ProtectedRoutes from '../protected-routes';
import Analytics from '../analytics';
import Healthcheck from '../healthcheck';
import { STORAGE_PREFIX_KEY_QUERY_PARAMS } from '../../types';
import { upsertAllUserGuides } from '../../user-guides';

interface IDispatchProps {
  init: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  init: () => dispatch(init()),
  iam: () => dispatch(iam()),
});

interface IAppStateProps {
  isInitied: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
});

interface IOwnProps { }
type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps { }

class App extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    const queryParamsStr = window.location.search.substring(1);
    try {
      const params = new URLSearchParams(queryParamsStr);
      ['wpp', 'wpd'].forEach(name => {
        const value = params.get(name);
        if (!value) return;
        localStorage.setItem(`${STORAGE_PREFIX_KEY_QUERY_PARAMS}/${name}`, value);
      });
    } catch (e) {
      raiseDeferredError(e as Error);
    }

    if (this.shouldInit()) this.props.init();
  }

  // eslint-disable-next-line class-methods-use-this
  shouldInit(): boolean {
    return document.location.pathname !== '/aboutblank';
  }

  render():JSX.Element {
    if (this.shouldInit() && !this.props.isInitied) {
      return <div />;
    }

    const urlSearchParams = new URLSearchParams(window.location.search);
    const staging = !urlSearchParams.get('staging');

    return (
      <Router>
        <div className="app" style={{ overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/demos" />} />
            <Route path="/tours" element={<Navigate to="/demos" />} />
            <Route path="/aboutblank" element={<div />} />
            <Route path="/onboarding" element={<Onboarding />}>
              <Route path="extension-installed" element={<PinExt title="Onboarding - Extension installed | Fable" />} />
              <Route
                path="create-interactive-demos"
                element={<ToursPage title="Onboarding - Create stunning interactive demos | Fable" />}
              />
              <Route path="go-to-app" element={<ProductTours title="Onboarding - Go to the app | Fable" />} />
            </Route>

            <Route path="/" element={<ProtectedRoutes />}>
              <Route path="/healthcheck" element={<Healthcheck />} />
              <Route path="/cb/auth" element={<AuthCB />} />
              <Route path="/user-details" element={<IamDetails title="User details | Fable" />} />
              <Route path="/organization-details" element={<NewOrgCreation title="Organization details | Fable" />} />
              <Route
                path="/organization-join"
                element={<DefaultOrgAssignment title="Organization available | Fable" />}
              />
              <Route path="/demos" element={<Tours title="Interactive demos | Fable" />} />
              <Route path="/users" element={<UserManagement title="Fable - User Management" />} />
              <Route path="/billing" element={<Billing title="Fable - Billing & Subscription" />} />
              <Route path="/tour/:tourId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route path="/tour/:tourId/:screenId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route path="/demo/:tourId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route path="/demo/:tourId/:screenId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route path="/a/demo/:tourId" element={<Analytics />} />
              <Route
                path="/tour/:tourId/:screenId/:annotationId"
                element={<TourEditor title="Fable - Tour editor" />}
              />
              <Route
                path="/demo/:tourId/:screenId/:annotationId"
                element={<TourEditor title="Fable - Tour editor" />}
              />
              <Route path="/create-interactive-demo" element={<CreateTour title="Create interactive demo | Fable" />} />
              <Route path="/login" element={<Login title="Fable - Login" />} />
              <Route path="/logout" element={<Logout title="Fable - Logout" />} />
            </Route>
            <Route path="/form/:formId" element={<Form />} />
            <Route path="/p/tour/:tourId" element={<Player staging={staging} title="Fable" />} />
            <Route
              path="/p/tour/:tourId/:screenRid/:annotationId"
              element={<Player staging={staging} title="Fable" />}
            />
            <Route path="/p/demo/:tourId" element={<Player staging={staging} title="Fable" />} />
            <Route
              path="/p/demo/:tourId/:screenRid/:annotationId"
              element={<Player staging={staging} title="Fable" />}
            />
            <Route path="/pp/tour/:tourId" element={<PublishPreview title="Fable" />} />
            <Route path="/pp/demo/:tourId" element={<PublishPreview title="Fable" />} />
            <Route path="/preptour" element={<PrepTour title="Fable" />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(App);
