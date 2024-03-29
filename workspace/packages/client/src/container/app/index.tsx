import React, { Suspense, lazy } from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import { init, iam } from '../../action/creator';
import Player from '../player';
import { STORAGE_PREFIX_KEY_QUERY_PARAMS } from '../../types';
import { disposeInternalEvents, initInternalEvents } from '../../internal-events';
import { P_RespTour } from '../../entity-processor';
import Loader from '../../component/loader/heart';
import { addToGlobalAppData } from '../../global';

const PublishPreview = lazy(() => import('../publish-preview'));
const Tours = lazy(() => import('../tours'));
const TourEditor = lazy(() => import('../tour-editor'));
const UserManagement = lazy(() => import('../user-management'));
const Onboarding = lazy(() => import('../onboarding'));
const Billing = lazy(() => import('../billing'));
const Form = lazy(() => import('../form'));
const CreateTour = lazy(() => import('../create-tour'));
const Login = lazy(() => import('../../component/auth/login'));
const AuthCB = lazy(() => import('../auth-cb'));
const NewOrgCreation = lazy(() => import('../org/new-org-creation'));
const DefaultOrgAssignment = lazy(() => import('../org/default-org-assignment'));
const IamDetails = lazy(() => import('../org/iam-details'));
const Logout = lazy(() => import('../../component/auth/logout'));
const PinExt = lazy(() => import('../../component/onboarding/pages/pin-ext'));
const PrepTour = lazy(() => import('../create-tour/prep-tour'));
const ToursPage = lazy(() => import('../../component/onboarding/pages/tours'));
const ProductTours = lazy(() => import('../../component/onboarding/pages/product-tours'));
const ProtectedRoutes = lazy(() => import('../protected-routes'));
const Analytics = lazy(() => import('../analytics'));
const Healthcheck = lazy(() => import('../healthcheck'));
const Invite = lazy(() => import('../invite'));
const Integrations = lazy(() => import('../integrations'));

interface IDispatchProps {
  init: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  init: () => dispatch(init()),
  iam: () => dispatch(iam()),
});

interface IAppStateProps {
  isInitied: boolean;
  isTourLoaded: boolean;
  tour: P_RespTour | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
  isTourLoaded: state.default.tourLoaded,
  tour: state.default.currentTour,
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

    initInternalEvents();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.isTourLoaded !== this.props.isTourLoaded) {
      addToGlobalAppData('demo', this.props.tour!);
    }
  }

  componentWillUnmount(): void {
    disposeInternalEvents();
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
    const staging = !!urlSearchParams.get('staging');

    return (
      <Suspense fallback={<div><Loader /></div>}>
        <Router>
          <div className="app" style={{ overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/demos" />} />
              <Route path="/integrations" element={<Integrations title="Fable - Integrations" />} />
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
                <Route path="/tour/:tourId" element={<TourEditor title="Fable - Demo editor" />} />
                <Route path="/tour/:tourId/:screenId" element={<TourEditor title="Fable - Demo editor" />} />
                <Route path="/demo/:tourId" element={<TourEditor title="Fable - Demo editor" />} />
                <Route path="/demo/:tourId/:screenId" element={<TourEditor title="Fable - Demo editor" />} />
                <Route path="/a/demo/:tourId" element={<Analytics />} />
                <Route path="/a/demo/:tourId/:activeKey" element={<Analytics />} />
                <Route
                  path="/tour/:tourId/:screenId/:annotationId"
                  element={<TourEditor title="Fable - Demo editor" />}
                />
                <Route
                  path="/demo/:tourId/:screenId/:annotationId"
                  element={<TourEditor title="Fable - Demo editor" />}
                />
                <Route path="/create-interactive-demo" element={<CreateTour title="Create interactive demo | Fable" />} />
                <Route path="/login" element={<Login title="Fable - Login" />} />
                <Route path="/logout" element={<Logout title="Fable - Logout" />} />
                <Route path="/pp/demo/:tourId" element={<PublishPreview title="Fable" />} />
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
              <Route path="/preptour" element={<PrepTour title="Fable" />} />
              <Route path="/invite/:id" element={<Invite />} />
            </Routes>
          </div>
        </Router>
      </Suspense>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(App);
