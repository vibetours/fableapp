// @ts-ignore
import { Provider, Config } from '@cobaltio/react-cobalt-js';
import React from 'react';
import { connect } from 'react-redux';
import {
  ApiResp,
  PlatformIntegrationType,
  RespAccountToken,
  RespLinkedApps,
  RespPlatformIntegration,
  RespTenantIntegration,
  RespUser
} from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import * as Tags from './styled';
import IntegrationCard from '../../component/integrations/integration-card';
import { CBEventPayload, CBEvents, logEventToCbltToSetAppProperties } from '../../analytics/handlers';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import Webhook from './webhook';

interface IDispatchProps { }

const mapDispatchToProps = (dispatch: any) => ({});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  principal: state.default.principal,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;

interface IOwnStateProps {
  cobaltSessionToken: string | null;
  listOfLinkedApps: (RespLinkedApps | RespPlatformIntegration)[];
  hasIntegrationLoadingErr: boolean;
  selectedApp: string | null;
  modalOpen: boolean
}

class Integrations extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      cobaltSessionToken: null,
      listOfLinkedApps: [],
      hasIntegrationLoadingErr: false,
      selectedApp: null,
      modalOpen: false
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getPlatformIntegrations = async (): Promise<RespPlatformIntegration[]> => {
    try {
      const resp = await api<any, ApiResp<RespPlatformIntegration[]>>('/tenant_integrations', {
        auth: true,
      });
      return resp.data;
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true });
      return [];
    }
  };

  getCobaltSessionToken = async (): Promise<void> => {
    try {
      const resp = await api<any, ApiResp<RespAccountToken>>('/vr/ct/tknlnkdacc', {
        auth: true,
      });
      const sessionToken = resp.data.token;
      this.setState({ cobaltSessionToken: sessionToken });
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true });
    }
  };

  getListOfLinkedCobaltApps = async (): Promise<RespLinkedApps[]> => {
    try {
      const resp = await api<any, ApiResp<RespLinkedApps[]>>('/vr/ct/lstapp', {
        auth: true,
      });

      this.setState({ listOfLinkedApps: resp.data.concat(await this.getPlatformIntegrations()) });
      return resp.data;
    } catch (e) {
      raiseDeferredError(e as Error);
      this.setState({ hasIntegrationLoadingErr: true, listOfLinkedApps: await this.getPlatformIntegrations() });
      return [];
    }
  };

  initiateContactPropertyEvent = async (): Promise<void> => {
    const linkedApps: RespLinkedApps[] = await this.getListOfLinkedCobaltApps();
    linkedApps.forEach(app => {
      if (!app.connected) return;

      let payload: CBEventPayload<any>;
      switch (app.type) {
        case 'hubspot':
          payload = {
            event: CBEvents.CREATE_CONTACT_PROPERTIES_AND_GROUP,
            payload: {}
          };
          logEventToCbltToSetAppProperties(payload);
          break;
        default:
          break;
      }
    });
  };

  componentDidMount(): void {
    document.title = this.props.title;

    this.getCobaltSessionToken();
    this.getListOfLinkedCobaltApps();
  }

  render(): JSX.Element {
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
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="integrations" subs={this.props.subs} />
          </GTags.SidePanelCon>
          <GTags.MainCon style={{ overflow: 'auto' }}>
            <Tags.IntegrationCardCon>
              {this.state.hasIntegrationLoadingErr && (
                <div className="err-msg">
                  <h3>Couldn't load some integrations</h3>
                  <p>
                    This might happen when you don't have access to integrations.
                  </p>
                  <p>
                    Please contact us using the in app chat or email us at&nbsp;
                    <a href="mailto:support@sharefable.com?subject=Can't access integrations">
                      support@sharefable.com
                    </a>.
                  </p>
                </div>
              )}
              {this.state.listOfLinkedApps.map(appConfig => (
                <IntegrationCard
                  key={appConfig.slug}
                  appConfig={appConfig}
                  onClick={() => this.setState({ selectedApp: appConfig.slug, modalOpen: true })}
                />
              ))}
            </Tags.IntegrationCardCon>

            <GTags.BorderedModal
              open={this.state.modalOpen}
              onCancel={() => this.setState({ selectedApp: null, modalOpen: false })}
              footer={null}
              width={this.state.selectedApp && this.state.selectedApp.startsWith('Fable') ? 750 : undefined}
              centered
              afterOpenChange={(open) => {
                // TODO: this has been written in a hurry
                // ideally, the better approach is to use redux state
                if (open
                  && this.state.selectedApp
                  && this.state.selectedApp.startsWith('Fable')
                  && this.state.selectedApp === PlatformIntegrationType.FableWebhook
                ) {
                  this.getListOfLinkedCobaltApps();
                }
              }}
            >
              {this.state.selectedApp && (
                this.state.selectedApp.startsWith('Fable') ? (
                  (this.state.selectedApp === PlatformIntegrationType.FableWebhook && (
                    <Webhook
                      config={this.state.listOfLinkedApps.find(f => f.type === this.state.selectedApp) as RespPlatformIntegration | undefined}
                      deleteWebhook={(id: number) => {
                        this.setState(state => {
                          const webhookApp = state.listOfLinkedApps
                            .findIndex(app => app.type === PlatformIntegrationType.FableWebhook);

                          const tis = (state.listOfLinkedApps[webhookApp] as RespPlatformIntegration)
                            .tenantIntegrations.filter(ti => ti.id !== id);

                          (state.listOfLinkedApps[webhookApp] as RespPlatformIntegration) = {
                            ...((state.listOfLinkedApps[webhookApp]) as RespPlatformIntegration),
                            tenantIntegrations: tis
                          };

                          return ({ listOfLinkedApps: state.listOfLinkedApps.slice(0) });
                        });
                      }}
                      createNewPlaceholderWebhook={(localId) => {
                        const idx = this.state.listOfLinkedApps.findIndex(f => f.type === this.state.selectedApp);
                        const app = this.state.listOfLinkedApps[idx] as RespPlatformIntegration;
                        const webhooks = app.tenantIntegrations.concat({
                          relay: localId,
                        } as RespTenantIntegration);
                        this.setState(state => ({
                          ...state,
                          listOfLinkedApps: state.listOfLinkedApps.slice(0, idx).concat({
                            ...app,
                            tenantIntegrations: webhooks
                          }, ...state.listOfLinkedApps.slice(idx + 1))
                        }));
                      }}
                    />
                  ))
                ) : (
                  <Tags.CobaltConfigWrapper>
                    <Provider
                      sessionToken={this.state.cobaltSessionToken}
                    >
                      <Config
                        removeBranding
                        slug={this.state.selectedApp}
                        onSave={() => this.setState({ modalOpen: false })}
                        onConnect={this.initiateContactPropertyEvent}
                      />
                    </Provider>
                  </Tags.CobaltConfigWrapper>
                )
              )}
            </GTags.BorderedModal>
          </GTags.MainCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Integrations));
