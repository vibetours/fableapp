import React from 'react';
import { connect } from 'react-redux';
import { RespUser } from '@fable/common/dist/api-contract';
import { LoadingStatus } from '@fable/common/dist/types';
import { PlusOutlined, UserAddOutlined, UserDeleteOutlined } from '@ant-design/icons';
import { Button as AntBtn, Tooltip } from 'antd';
import { getRandomId, SHORT_MONTHS } from '@fable/common/dist/utils';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import { getAllUsersForOrg, activateOrDeactivateUser } from '../../action/creator';
import Loader from '../../component/loader';
import * as Tags from './styled';
import Button from '../../component/button';
import UrlCodeShare from '../../component/publish-preview/url-code-share';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

function getReadableDate(d: Date): string {
  const msDiffs = +d - +new Date();
  const days = Math.ceil(msDiffs / (1000 * 60 * 60 * 24));
  if (days >= 1) return 'Tomorrow';
  if (days >= 0) return 'Today';

  const isCurrentYear = d.getFullYear() - new Date().getFullYear();
  const yearSuffix = isCurrentYear ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${yearSuffix}`;
}

interface IDispatchProps {
  getAllUsersForOrg: () => void;
  activateOrDeactivateUser: (id: number, shouldActivate: boolean) => void;
}

const mapDispatchToProps = (dispatch: any) => ({
  getAllUsersForOrg: () => dispatch(getAllUsersForOrg()),
  activateOrDeactivateUser: (id: number, shouldActivate: boolean) => dispatch(activateOrDeactivateUser(id, shouldActivate)),
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  usersLoaded: boolean;
  users: RespUser[];
  manifestPath: string;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  principal: state.default.principal,
  usersLoaded: state.default.allUsersLoadingStatus === LoadingStatus.Done,
  users: state.default.users,
  manifestPath: state.default.commonConfig
    ? state.default.commonConfig.pubTourAssetPath + state.default.commonConfig.manifestFileName
    : '',
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps {
  showModal: boolean;
}

class UserManagementAndSubscription extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      showModal: false
    };
  }

  componentDidMount(): void {
    this.props.getAllUsersForOrg();
    document.title = this.props.title;
  }

  render(): JSX.Element {
    const noOfUsers = this.props.users.length;
    const heading = `${noOfUsers} user${noOfUsers > 1 ? 's' : ''} in your org`;
    return (
      <GTags.ColCon>
        <div style={{ height: '48px' }}>
          <Header
            tour={null}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
            manifestPath={this.props.manifestPath}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="user-management" subs={this.props.subs} />
          </GTags.SidePanelCon>
          <GTags.MainCon>
            <GTags.BodyCon style={{ height: '100%', position: 'relative', overflowY: 'scroll' }}>
              {this.props.usersLoaded ? (
                <div style={{ maxWidth: '43.5rem' }}>
                  <div style={{
                    margin: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  >
                    <Tags.Heading style={{ fontWeight: 400 }}>{heading}</Tags.Heading>
                    <Button
                      icon={<PlusOutlined />}
                      iconPlacement="left"
                      onClick={() => { this.setState({ showModal: true }); }}
                    >
                      Invite a user
                    </Button>
                  </div>
                  <Tags.BottomPanel style={{ overflow: 'auto' }}>
                    {this.props.users.map((user) => (
                      <Tags.UserCardCon key={user.id} active={user.active}>
                        <Tags.Avatar>
                          <img src={user.avatar} alt={`${user.firstName}'s dp`} />
                        </Tags.Avatar>
                        <Tags.CardDataCon>
                          <Tags.DisplayName>
                            {`${user.firstName} ${user.lastName}`}
                          </Tags.DisplayName>
                          <Tags.MetaDataCon>
                            Joined {getReadableDate(new Date(user.createdAt))}
                          </Tags.MetaDataCon>
                        </Tags.CardDataCon>
                        <Tags.ActionBtnCon>
                          {this.props.principal?.id !== user.id && (
                            <Tooltip
                              title={`${user.active ? 'Deactivate' : 'Activate'} user`}
                              overlayStyle={{ fontSize: '0.75rem' }}
                            >
                              <AntBtn
                                style={{ padding: 0, margin: 0 }}
                                size="small"
                                shape="circle"
                                type="text"
                                icon={user.active ? <UserDeleteOutlined /> : <UserAddOutlined />}
                                onClick={e => {
                                  this.props.activateOrDeactivateUser(user.id, !user.active);
                                }}
                              />
                            </Tooltip>
                          )}
                        </Tags.ActionBtnCon>
                      </Tags.UserCardCon>
                    ))}
                  </Tags.BottomPanel>
                </div>
              ) : (
                <div>
                  <Loader width="80px" txtBefore="Loading all users" showAtPageCenter />
                </div>
              )}
            </GTags.BodyCon>
          </GTags.MainCon>
        </GTags.RowCon>
        <GTags.BorderedModal
          style={{ height: '10px' }}
          open={this.state.showModal}
          onOk={() => { this.setState({ showModal: false }); }}
          onCancel={() => { this.setState({ showModal: false }); }}
          footer={null}
        >
          <div className="modal-content-cont">
            <div className="modal-title">Invite a user</div>
            Please copy the following link and share it with your team member to join this organization in Fable.

            <div style={{ margin: '2rem 0 1rem 0' }}>
              <UrlCodeShare url={`${baseURL}/invite/${getRandomId()}`} />
            </div>
          </div>
        </GTags.BorderedModal>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(UserManagementAndSubscription);
