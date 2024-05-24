import React from 'react';
import { connect } from 'react-redux';
import api from '@fable/common/dist/api';
import { ApiResp, RespApiKey, VanityDomainDeploymentStatus } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { CheckCircleFilled, CheckCircleOutlined, ClockCircleFilled, ClockCircleOutlined, CodeOutlined, CopyOutlined, GlobalOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { timeFormat } from 'd3-time-format';
import { Collapse, Modal, Tabs, Tag } from 'antd';
import { CmnEvtProp } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import { sleep } from '@fable/common/dist/utils';
import { WithRouterProps, withRouter } from '../../router-hoc';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import * as Tags from './styled';
import SidePanel from '../../component/side-panel';
import { TOP_LOADER_DURATION } from '../../constants';
import Header from '../../component/header';
import TopLoader from '../../component/loader/top-loader';
import Button from '../../component/button';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { addNewCustomDomain, getCustomDomains, removeCustomDomain } from '../../action/creator';
import Input from '../../component/input';

const { confirm } = Modal;

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

const mapDispatchToProps = (dispatch: any) => ({
  getVanityDomains: () => dispatch(getCustomDomains()),
  addNewCustomDomain: (domainName: string) => dispatch(addNewCustomDomain(domainName)),
  removeCustomDomain: (domainName: string) => dispatch(removeCustomDomain(domainName))
});

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  featureForPlan: state.default.featureForPlan,
  vanityDomains: state.default.vanityDomains,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps> & WithRouterProps<{
}>;

interface IOwnStateProps {
  apiKey: RespApiKey | null;
  copyMsg: string;
  timer: ReturnType<typeof setTimeout> | null;
  opsInProgress: boolean;
  isLoading: boolean;
  allowedCustomDomain: number;
  showError: string;
  newDomainName: string
}

class Settings extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      apiKey: null,
      copyMsg: 'Click to copy to clipboard',
      timer: null,
      opsInProgress: false,
      isLoading: true,
      allowedCustomDomain: -1,
      showError: '',
      newDomainName: '',
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;
    this.getActiveApiKey();
    this.setState({ allowedCustomDomain: this.getNoOfCustomDomain() });
    this.props.getVanityDomains();
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (this.props.featureForPlan !== prevProps.featureForPlan && this.props.featureForPlan) {
      this.setState({ allowedCustomDomain: this.getNoOfCustomDomain() });
    }
  }

  async getActiveApiKey(): Promise<void> {
    try {
      const resp = await api<any, ApiResp<RespApiKey | null>>('/apikey', {
        auth: true,
      });
      this.setState({ apiKey: resp.data, isLoading: false });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ apiKey: null });
    }
  }

  async genApiKey(): Promise<void> {
    try {
      const resp = await api<any, ApiResp<RespApiKey | null>>('/new/apikey', {
        auth: true,
        method: 'POST'
      });
      this.setState({ apiKey: resp.data });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ apiKey: null });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getIconBasedOnDomainStatus(status: VanityDomainDeploymentStatus) {
    switch (status) {
      case VanityDomainDeploymentStatus.Requested:
      case VanityDomainDeploymentStatus.InProgress:
        return <ClockCircleFilled style={{
          color: '#fbc02d'
        }}
        />;
      case VanityDomainDeploymentStatus.Issued:
        return <CheckCircleFilled style={{
          color: '#7567ff'
        }}
        />;
      default:
        return null;
    }
  }

  getNoOfCustomDomain(): number {
    if (!this.props.featureForPlan) return -1;
    try {
      const numberOfCustomDomainAllowed = this.props.featureForPlan.domain_for_sharing.value as string;
      const limitStr = numberOfCustomDomainAllowed.match(/<=(\d+)/);
      if (limitStr && limitStr[1]) {
        const limit = +limitStr[1];
        return Number.isFinite(limit) ? limit : -1;
      }
      return -1;
    } catch (e) {
      raiseDeferredError(e as Error);
      return -1;
    }
  }

  showErrorMsg = (msg: string, cancelAfterMs = 7000) => {
    this.setState({
      showError: msg
    });
    setTimeout(() => {
      this.setState({
        showError: ''
      });
    }, cancelAfterMs);
  };

  render() {
    return (
      <GTags.ColCon>
        {this.props.loadingState === 'loading' && <TopLoader
          duration={TOP_LOADER_DURATION}
          showLogo={false}
          showOverlay
        />}
        <div style={{ height: '48px' }}>
          <Header
            tour={null}
            org={this.props.org}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="settings" subs={this.props.subs} />
          </GTags.SidePanelCon>
          <GTags.MainCon style={{ overflow: 'auto', paddingLeft: '3%' }}>
            <Tags.Con>
              <Tabs
                defaultActiveKey="developer"
                items={[{
                  key: 'developer',
                  label: (
                    <>
                      <CodeOutlined />Developer
                    </>
                  ),
                  children: (
                    <div>
                      <p className="typ-reg">
                        API Keys are unique to a workspace. You can use API Key here to connect to third party system like Zapier etc.
                      </p>
                      <p className="typ-reg">
                        API Keys are critical, make sure the key is not leaked. You can always generate a new key in case you think a previous key has been compromised.
                      </p>
                      {
                this.state.isLoading && (
                  <p className="typ-reg">
                    <LoadingOutlined style={{ marginRight: '0.5rem' }} />
                    Loading...
                  </p>
                )
              }
                      {
                !this.state.isLoading && (
                <>
                  {this.state.apiKey ? (
                    <Tags.ApiKeyDetails>
                      <Tags.ApiKeyTxt
                        className="typ-btn"
                        copyMsg={this.state.copyMsg}
                        onMouseUp={() => {
                          navigator.clipboard.writeText(this.state.apiKey!.apiKey);
                          if (this.state.timer) clearTimeout(this.state.timer);
                          const timer = setTimeout(() => {
                            this.setState({
                              copyMsg: 'Click to copy to clipboard'
                            });
                          }, 5000);
                          this.setState({
                            copyMsg: 'Copied to clipboard',
                            timer,
                          });
                        }}
                      >
                        {this.state.apiKey.apiKey}
                      </Tags.ApiKeyTxt>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      >
                        Created by
                        <img className="avatar" alt="avatar" src={this.state.apiKey.createdBy.avatar} />
                        {this.state.apiKey.createdBy.firstName} {this.state.apiKey.createdBy.lastName}
                        &nbsp;
                        on {dateTimeFormat(new Date(this.state.apiKey.createdAt))}
                      </div>
                      <div style={{
                        marginTop: '0.5rem'
                      }}
                      >
                        <Button
                          intent="secondary"
                          size="small"
                          onClick={() => confirm({
                            title: 'Are you sure you want to generate a new API Key?',
                            content: `
                          If you generate a new API key, the current key will cease to exist.
                          If you've used this key in integrations, you have to manually update the API Key
                        `,
                            okText: this.state.opsInProgress ? 'Generating...' : 'Generate New API Key',
                            onOk: async () => {
                              traceEvent(
                                AMPLITUDE_EVENTS.API_KEY_GENERATED,
                                {
                                  regenerated: true
                                },
                                [CmnEvtProp.EMAIL]
                              );
                              this.setState({ opsInProgress: true });
                              await this.genApiKey();
                              this.setState({ opsInProgress: false });
                            },
                            onCancel() { }
                          })}
                        >Create a New API Key
                        </Button>
                      </div>
                    </Tags.ApiKeyDetails>
                  ) : (
                    <Button
                      intent="primary"
                      disabled={this.state.opsInProgress}
                      icon={this.state.opsInProgress ? <LoadingOutlined /> : <PlusOutlined />}
                      iconPlacement="left"
                      onClick={async () => {
                        this.setState({ opsInProgress: true });
                        await this.genApiKey();
                        this.setState({ opsInProgress: false });
                      }}
                    >
                      Create a New API Key
                    </Button>
                  )}
                </>
                )
              }
                    </div>
                  ),
                }, {
                  key: 'customdomain',
                  label: (
                    <>
                      <GlobalOutlined />Custom domain
                    </>
                  ),
                  children: (
                    <div className="typ-reg">
                      <div>
                        {this.state.allowedCustomDomain >= 1 && (
                        <p>
                          You can add max {this.state.allowedCustomDomain} custom domains in this plan.&nbsp;
                          <GTags.OurLink
                            href="/billing"
                            style={{
                              display: 'inline'
                            }}
                          >Upgrade plan to increase limit.
                          </GTags.OurLink>
                        </p>
                        )}
                      </div>
                      {this.props.vanityDomains === null ? (
                        <div><LoadingOutlined /> Loading...</div>
                      ) : (
                        <div>
                          <div style={{
                            margin: (this.props.vanityDomains || []).length ? '2rem 0' : undefined
                          }}
                          >
                            {this.props.vanityDomains.map((domain, i) => (
                              <Tags.CustomDomainCard key={i}>
                                <div className="l1">
                                  <div className="prim">
                                    {domain.domainName}
                                  </div>
                                  <div>
                                    <span>
                                      {this.getIconBasedOnDomainStatus(domain.status)} &nbsp;
                                      {domain.status}
                                    </span>
                                    &nbsp; | &nbsp;
                                    <span className="typ-sm">
                                      <Tags.ABtn onClick={() => {
                                        confirm({
                                          title: 'Confirm your action',
                                          content: (
                                            <div className="typ-reg">
                                              Are you sure you wanna remove&nbsp;
                                              <span style={{
                                                fontFamily: '"IBM Plex Mono", monospace !important',
                                                fontWeight: 600
                                              }}
                                              >{domain.domainName}
                                              </span>&nbsp;
                                              domain?
                                            </div>
                                          ),
                                          okType: 'danger',
                                          okText: 'Delete this domain',
                                          onOk: async () => {
                                            await this.props.removeCustomDomain(domain.domainName);
                                          },
                                          onCancel() {}
                                        });
                                      }}
                                      >Remove
                                      </Tags.ABtn>
                                    </span>
                                  </div>
                                </div>
                                <div className="l2 typ-sm">
                                  Created {domain.displayableCreatedAt}
                                </div>
                                <div className="typ-sm l3">
                                  {(domain.status === VanityDomainDeploymentStatus.Requested
                                    || domain.status === VanityDomainDeploymentStatus.InProgress) && (
                                    <ul>
                                      <li>It'll take up to 48hrs to create your record set</li>
                                      <li>You'll receive a mail once the record sets are generated</li>
                                      <li>This dashboard will reflect your assigned DNS record set for this domain</li>
                                    </ul>
                                  )}
                                  {(domain.status === VanityDomainDeploymentStatus.Issued) && (
                                    <div style={{
                                      flex: '1 0 auto'
                                    }}
                                    >
                                      <Tags.AntCollapse
                                        size="small"
                                        items={[{
                                          key: '1',
                                          label: 'Copy record set',
                                          children: (
                                            <Tags.RecordCon>
                                              <table>
                                                {domain.records.map((record, ii) => (
                                                  <tbody key={ii}>
                                                    <tr>
                                                      <td colSpan={2} className="th">{record.recordDes}</td>
                                                    </tr>
                                                    <tr>
                                                      <td>Record type</td>
                                                      <td>{record.recordType}</td>
                                                    </tr>
                                                    <tr>
                                                      <td>Record name</td>
                                                      <td>
                                                        <CopyOutlined
                                                          className="cpy"
                                                          onClick={() => {
                                                            navigator.clipboard.writeText(record.recordKey);
                                                          }}
                                                        />&nbsp;
                                                        <span className="foc">
                                                          {record.recordKey}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                    <tr>
                                                      <td>Value</td>
                                                      <td>
                                                        <CopyOutlined
                                                          className="cpy"
                                                          onClick={() => {
                                                            navigator.clipboard.writeText(record.recordValue);
                                                          }}
                                                        />&nbsp;
                                                        <span className="foc">
                                                          {record.recordValue}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                ))}
                                              </table>
                                            </Tags.RecordCon>
                                          )
                                        }]}
                                      />
                                    </div>
                                  )}
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'flex-end'
                                  }}
                                  />
                                </div>
                              </Tags.CustomDomainCard>
                            ))}
                          </div>
                          <Button
                            icon={<PlusOutlined />}
                            iconPlacement="left"
                            intent="secondary"
                            size="medium"
                            onClick={() => {
                              if (this.state.allowedCustomDomain !== -1 && this.state.allowedCustomDomain <= this.props.vanityDomains!.length) {
                                this.showErrorMsg("You've reached the limit for custom domain in your plan. Please upgrade.");
                                return;
                              }
                              confirm({
                                title: 'Please enter the following details',
                                content: (
                                  <div>
                                    <br />
                                    <Input
                                      label="Enter your domain name (demo.acme.com)"
                                      onChange={(e) => this.setState({ newDomainName: e.target.value })}
                                      required
                                      autoFocus
                                    />
                                    <div>
                                      <ul style={{
                                        textAlign: 'left'
                                      }}
                                      >
                                        <li>You should not enter your apex domain in the above input box</li>
                                        <li>Double check the domain name if it's correct</li>
                                        <li>It might take upto 48hrs to complete your request</li>
                                        <li>You would receive an email from us once your custom domain request is attended</li>
                                      </ul>
                                    </div>
                                  </div>
                                ),
                                onOk: async () => {
                                  let domain: string;
                                  if (this.state.newDomainName && (domain = this.state.newDomainName.trim())) {
                                    if (this.props.vanityDomains!.findIndex(d => d.domainName === domain) !== -1) {
                                      this.showErrorMsg('Domain already exists');
                                      return;
                                    }
                                    try {
                                      await this.props.addNewCustomDomain(domain);
                                    } catch (e) {
                                      raiseDeferredError(e as Error);
                                      this.showErrorMsg('Something went wrong when requesting for custom domain. Please try again after sometime.', 10000);
                                    }
                                    return;
                                  }
                                  this.setState({ newDomainName: '' });
                                },
                                onCancel: () => {
                                  this.setState({ newDomainName: '' });
                                }
                              });
                            }}
                          >Add a new domain
                          </Button>
                          {this.state.showError && (
                            <p>
                              <span className="err-line">{this.state.showError}</span>
                            </p>
                          )}
                        </div>
                      )}

                      <div />
                      {!!(this.props.vanityDomains || []).length && (
                        <p>
                          &nbsp;
                          <GTags.OurLink
                            className="support-bot-open"
                            style={{
                              display: 'inline'
                            }}
                          >
                            Talk to us
                          </GTags.OurLink> if you need any changes in the custom domains.
                        </p>
                      )}
                    </div>
                  )
                }]}
              />
            </Tags.Con>
          </GTags.MainCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<ReturnType<typeof mapStateToProps>, ReturnType<typeof mapDispatchToProps>, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Settings));
