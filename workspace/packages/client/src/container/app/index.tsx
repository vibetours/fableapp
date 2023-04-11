import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Screens from '../screens';
import { TState } from '../../reducer';
import { init } from '../../action/creator';
import Tours from '../tours';
import TourEditor from '../tour-editor';
import Screen from '../screen';
import Player from '../player';
import Form from '../form';
import HeartLoader from '../../component/loader/heart';
import CreateTour from '../create-tour';

function TestFrame() {
  return (
    <div>
      <p>
        This is a test page for cross origin iframe and same origin iframe
      </p>
      {/* <iframe */}
      {/*   height="300" */}
      {/*   style={{ */}
      {/*     width: '100%', */}
      {/*   }} */}
      {/*   title="Skewed title text" */}
      {/*   src="https://codepen.io/paulnoble/embed/OPXBzB?default-tab=html%2Cresult" */}
      {/*   loading="lazy" */}
      {/* /> */}
      <iframe
        height="300"
        style={{
          width: '100%',
        }}
        title="Skewed title text"
        src="http://localhost:3000/tours"
        loading="lazy"
      />
    </div>
  );
}

interface IDispatchProps {
  init: () => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  init: () => dispatch(init()),
});

interface IAppStateProps {
  isInitied: boolean;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  isInitied: state.default.inited,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps {}

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
        <div className="app">
          <Routes>
            <Route path="/screens" element={<Screens />} />
            <Route path="/tours" element={<Tours />} />
            {/* todo */}
            <Route path="/screen/:screenId" element={<Screen />} />
            <Route path="/screen2/:screenId" element={<TourEditor />} />
            <Route path="/tour/:tourId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId/:annotationId" element={<TourEditor />} />
            <Route path="p/tour/:tourId" element={<Player />} />
            <Route path="p/tour/:tourId/:screenRid/:annotationId" element={<Player />} />
            <Route path="/form/:formId" element={<Form />} />
            <Route path="/test/frame1" element={<TestFrame />} />
            <Route path="/createtour" element={<CreateTour />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(mapStateToProps, mapDispatchToProps)(App);
