import React from 'react';
import { connect } from 'react-redux';
import { ReqTourPropUpdate, RespOrg, RespUser } from '@fable/common/dist/api-contract';
import { Link } from 'react-router-dom';
import { Button as AntButton } from 'antd';
import { EditOutlined, ShareAltOutlined, UndoOutlined } from '@ant-design/icons';
import { clearCurrentTourSelection, getCustomDomains, loadTourAndData, publishTour, updateTourProp } from '../../action/creator';
import { P_RespTour, P_RespVanityDomain } from '../../entity-processor';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import {
  DisplaySize,
  RESP_MOBILE_SRN_HEIGHT,
  RESP_MOBILE_SRN_WIDTH,
  getDimensionsBasedOnDisplaySize,
  isEventValid
} from '../../utils';
import * as Tags from './styled';
import BackgroundGradient from '../../component/publish-preview/bg-gradient';
import Header from '../../component/header';
import PublishOptions from '../../component/publish-preview/publish-options';
import Button from '../../component/button';
import { IFRAME_BASE_URL } from '../../constants';
import { SiteData } from '../../types';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  loadTourWithDataAndCorrespondingScreens: (rid: string) => void,
  publishTour: (tour: P_RespTour) => Promise<boolean>,
  clearCurrentTour: () => void;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  getVanityDomains: () => void;
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadTourWithDataAndCorrespondingScreens: (rid: string) => dispatch(loadTourAndData(rid, true, true)),
  publishTour: (tour) => dispatch(publishTour(tour)),
  clearCurrentTour: () => dispatch(clearCurrentTourSelection()),
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => dispatch(updateTourProp(rid, tourProp, value)),
  getVanityDomains: () => dispatch(getCustomDomains()),
});

interface IAppStateProps {
  tour: P_RespTour | null;
  org: RespOrg | null;
  principal: RespUser | null;
  isTourLoaded: boolean;
  vanityDomains: P_RespVanityDomain[] | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  tour: state.default.currentTour,
  principal: state.default.principal,
  isTourLoaded: state.default.tourLoaded,
  org: state.default.org,
  vanityDomains: state.default.vanityDomains,
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
  viewScale: number;
  minimalHeader: boolean;
}

class PublishPreview extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  private frameConRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      previewIframeKey: 0,
      showShareModal: false,
      viewScale: 1,
      minimalHeader: false
    };
  }

  receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation' }>): void => {
    if (isEventValid(e) && e.data.type === 'lastAnnotation') this.setState({ showReplayOverlay: true });
  };

  componentDidMount(): void {
    document.title = this.props.title;

    this.props.loadTourWithDataAndCorrespondingScreens(this.props.match.params.tourId);

    window.addEventListener('message', this.receiveMessage, false);

    this.showMinimalHeaderIfReq();

    this.props.getVanityDomains();
  }

  showMinimalHeaderIfReq(): void {
    const isMinimalHeader = this.props.searchParams.get('i');
    if (isMinimalHeader === '1') {
      this.setState({ minimalHeader: true });
    }
  }

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
    }

    if (prevProps.searchParams.get('i') !== this.props.searchParams.get('i')) {
      this.showMinimalHeaderIfReq();
    }

    if (this.props.searchParams.get('s') !== '3') {
      this.setState({ viewScale: 1 });
    } else {
      const timer = setTimeout(() => {
        const vpdW = RESP_MOBILE_SRN_WIDTH;
        const vpdH = RESP_MOBILE_SRN_HEIGHT;
        const headerHeight = 76;

        const frameConRect = this.frameConRef.current?.getBoundingClientRect();

        if (frameConRect && (frameConRect.width < vpdW || frameConRect.height < vpdH)) {
          const scaleX = frameConRect.width / vpdW;
          const scaleY = (frameConRect.height - headerHeight) / vpdH;
          const scale = Math.round(Math.min(scaleX, scaleY) * 100) / 100;

          this.setState({ viewScale: scale });
        }
        clearTimeout(timer);
      }, 50);
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

  private onSiteDataChange = (site: SiteData): void => {
    this.props.updateTourProp(this.props.tour!.rid, 'site', site);
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);
    return (
      <Tags.Con ref={this.frameConRef}>
        <BackgroundGradient />

        <Tags.HeaderCon>
          <Header
            org={this.props.org}
            userGuidesToShow={['Sharing or embedding your interactive demo']}
            showOnboardingGuides
            onLogoClicked={() => this.props.clearCurrentTour()}
            navigateToWhenLogoIsClicked="/tours"
            titleElOnLeft={<div style={{ display: 'flex', alignItems: 'center' }}>{this.props.tour?.displayName}</div>}
            rightElGroups={[(
              <Link to={`/demo/${this.props.tour?.rid}`} style={{ color: 'black' }}>
                <AntButton
                  size="small"
                  className="edit-btn"
                  type="default"
                >
                  Edit demo
                </AntButton>
              </Link>
            )]}
            principal={this.props.principal}
            tour={this.props.tour}
            publishOptions={<PublishOptions
              showShareModal={this.state.showShareModal}
              setShowShareModal={(showShareModal: boolean) => this.setState({ showShareModal })}
              handleReplayClick={this.handleReplayClick}
              publishTour={this.props.publishTour}
              tour={this.props.tour}
              selectedDisplaySize={+displaySize}
              setSelectedDisplaySize={(selectedDisplaySize: DisplaySize) => this.updateDisplaySize(selectedDisplaySize)}
              onSiteDataChange={this.onSiteDataChange}
              minimalHeader={this.state.minimalHeader}
              vanityDomains={this.props.vanityDomains}
            />}
            tourOpts={null}
            onSiteDataChange={this.onSiteDataChange}
            showCalendar
            minimalHeader={this.state.minimalHeader}
            vanityDomains={this.props.vanityDomains}
          />
        </Tags.HeaderCon>

        <Tags.PreviewFrameWrapper
          showOverlay={this.state.showReplayOverlay}
          style={{ transform: `scale(${this.state.viewScale})` }}
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
                style={{ background: '#7ceaf3' }}
              >
                Edit
              </Button>

              {
                !this.state.minimalHeader && (
                <Button
                  intent="primary"
                  icon={<ShareAltOutlined />}
                  iconPlacement="left"
                  onClick={() => this.setState({ showShareModal: true })}
                >
                  Share
                </Button>
                )
              }
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
              src={`${baseURL}/${IFRAME_BASE_URL}/demo/${this.props.tour?.rid}?staging=true`}
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
