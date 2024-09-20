import { DatabaseOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import {
  RespOrg,
  RespUser,
} from '@fable/common/dist/api-contract';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import {
  getAllDatasets,
  createNewDataset,
  publishDataset,
  deleteDataset,
} from '../../action/creator';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import SkipLink from '../../component/skip-link';
import {
  P_Dataset,
  P_RespSubscription,
  P_RespVanityDomain,
} from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import * as Tags from './styled';
import Button from '../../component/button';
import Input from '../../component/input';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import DatasetCard from './card';
import { showDeleteConfirm } from '../../component/demo-hub-editor/delete-confirm';
import TextArea from '../../component/text-area';

interface IDispatchProps {
  getAllDatasets: () => void;
  createNewDataset: (name: string, description: string) => ReturnType<ReturnType<typeof createNewDataset>>;
  publishDataset: (name: string) => Promise<P_Dataset>;
  deleteDataset: (name: string) => Promise<P_Dataset>;
}

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllDatasets: () => dispatch(getAllDatasets()),
  createNewDataset: (name: string, description: string) => dispatch(createNewDataset(name, description)),
  publishDataset: (name: string) => dispatch(publishDataset(name)),
  deleteDataset: (name: string) => dispatch(deleteDataset(name)),
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  org: RespOrg | null;
  vanityDomains: P_RespVanityDomain[] | null;
  datasets: Record<string, P_Dataset> | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  principal: state.default.principal,
  org: state.default.org,
  vanityDomains: state.default.vanityDomains,
  datasets: state.default.datasets,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;
interface IOwnStateProps {
  showCreateModal: boolean;
  createErrorStatus: null | 'already_used_name' | 'invalid_name'
}
const { confirm } = Modal;

class Datasets extends React.PureComponent<IProps, IOwnStateProps> {
  datasetNameIpRef: React.RefObject<HTMLInputElement> = React.createRef();

  datasetDescIpRef: React.RefObject<HTMLTextAreaElement> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showCreateModal: false,
      createErrorStatus: null,
    };
  }

  componentDidMount(): void {
    this.props.getAllDatasets();
    document.title = this.props.title;
  }

  componentDidUpdate(
    prevProps: Readonly<IProps>,
    prevState: Readonly<IOwnStateProps>,
    snapshot?: any
  ): void {
    if (prevProps.org !== this.props.org && this.props.org) {
      this.props.getAllDatasets();
    }
  }

  componentWillUnmount(): void {}

  createNewDataset = async (): Promise<void> => {
    const newName = this.datasetNameIpRef.current!.value.trim().replace(/\s+/, ' ');
    const newDescription = this.datasetDescIpRef.current!.value.trim().replace(/\s+/, ' ');
    const res = await this.props.createNewDataset(newName, newDescription);
    if (res.type === 'success') {
      this.navigateToDataset(res.data.name);
      return;
    }
    this.setState({ createErrorStatus: res.data.type });
  };

  closeCreateModal = (): void => {
    this.setState({ showCreateModal: false });
  };

  navigateToDataset = (datasetName: string): void => {
    this.props.navigate(`/dataset/${datasetName}`);
  };

  publishDataset = (datasetName: string): void => {
    confirm({
      title: 'Do you want to publish this dataset?',
      icon: <SaveOutlined />,
      onOk: () => {
        this.props.publishDataset(datasetName);
      },
    });
  };

  deleteDataset = (datasetName: string): void => {
    showDeleteConfirm(() => {
      this.props.deleteDataset(datasetName);
    }, `Are you sure you want to delete this dataset ${datasetName}?`);
  };

  render(): ReactElement {
    const datasetsLoaded = this.props.datasets !== null;

    return (
      <>
        <GTags.ColCon className="tour-con">
          {(this.props.loadingState === 'loading' || !datasetsLoaded) && (
          <TopLoader
            duration={TOP_LOADER_DURATION}
            showLogo={false}
            showOverlay
          />
          )}
          <SkipLink />
          <div style={{ height: '48px' }}>
            <Header
              tour={null}
              shouldShowFullLogo
              principal={this.props.principal}
              org={this.props.org}
              leftElGroups={[]}
              vanityDomains={this.props.vanityDomains}
              subs={this.props.subs}
            />
          </div>
          <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
            <GTags.SidePanelCon>
              <SidePanel
                selected="datasets"
                subs={this.props.subs}
              />
            </GTags.SidePanelCon>
            <GTags.MainCon
              style={{
                height: '100%',
                overflowY: 'auto',
              }}
              className="custom-scrollbar"
            >
              <GTags.BodyCon
                style={{
                  flexDirection: 'column',
                  paddingLeft: '3%',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'start',
                  maxWidth: '680px',
                }}
                id="main"
              >
                {datasetsLoaded && (
                  <>
                    <Tags.TopPanel
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                    >
                      <Tags.DatasetsHeading style={{ fontWeight: 400 }}>
                        All datasets in your org
                      </Tags.DatasetsHeading>
                      <Button
                        icon={<PlusOutlined />}
                        iconPlacement="left"
                        onClick={() => this.setState({ showCreateModal: true })}
                        intent="primary"
                      >
                        Create a dataset
                      </Button>
                    </Tags.TopPanel>
                    <div style={{ width: '100%' }}>
                      <GTags.BottomPanel style={{ overflow: 'auto', margin: '0' }}>
                        {Object.values(this.props.datasets!).length === 0 ? (
                          <Tags.EmptyDatasetsCon>
                            <DatabaseOutlined style={{ fontSize: '2rem' }} />
                            <div className="typ-h2">No datasets created. Start by creating one!</div>
                          </Tags.EmptyDatasetsCon>
                        ) : (
                          <>
                            {Object.values(this.props.datasets!).map((dataset, index) => (
                              <DatasetCard
                                key={dataset.name}
                                dataset={dataset}
                                navigateToDataset={this.navigateToDataset}
                                publish={this.publishDataset}
                                delete={this.deleteDataset}
                              />
                            ))}
                          </>
                        )}
                      </GTags.BottomPanel>
                    </div>
                  </>
                )}
              </GTags.BodyCon>
            </GTags.MainCon>
          </GTags.RowCon>
        </GTags.ColCon>
        <GTags.BorderedModal
          donotShowHeaderStip
          containerBg="#f5f5f5"
          style={{ height: '10px' }}
          open={this.state.showCreateModal}
          onOk={this.createNewDataset}
          onCancel={this.closeCreateModal}
          footer={(
            <div className="button-two-col-cont">
              <Button
                type="button"
                intent="secondary"
                onClick={this.closeCreateModal}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1 }}
                onClick={this.createNewDataset}
              >
                Save
              </Button>
            </div>
            )}
        >
          <div className="modal-content-cont">

            <div className="typ-h2">Create dataset</div>
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const newName = this.datasetNameIpRef.current!.value.trim().replace(/\s+/, ' ');
                  const newDescription = this.datasetDescIpRef.current!.value.trim().replace(/\s+/, ' ');
                  this.props.createNewDataset(newName, newDescription);
                }}
                style={{
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  gap: '1rem',
                  flexDirection: 'column',
                  display: 'flex'
                }}
              >
                <Input
                  label="Dataset name"
                  innerRef={this.datasetNameIpRef}
                  onChange={() => this.setState({ createErrorStatus: null })}
                />
                <TextArea
                  label="Enter description for this dataset"
                  innerRef={this.datasetDescIpRef}
                />
                {this.state.createErrorStatus && (
                  <Tags.ErrorMsg className="error-msg">
                    {this.state.createErrorStatus === 'already_used_name' && 'Duplicate name. Please use another name'}
                    {this.state.createErrorStatus === 'invalid_name' && 'Invalid name. Only use [a-ZA-Z0-9_]'}
                  </Tags.ErrorMsg>
                )}
              </form>
            </div>
          </div>
        </GTags.BorderedModal>
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Datasets));
