import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { createOrg } from '../../action/creator';
import { withRouter, WithRouterProps } from '../../router-hoc';
import OrgCreate from '../../component/onboarding/pages/org-create';
import RootLayout from '../../component/onboarding/root-layout';

interface IDispatchProps {}

const mapDispatchToProps = (dispatch: any) => ({});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal as RespUser,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {}

class NewOrgCreation extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {};
  }

  render(): React.ReactNode {
    return (
      <RootLayout>
        <OrgCreate />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(NewOrgCreation));
