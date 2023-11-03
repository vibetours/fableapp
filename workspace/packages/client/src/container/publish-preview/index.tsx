import React from 'react';
import { connect } from 'react-redux';
import { RespUser } from '@fable/common/dist/api-contract';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import { ArrowLeftOutlined, EditOutlined, ShareAltOutlined, UndoOutlined } from '@ant-design/icons';
import { clearCurrentTourSelection, loadTourAndData, publishTour } from '../../action/creator';
import { P_RespSubscription, P_RespTour } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { DisplaySize, getDimensionsBasedOnDisplaySize } from '../../utils';
import * as Tags from './styled';
import BackgroundGradient from '../../component/publish-preview/bg-gradient';
import Header from '../../component/header';
import PublishOptions from '../../component/publish-preview/publish-options';
import Button from '../../component/button';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  clearCurrentTour: () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true, true)),
  publishTour: (tour) => dispatch(publishTour(tour)),
  clearCurrentTour: () => dispatch(clearCurrentTourSelection())
});

interface IAppStateProps {
  tour: P_RespTour | null;
  principal: RespUser | null;
  isTourLoaded: boolean;
  subs: P_RespSubscription | null;
  manifestPath: string;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  principal: state.default.principal,
  isTourLoaded: state.default.tourLoaded,
  subs: state.default.subs,
  manifestPath: (state.default.commonConfig && state.default.currentTour)
    ? `${state.default.commonConfig.pubTourAssetPath + state.default.currentTour.rid}/${state.default.commonConfig.manifestFileName}`
    : '',
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{ tourId: string }>;

interface IOwnStateProps {
  showReplayOverlay: boolean;
  previewIframeKey: number;
  showShareModal: boolean;
}

class PublishPreview extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      previewIframeKey: 0,
      showShareModal: false,
    };
  }

  receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation' }>): void => {
    if (e.data.type === 'lastAnnotation') this.setState({ showReplayOverlay: true });
  };

  componentDidMount(): void {
    document.title = this.props.title;

    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);

    window.addEventListener('message', this.receiveMessage, false);
  }

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);
  }

  updateDisplaySize = (displaySize: DisplaySize): void => {
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    url.searchParams.set('s', displaySize.toString());
    const updatedUrl = url.pathname + url.search;
    this.props.navigate(updatedUrl);
  };

  handleReplayClick = (): void => {
    this.setState({ showReplayOverlay: false, previewIframeKey: Math.random() });
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);
    return (
      <Tags.Con>
        <BackgroundGradient />

        <Tags.HeaderCon>
          <Header
            manifestPath={this.props.manifestPath}
            onLogoClicked={() => this.props.clearCurrentTour()}
            navigateToWhenLogoIsClicked="/tours"
            subs={this.props.subs}
            titleElOnLeft={<div style={{ display: 'flex', alignItems: 'center' }}>{this.props.tour?.displayName}</div>}
            leftElGroups={[(
              <Tooltip title="Go to Canvas" overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
                <Link to={`/demo/${this.props.tour?.rid}`} style={{ color: 'white' }}>
                  <ArrowLeftOutlined className="left-arrow" />
                </Link>
              </Tooltip>
            )]}
            principal={this.props.principal}
            tour={this.props.tour}
            publishOptions={<PublishOptions
              manifestPath={this.props.manifestPath}
              showShareModal={this.state.showShareModal}
              setShowShareModal={(showShareModal: boolean) => this.setState({ showShareModal })}
              handleReplayClick={this.handleReplayClick}
              publishTour={this.props.publishTour}
              tour={this.props.tour}
              selectedDisplaySize={+displaySize}
              setSelectedDisplaySize={(selectedDisplaySize: DisplaySize) => this.updateDisplaySize(selectedDisplaySize)}
            />}
          />
        </Tags.HeaderCon>

        <Tags.PreviewFrameWrapper
          showOverlay={this.state.showReplayOverlay}
        >
          {this.state.showReplayOverlay && (
            <div className="replay-overlay" style={{ height, width }}>
              <Button intent="secondary" icon={<UndoOutlined />} iconPlacement="left" onClick={this.handleReplayClick}>
                Replay
              </Button>

              <Button
                intent="secondary"
                icon={<EditOutlined />}
                iconPlacement="left"
                onClick={() => this.props.navigate(`/demo/${this.props.tour?.rid}`)}
              >
                Edit
              </Button>

              <Button
                intent="primary"
                icon={<ShareAltOutlined />}
                iconPlacement="left"
                onClick={() => this.setState({ showShareModal: true })}
              >
                Share
              </Button>
            </div>
          )}

          {this.props.isTourLoaded && (
            <iframe
              key={this.state.previewIframeKey}
              ref={this.previewFrameRef}
              id="preview-frame"
              height={height}
              width={width}
              className="preview-frame"
              src={`${baseURL}/p/demo/${this.props.tour?.rid}?staging=true`}
              title="hello"
            />
          )}
        </Tags.PreviewFrameWrapper>
      </Tags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PublishPreview));
