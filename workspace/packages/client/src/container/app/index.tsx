import React from 'react';
import { connect } from 'react-redux';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Screens from '../screens';
import { TState } from '../../reducer';
import { init } from '../../action/creator';
import Tours from '../tours';
import TourEditor from '../tour-editor';

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
      return (
        <div>
          <em>TODO</em> show loading bar here
        </div>
      );
    }
    return (
      <Router>
        <div className="app">
          <Routes>
            <Route path="/screens" element={<Screens />} />
            <Route path="/tours" element={<Tours />} />
            <Route path="/screen/:screenId" element={<TourEditor />} />
            <Route path="/tour/:tourId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId" element={<TourEditor />} />
            <Route path="/tour/:tourId/:screenId/:annotationId" element={<TourEditor />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(mapStateToProps, mapDispatchToProps)(App);
