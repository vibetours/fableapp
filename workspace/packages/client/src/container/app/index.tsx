import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { withAuth0, WithAuth0Props } from '@auth0/auth0-react';
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
import Login from '../../component/auth/login';
import Logout from '../../component/auth/logout';
import Onboarding from '../onboarding';
import Pin from '../../component/onboarding/pages/pin';
import PrepTour from '../create-tour/prep-tour';
import ToursPage from '../../component/onboarding/pages/tours';
import ProductTours from '../../component/onboarding/pages/product-tours';
import TermsAndConditions from '../../component/onboarding/pages/terms-and-conditions';
import ProtectedRoutes from '../protected-routes';

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
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
});

interface IOwnProps { }
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithAuth0Props;

interface IOwnStateProps { }

class App extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.init();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    this.props.iam();
  }

  render() {
    if (!this.props.isInitied || this.props.auth0.isLoading) {
      return <HeartLoader />;
    }

    return (
      <Router>
        <div className="app">
          <Routes>
            <Route path="/onboarding" element={<Onboarding />}>
              <Route path="pin" element={<Pin />} />
              <Route path="tours" element={<ToursPage />} />
              <Route path="product-tours" element={<ProductTours />} />
              <Route path="tnc" element={<TermsAndConditions />} />
            </Route>
            <Route path="/" element={<ProtectedRoutes />}>
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
              <Route path="/form/:formId" element={<Form />} />
              <Route path="/createtour" element={<CreateTour />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/p/tour/:tourId" element={<Player />} />
            <Route path="/p/tour/:tourId/:screenRid/:annotationId" element={<Player />} />
            <Route path="/preptour" element={<PrepTour />} />
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
