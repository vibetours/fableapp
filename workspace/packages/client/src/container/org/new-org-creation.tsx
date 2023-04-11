import { RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import Input, { InputRef } from 'antd/lib/input';
import Button from 'antd/lib/button';
import { TState } from '../../reducer';
import { createOrg } from '../../action/creator';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import Loader from '../../component/loader';

interface IDispatchProps {
  createOrg: (name: string) => void
}

const mapDispatchToProps = (dispatch: any) => ({
  createOrg: (displayName: string) => dispatch(createOrg(displayName)),
});

interface IAppStateProps { }

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal as RespUser,
});

interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps;

interface IOwnStateProps {
  orgCreating: boolean
}

class NewOrgCreation extends React.PureComponent<IProps, IOwnStateProps> {
  orgNameElRef: React.RefObject<InputRef> = React.createRef();

  constructor(props: IProps) {
    super(props);

    this.state = {
      orgCreating: false
    };
  }

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
            >Create a new org
            </h1>
            <div>
              Your are the first one to signup from your email. Any other person signing up from the same email domain would automtically join this org by default.
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
              ref={this.orgNameElRef}
              placeholder="Name of your organization"
              style={{
                maxWidth: '420px',
                height: '3rem'
              }}
            />
            { this.state.orgCreating ? (
              <Loader width="80px" txtBefore="Creating org" />
            ) : (
              <Button
                size="large"
                type="primary"
                style={{
                  maxWidth: '240px',
                }}
                onClick={() => {
                  if (this.orgNameElRef && this.orgNameElRef.current) {
                    const orgName = this.orgNameElRef.current.input?.value;
                    if (orgName) {
                      this.props.createOrg(orgName);
                      this.setState({ orgCreating: true });
                    }
                  }
                }}
              >
                Create Organisation
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
)(withRouter(NewOrgCreation));
