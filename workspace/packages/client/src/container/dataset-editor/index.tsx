import { RespOrg, RespUser } from '@fable/common/dist/api-contract';
import React, { ReactElement } from 'react';
import { connect } from 'react-redux';
import { Modal } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SkipLink from '../../component/skip-link';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import TopLoader from '../../component/loader/top-loader';
import { TOP_LOADER_DURATION } from '../../constants';
import Button from '../../component/button';
import { P_Dataset, P_RespSubscription } from '../../entity-processor';
import { editDataset, getDataset, publishDataset } from '../../action/creator';
import { DatasetConfig } from '../../types';
import { debounce } from '../../utils';
import DatasetEditor from '../../component/dataset-editor';

const { confirm } = Modal;

interface IDispatchProps {
  loadDataset: (name: string) => Promise<P_Dataset>;
  publishDataset: (name: string) => Promise<P_Dataset>;
  editDataset: (name: string, config: DatasetConfig) => Promise<void>;
}

export enum CtxAction {
  NA = 'na',
  Rename = 'rename',
  Duplicate = 'duplicate',
  Create = 'create',
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadDataset: (name: string) => dispatch(getDataset(name)),
  publishDataset: (name: string) => dispatch(publishDataset(name)),
  editDataset: (name: string, config: DatasetConfig) => dispatch(editDataset(name, config)),
});

interface IAppStateProps {
  principal: RespUser | null;
  org: RespOrg | null;
  datasets: Record<string, P_Dataset> | null;
  datasetConfigs: Record<string, DatasetConfig> | null;
  subs: P_RespSubscription | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  principal: state.default.principal,
  org: state.default.org,
  datasets: state.default.datasets,
  datasetConfigs: state.default.datasetConfigs,
  subs: state.default.subs,
});

interface IOwnProps {
  title: string;
}
type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{
  datasetName: string;
}>;
interface IOwnStateProps {

}

class Datasets extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    document.title = this.props.title;
    this.props.loadDataset(this.props.match.params.datasetName);
  }

  componentWillUnmount(): void {
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>): void {
    if (this.props.org && !prevProps.org) {
      this.props.loadDataset(this.props.match.params.datasetName);
    }
  }

  publishDataset = (): void => {
    confirm({
      title: 'Do you want to publish this dataset?',
      icon: <SaveOutlined />,
      onOk: () => {
        this.props.publishDataset(this.props.match.params.datasetName);
      },
    });
  };

  debouncedOnDatasetConfigChangeHandler = debounce(
    (updatedDatasetConfig: DatasetConfig) => {
      this.props.editDataset(
        this.props.match.params.datasetName,
        updatedDatasetConfig,
      );
    },
    2000
  );

  onDatasetConfigChange = (updatedDatsetConfig: DatasetConfig): void => {
    this.debouncedOnDatasetConfigChangeHandler(updatedDatsetConfig);
  };

  render(): ReactElement {
    const currentDataset = (this.props.datasets || {})[this.props.match.params.datasetName];
    const currentConfig = (this.props.datasetConfigs || {})[this.props.match.params.datasetName];

    return (
      <GTags.ColCon className="tour-con">
        {(this.props.loadingState === 'loading' || currentDataset === null || !currentConfig) && <TopLoader
          duration={TOP_LOADER_DURATION}
          showLogo={false}
          showOverlay
        />}
        <SkipLink />
        <div style={{ height: '48px' }}>
          <Header
            tour={null}
            minimalHeader={false}
            showOnboardingGuides
            showCalendar
            principal={this.props.principal}
            org={this.props.org}
            leftElGroups={[]}
            navigateToWhenLogoIsClicked="/datasets"
            subs={this.props.subs}
            titleElOnLeft={(
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <GTags.Txt className="subsubhead overflow-ellipsis">Edit dataset</GTags.Txt>
                <GTags.Txt className="overflow-ellipsis" style={{ fontWeight: 500 }}>
                  {this.props.match.params.datasetName}
                </GTags.Txt>
              </div>
          )}
            rightElGroups={[(
              <div style={{ marginLeft: '0.25rem' }}>
                <Button
                  size="small"
                  style={{ color: '#fff' }}
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.publishDataset();
                  }}
                >
                  Publish
                </Button>
              </div>
            )]}
          />
        </div>
        {
          currentDataset && currentConfig && (
            <DatasetEditor
              dataset={currentConfig}
              onDatasetConfigChange={this.onDatasetConfigChange}
            />
          )
        }
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(Datasets));
