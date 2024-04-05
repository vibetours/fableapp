// @ts-ignore
import { Provider, Config } from '@cobaltio/react-cobalt-js';
import React from 'react';
import { connect } from 'react-redux';
import { ApiResp, RespAccountToken, RespLinkedApps, RespUser } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import * as Tags from './styled';
import CobaltCard from '../../component/integrations/cobalt-card';
import { CBEventPayload, CBEvents, logEventToCbltToSetAppProperties } from '../../analytics/handlers';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';

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
  listOfLinkedCobaltApps: RespLinkedApps[] | null;
  selectedCobaltApp: string | null;
  modalOpen: boolean
}

class Integrations extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      cobaltSessionToken: null,
      listOfLinkedCobaltApps: null,
      selectedCobaltApp: null,
      modalOpen: false
    };
  }

  getCobaltSessionToken = async (): Promise<void> => {
    const resp = await api<any, ApiResp<RespAccountToken>>('/vr/ct/tknlnkdacc', {
      auth: true,
    });
    const sessionToken = resp.data.token;
    this.setState({ cobaltSessionToken: sessionToken });
  };

  getListOfLinkedCobaltApps = async (): Promise<RespLinkedApps[]> => {
    const resp = await api<any, ApiResp<RespLinkedApps[]>>('/vr/ct/lstapp', {
      auth: true,
    });
    this.setState({ listOfLinkedCobaltApps: resp.data });
    return resp.data;
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
            manifestPath=""
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="integrations" subs={this.props.subs} />
          </GTags.SidePanelCon>
          <GTags.MainCon style={{ overflow: 'auto' }}>
            <Tags.CobaltCardCon>
              {this.state.listOfLinkedCobaltApps?.filter(app => app.type === 'hubspot').map(cobaltApp => (
                <CobaltCard
                  key={cobaltApp.slug}
                  cobaltApp={cobaltApp}
                  onClick={() => this.setState({ selectedCobaltApp: cobaltApp.slug, modalOpen: true })}
                />
              ))}
            </Tags.CobaltCardCon>

            <GTags.BorderedModal
              open={this.state.modalOpen}
              onCancel={() => this.setState({ selectedCobaltApp: null, modalOpen: false })}
              footer={null}
              centered
            >
              <Tags.CobaltConfigWrapper>
                <Provider
                  sessionToken={this.state.cobaltSessionToken}
                >
                  <Config
                    removeBranding
                    slug={this.state.selectedCobaltApp}
                    onSave={() => this.setState({ modalOpen: false })}
                    onConnect={this.initiateContactPropertyEvent}
                  />
                </Provider>
              </Tags.CobaltConfigWrapper>
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
