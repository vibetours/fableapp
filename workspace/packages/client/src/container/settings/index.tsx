import React from 'react';
import { connect } from 'react-redux';
import api from '@fable/common/dist/api';
import { ApiResp, RespApiKey } from '@fable/common/dist/api-contract';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { CopyOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { timeFormat } from 'd3-time-format';
import { Modal } from 'antd';
import { CmnEvtProp } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
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

const { confirm } = Modal;

const dateTimeFormat = timeFormat('%e-%b-%Y %I:%M %p');

const mapDispatchToProps = (dispatch: any) => ({ });

const mapStateToProps = (state: TState) => ({
  subs: state.default.subs,
  principal: state.default.principal,
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
}

class Settings extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      apiKey: null,
      copyMsg: 'Click to copy to clipboard',
      timer: null,
      opsInProgress: false,
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;
    this.getActiveApiKey();
  }

  async getActiveApiKey(): Promise<void> {
    try {
      const resp = await api<any, ApiResp<RespApiKey | null>>('/apikey', {
        auth: true,
      });
      this.setState({ apiKey: resp.data });
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
              <div className="typ-h1">API Key</div>
              <br />
              <p className="typ-reg">
                API Keys are unique to a workspace. You can use API Key here to connect to third party system like Zapier etc.
              </p>
              <p className="typ-reg">
                API Keys are critical, make sure the key is not leaked. You can always generate a new key in case you think a previous key has been compromised.
              </p>
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
                        okType: 'danger',
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
