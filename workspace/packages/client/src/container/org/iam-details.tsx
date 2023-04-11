import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import Input, { InputRef } from 'antd/lib/input';
import Button from 'antd/lib/button';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import Loader from '../../component/loader';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import { updateUser } from '../../action/creator';

interface IDispatchProps {
  updateUserDetails: (firstName: string, lastName: string) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  updateUserDetails: (firstName: string, lastName: string) => dispatch(updateUser(firstName, lastName)),
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal as RespUser,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {
  detailsSubmitting: boolean;
}

class IamDetails extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      detailsSubmitting: false
    };
  }

  firstNameRef: React.RefObject<InputRef> = React.createRef();

  lastNameRef: React.RefObject<InputRef> = React.createRef();

  render(): React.ReactNode {
    return (
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header shouldShowLogoOnLeft navigateToWhenLogoIsClicked="/tours" />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fcfcfc' }}>
          <div>
            <h1 style={{
              marginBottom: 0
            }}
            >Enter your details
            </h1>
            <div>
              Your first name is mandatory and will be used in app as your username. Last name is optional but preferable.
            </div>
          </div>
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
          >
            <Input
              size="large"
              ref={this.firstNameRef}
              placeholder="Your first name"
              style={{
                maxWidth: '420px',
                height: '3rem'
              }}
            />
            <Input
              size="large"
              ref={this.lastNameRef}
              placeholder="Your last name"
              style={{
                maxWidth: '420px',
                height: '3rem'
              }}
            />
            { this.state.detailsSubmitting ? (
              <Loader width="80px" txtBefore="Updating user details" />
            ) : (
              <Button
                size="large"
                type="primary"
                style={{
                  maxWidth: '180px',
                }}
                onClick={() => {
                  if (this.firstNameRef && this.firstNameRef.current && this.lastNameRef && this.lastNameRef.current) {
                    const firstName = this.firstNameRef.current.input?.value || '';
                    const lastName = this.lastNameRef.current.input?.value || '';
                    this.props.updateUserDetails(firstName, lastName);
                  }
                }}
              >
                Update details
              </Button>
            )}
          </div>
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(IamDetails));
