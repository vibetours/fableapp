import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { updateUser } from '../../action/creator';
import IamDetailsForm from '../../component/onboarding/pages/iam-details';
import RootLayout from '../../component/onboarding/root-layout';

interface IDispatchProps {}

const mapDispatchToProps = (dispatch: any) => ({});

interface IAppStateProps {
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal as RespUser,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {}

class IamDetails extends React.PureComponent<IProps, IOwnStateProps> {
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
        <IamDetailsForm principal={this.props.principal} />
      </RootLayout>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(IamDetails));
