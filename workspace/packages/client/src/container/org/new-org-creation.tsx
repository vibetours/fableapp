import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import OrgCreate from '../../component/onboarding/pages/org-create';
import RootLayout from '../../component/onboarding/root-layout';
import { createOrg } from '../../action/creator';

interface IDispatchProps {
  createOrg: (orgName: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  createOrg: (orgName: string) => dispatch(createOrg(orgName)),
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal as RespUser,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {}

class NewOrgCreation extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {};
  }

  componentDidMount(): void {
    document.title = this.props.title;
  }

  render(): React.ReactNode {
    return (
      <RootLayout>
        <OrgCreate createOrg={this.props.createOrg} />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(NewOrgCreation));
