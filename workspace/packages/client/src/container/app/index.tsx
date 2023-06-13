import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { TState } from '../../reducer';
import { init, iam } from '../../action/creator';
import Tours from '../tours';
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
import Pin from '../../component/onboarding/pages/pin';
import PrepTour from '../create-tour/prep-tour';
import ToursPage from '../../component/onboarding/pages/tours';
import ProductTours from '../../component/onboarding/pages/product-tours';
import TermsAndConditions from '../../component/onboarding/pages/terms-and-conditions';
import ProtectedRoutes from '../protected-routes';

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
    this.props.init();
  }

  render() {
    if (!this.props.isInitied) {
      return <HeartLoader />;
    }

    return (
      <Router>
        <div className="app" style={{ overflow: 'hidden' }}>
          <Routes>
            <Route path="/aboutblank" element={<div />} />
            <Route path="/onboarding" element={<Onboarding />}>
              <Route path="pin" element={<Pin title="Fable Onboarding" />} />
              <Route path="tours" element={<ToursPage title="Fable - Onboarding" />} />
              <Route path="product-tours" element={<ProductTours title="Fable - Onboarding" />} />
              <Route path="tnc" element={<TermsAndConditions title="Fable - Terms and Conditions" />} />
            </Route>

            <Route path="/" element={<ProtectedRoutes />}>
              <Route path="/cb/auth" element={<AuthCB />} />
              <Route path="/iamdetails" element={<IamDetails title="Fable - Onboarding" />} />
              <Route path="/org/create" element={<NewOrgCreation title="Fable - Create organization" />} />
              <Route path="/org/assign" element={<DefaultOrgAssignment title="Fable - Select organization" />} />
              <Route path="/tours" element={<Tours title="Fable - Tours" />} />
              <Route path="/tour/:tourId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route path="/tour/:tourId/:screenId" element={<TourEditor title="Fable - Tour editor" />} />
              <Route
                path="/tour/:tourId/:screenId/:annotationId"
                element={<TourEditor
                  title="Fable - Tour editor"
                />}
              />
              <Route path="/createtour" element={<CreateTour title="Fable" />} />
              <Route path="/login" element={<Login title="Fable - Login" />} />
              <Route path="/logout" element={<Logout title="Fable - Logout" />} />
            </Route>
            <Route path="/form/:formId" element={<Form />} />
            <Route path="/p/tour/:tourId" element={<Player title="Fable" />} />
            <Route path="/p/tour/:tourId/:screenRid/:annotationId" element={<Player title="Fable" />} />
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
