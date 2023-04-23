import React from 'react';
import { connect } from 'react-redux';
import { Outlet } from 'react-router-dom';
import * as GTags from '../../common-styled';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';
import RootLayout from '../../component/onboarding/root-layout';

interface IDispatchProps {}

const mapDispatchToProps = (dispatch: any) => ({});

interface IAppStateProps {}

const mapStateToProps = (state: TState): IAppStateProps => ({});

interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    tourId: string;
    screenId: string;
  }>;

interface IOwnStateProps {}

class Screens extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { };
  }

  componentDidMount(): void {
    if (window.location.pathname === '/onboarding' || window.location.pathname === '/onboarding/') {
      window.location.replace('onboarding/pin');
    }
  }

  render() {
    return (
      <RootLayout>
        <Outlet />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Screens));
