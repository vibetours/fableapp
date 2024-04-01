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
import { addToGlobalAppData } from '../../global';
import Skeleton from '../fallback-provider';

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

  render(): JSX.Element {
    if (this.shouldInit() && !this.props.isInitied) {
      return <div />;
    }

    const urlSearchParams = new URLSearchParams(window.location.search);
    const staging = !!urlSearchParams.get('staging');

    return (
      <Router>
        <Suspense fallback={<div><Skeleton /></div>}>
          <div className="app" style={{ overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/demos" />} />
              <Route path="/tours" element={<Navigate to="/demos" />} />
              <Route path="/aboutblank" element={<div />} />
              <Route
                path="/onboarding"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <Onboarding />
                  </Suspense>
                }
              >
                <Route
                  path="extension-installed"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <PinExt title="Onboarding - Extension installed | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="create-interactive-demos"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <ToursPage title="Onboarding - Create stunning interactive demos | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="go-to-app"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <ProductTours title="Onboarding - Go to the app | Fable" />
                    </Suspense>
                  }
                />
              </Route>

              <Route
                path="/"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <ProtectedRoutes />
                  </Suspense>
                }
              >
                <Route
                  path="/integrations"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Integrations title="Fable - Integrations" />
                    </Suspense>
                }
                />

                <Route
                  path="/healthcheck"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Healthcheck />
                    </Suspense>
                  }
                />
                <Route
                  path="/cb/auth"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <AuthCB />
                    </Suspense>
                  }
                />
                <Route
                  path="/user-details"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <IamDetails title="User details | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="/organization-details"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <NewOrgCreation title="Organization details | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="/organization-join"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <DefaultOrgAssignment title="Organization available | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="/demos"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Tours title="Interactive demos | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <UserManagement title="Fable - User Management" />
                    </Suspense>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Billing title="Fable - Billing & Subscription" />
                    </Suspense>
                  }
                />
                <Route
                  path="/tour/:tourId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/tour/:tourId/:screenId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/demo/:tourId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/demo/:tourId/:screenId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/a/demo/:tourId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Analytics />
                    </Suspense>
                  }
                />
                <Route
                  path="/a/demo/:tourId/:activeKey"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Analytics />
                    </Suspense>
                  }
                />
                <Route
                  path="/tour/:tourId/:screenId/:annotationId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/demo/:tourId/:screenId/:annotationId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <TourEditor title="Fable - Demo editor" />
                    </Suspense>
                  }
                />
                <Route
                  path="/create-interactive-demo"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <CreateTour title="Create interactive demo | Fable" />
                    </Suspense>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Login title="Fable - Login" />
                    </Suspense>
                  }
                />
                <Route
                  path="/logout"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <Logout title="Fable - Logout" />
                    </Suspense>
                  }
                />
                <Route
                  path="/pp/demo/:tourId"
                  element={
                    <Suspense fallback={<div><Skeleton /></div>}>
                      <PublishPreview title="Fable" />
                    </Suspense>
                  }
                />
              </Route>
              <Route
                path="/form/:formId"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <Form />
                  </Suspense>
                }
              />
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
              <Route
                path="/pp/tour/:tourId"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <PublishPreview title="Fable" />
                  </Suspense>
                }
              />
              <Route
                path="/preptour"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <PrepTour title="Fable" />
                  </Suspense>
                }
              />
              <Route
                path="/invite/:id"
                element={
                  <Suspense fallback={<div><Skeleton /></div>}>
                    <Invite />
                  </Suspense>
                }
              />
            </Routes>
          </div>
        </Suspense>
      </Router>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(App);
