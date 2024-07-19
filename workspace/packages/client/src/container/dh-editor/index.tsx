import React from 'react';
import { connect } from 'react-redux';
import { LoadingStatus } from '@fable/common/dist/types';
import { RespCommonConfig, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TState } from '../../reducer';
import Editor from '../../component/demo-hub-editor';
import { getAllTours, getTourData, loadDemoHubAndData, loadDemoHubConfig, publishDemoHub, updateDemoHubConfigData, updateDemoHubProp } from '../../action/creator';
import { IDemoHubConfig, P_RespDemoHub } from '../../types';
import { debounce, getFirstDemoOfDemoHub } from '../../utils';
import { getDefaultThumbnailHash, P_RespTour } from '../../entity-processor';
import FullPageTopLoader from '../../component/loader/full-page-top-loader';

interface IDispatchProps {
  getAllTours: () => void;
  loadDemoHubAndData: typeof loadDemoHubAndData;
  updateDemoHubConfig: typeof updateDemoHubConfigData;
  publishDemoHub: (demoHub: P_RespDemoHub) => Promise<boolean>,
  loadDemoHubConfig: (demoHub: P_RespDemoHub) => Promise<IDemoHubConfig>,
  updateDemoHubProp: typeof updateDemoHubProp;
  getTourData : (tourRid : string) => Promise<P_RespTour>,
  getUpdatedAllTours : () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  getAllTours: () => dispatch(getAllTours(false)),
  loadDemoHubAndData: (rid) => dispatch(loadDemoHubAndData(rid)),
  updateDemoHubConfig: (rid, updatedDemoHubConfig) => dispatch(updateDemoHubConfigData(rid, updatedDemoHubConfig)),
  publishDemoHub: (demoHub) => dispatch(publishDemoHub(demoHub)),
  loadDemoHubConfig: (demoHub) => dispatch(loadDemoHubConfig(demoHub)),
  updateDemoHubProp: (rid, prop, value) => dispatch(updateDemoHubProp(rid, prop, value)),
  getTourData: (tourRid) => dispatch(getTourData(tourRid)),
  getUpdatedAllTours: () => dispatch(getAllTours(false, true)),
});

interface IAppStateProps {
  tours: P_RespTour[];
  allToursLoadingStatus: LoadingStatus;
  data: P_RespDemoHub | null;
  config: IDemoHubConfig | null;
  org: RespOrg | null;
  principal: RespUser | null;
  cConfig: RespCommonConfig;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  data: state.default.currentDemoHub,
  config: state.default.currentDemoHubConfig,
  tours: state.default.tours,
  allToursLoadingStatus: state.default.allToursLoadingStatus,
  org: state.default.org,
  principal: state.default.principal,
  cConfig: state.default.commonConfig!,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    demoHubRid: string;
    pageType?: string;
    qualification?: string;
  }>;

type IOwnStateProps = {
}

class DemoHubEditor extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount(): void {
    document.title = this.props.title;
    this.props.loadDemoHubAndData(this.props.match.params.demoHubRid);
    this.props.getAllTours();
  }

  debouncedOnDemoHubConfigChangeHandler = debounce(
    (updatedDemoHubConfig) => {
      this.props.updateDemoHubConfig(this.props.match.params.demoHubRid, updatedDemoHubConfig);
      const firstDemoOfDemoHub = getFirstDemoOfDemoHub(updatedDemoHubConfig);
      const currentThumbnailHash = this.props.data!.info.thumbnail;

      if (firstDemoOfDemoHub) {
        const firstDemoHash = firstDemoOfDemoHub.thumbnail.split(this.props.cConfig.commonAssetPath)[1];
        if (currentThumbnailHash !== firstDemoHash) {
          this.props.updateDemoHubProp(this.props.data!.rid, 'info', { thumbnail: firstDemoHash });
        }
      } else if (currentThumbnailHash !== getDefaultThumbnailHash()) {
        this.props.updateDemoHubProp(this.props.data!.rid, 'info', { thumbnail: getDefaultThumbnailHash() });
      }
    },
    2000
  );

  onDemoHubConfigChange = (updatedDemoHubConfig: IDemoHubConfig): void => {
    this.debouncedOnDemoHubConfigChangeHandler(updatedDemoHubConfig);
  };

  isDemoHubLoadingComplete = (): boolean => {
    if (!this.props.config) return false;
    if (!this.props.data) return false;
    if (this.props.allToursLoadingStatus !== LoadingStatus.Done) return false;
    return true;
  };

  render(): JSX.Element {
    if (!this.isDemoHubLoadingComplete()) {
      return (
        <div>
          <FullPageTopLoader showLogo text="Loading demo" />
        </div>
      );
    }

    return (
      <Editor
        updateDemoHubProp={this.props.updateDemoHubProp}
        data={this.props.data!}
        config={this.props.config!}
        onConfigChange={this.onDemoHubConfigChange}
        tours={this.props.tours}
        org={this.props.org}
        principal={this.props.principal}
        publishDemoHub={this.props.publishDemoHub}
        loadDemoHubConfig={this.props.loadDemoHubConfig}
        getTourData={this.props.getTourData}
        getUpdatedAllTours={this.props.getUpdatedAllTours}
      />
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(DemoHubEditor));
