import { RespOrg, RespUser } from '@fable/common/dist/api-contract';
import React from 'react';
import { connect } from 'react-redux';
import { getDisplayableTime } from '@fable/common/dist/utils';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { fetchOrgs, assignImplicitOrgToUser } from '../../action/creator';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import Header from '../../component/header';

interface IDispatchProps {
  fetchOrgs: () => void,
  assignImplicitOrgToUser: () => void,
}

const mapDispatchToProps = (dispatch: any) => ({
  fetchOrgs: () => dispatch(fetchOrgs()),
  assignImplicitOrgToUser: () => dispatch(assignImplicitOrgToUser())
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
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header shouldShowLogoOnLeft navigateToWhenLogoIsClicked="/tours" />
        </GTags.HeaderCon>
        <GTags.BodyCon style={{ height: '100%', background: '#fcfcfc' }}>
          <div>
            <h1 style={{
              marginBottom: 0
            }}
            >Select an org to join
            </h1>
            <div>
              An orgnization already exists for your email domain. Select the org below to be a part of it.
            </div>
          </div>
          <div
            style={{
              marginTop: '2rem',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}
            onClick={() => {
              // Right now there is no option to choose from org, hence we always assign the user to
              // default org
              this.props.assignImplicitOrgToUser();
            }}
          >
            {this.props.orgs.map(org => (
              <Tags.OrgCardCon key={org.rid}>
                <GTags.Txt className="title">
                  {org.displayName}
                </GTags.Txt>
                <GTags.Txt className="subsubhead">
                  Created {getDisplayableTime(new Date(org.createdAt))}
                </GTags.Txt>
              </Tags.OrgCardCon>
            ))}
          </div>
        </GTags.BodyCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DefaultOrgAssignment));
