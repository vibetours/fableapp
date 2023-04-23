import { RespOrg } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { fetchOrgs, assignImplicitOrgToUser } from '../../action/creator';
import OrgAssign from '../../component/onboarding/pages/org-assign';
import RootLayout from '../../component/onboarding/root-layout';

interface IDispatchProps {
  fetchOrgs: () => void,
}

const mapDispatchToProps = (dispatch: any) => ({
  fetchOrgs: () => dispatch(fetchOrgs()),
});

interface IAppStateProps {
  orgs: RespOrg[],
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  orgs: state.default.orgs,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps { }

class DefaultOrgAssignment extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.fetchOrgs();
  }

  render(): React.ReactNode {
    return (
      <RootLayout>
        <OrgAssign orgs={this.props.orgs} />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DefaultOrgAssignment));
