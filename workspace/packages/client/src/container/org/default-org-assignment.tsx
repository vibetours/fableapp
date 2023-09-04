import { RespOrg } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { fetchOrg } from '../../action/creator';
import OrgAssign from '../../component/onboarding/pages/org-assign';
import RootLayout from '../../component/onboarding/root-layout';

interface IDispatchProps {
  fetchOrgs: () => void,
}

const mapDispatchToProps = (dispatch: any) => ({
  fetchOrgs: () => dispatch(fetchOrg(true)),
});

interface IAppStateProps {
  org: RespOrg | null,
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  org: state.default.org,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps { }

class DefaultOrgAssignment extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    this.props.fetchOrgs();
    document.title = this.props.title;
  }

  render(): React.ReactNode {
    return (
      <RootLayout>
        {this.props.org && (
          <OrgAssign org={this.props.org} />
        )}
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DefaultOrgAssignment));
