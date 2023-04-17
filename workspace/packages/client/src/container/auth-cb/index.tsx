import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { iam } from '../../action/creator';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Loader from '../../component/loader';

interface IDispatchProps {
}

const mapDispatchToProps = (dispatch: any) => ({
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({ });

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {
}

class AuthCallback extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount() {
    console.log('Redirecting to /tours');
    setTimeout(() => {
      window.location.replace('/tours');
    }, 2000);
  }

  render(): React.ReactNode {
    return (
      <>
        <div><Loader width="80px" /></div>
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(AuthCallback));
