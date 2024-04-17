import React from 'react';
import { connect } from 'react-redux';
import { UndoOutlined } from '@ant-design/icons';
import Header from '../../component/preview-for-cta/header';
import { loadTourAndData } from '../../action/creator';
import { TState } from '../../reducer';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { getDimensionsBasedOnDisplaySize } from '../../utils';
import * as Tags from './styled';
import Button from '../../component/button';
import { HEADER_CTA, IFRAME_BASE_URL } from '../../constants';
import { SiteData } from '../../types';
import { CtaFrom } from '../../analytics/types';
import { P_RespTour } from '../../entity-processor';

const baseURL = process.env.REACT_APP_CLIENT_ENDPOINT as string;

interface IDispatchProps {
  loadPublishedTour: (rid: string,
    onComplete: (ts: number) => void
    ) => void,
}

const mapDispatchToProps = (dispatch: any): IDispatchProps => ({
  loadPublishedTour: (
    rid: string,
    onComplete: (ts: number) => void
  ) => dispatch(loadTourAndData(rid, false, true, true, null, true)).then(onComplete),
});

interface IAppStateProps {
  site: SiteData | null;
  tour: P_RespTour | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  site: state.default.currentTour ? state.default.currentTour.site : null,
  tour: state.default.currentTour || null,
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
  ts: null | number;
  iframeUrl: string;
}

class PreviewForCTA extends React.PureComponent<IProps, IOwnStateProps> {
  private previewFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  constructor(props: IProps) {
    super(props);
    this.state = {
      showReplayOverlay: false,
      previewIframeKey: 0,
      ts: null,
      iframeUrl: ''
    };
  }

  receiveMessage = (e: MessageEvent<{ type: 'lastAnnotation' }>): void => {
    if (e.data.type === 'lastAnnotation') this.setState({ showReplayOverlay: true });
  };

  componentDidMount(): void {
    document.title = this.props.title;

    this.props.loadPublishedTour(this.props.match.params.tourId, (ts: number) => {
      this.setState({ ts });
    });

    window.addEventListener('message', this.receiveMessage, false);
  }

  componentDidUpdate(prevProps: IProps, prevState: IOwnStateProps): void {
    if (prevProps.searchParams.get('s') !== this.props.searchParams.get('s')) {
      this.setState({ previewIframeKey: Math.random(), showReplayOverlay: false });
    }

    if (this.state.ts !== prevState.ts && this.state.ts) {
      const loc = window.location.toString();
      const allParams = loc.split('?')[1];
      const baseIframeUrl = `${baseURL}/${IFRAME_BASE_URL}/demo/${this.props.match.params.tourId}`;
      this.setState((prevS) => ({
        iframeUrl: allParams && allParams.length !== 0 ? `${baseIframeUrl}?_ts=${prevS.ts}&${allParams}`
          : `${baseIframeUrl}?_ts=${prevS.ts}`
      }));
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);
  }

  handleReplayClick = (): void => {
    this.setState({ showReplayOverlay: false, previewIframeKey: Math.random() });
  };

  captureConversion = (): void => {
    if (this.props.site) {
      const frame = document.getElementById('preview-frame') as HTMLIFrameElement;
      frame.contentWindow?.postMessage({
        ctaFrom: CtaFrom.Header,
        btnId: '$header_cta',
        url: this.props.site.ctaLink,
        btnTxt: this.props.site.ctaText,
        tourId: this.props.tour!.id,
        annId: '$header',
        type: HEADER_CTA
      }, '*');
    }
  };

  render(): JSX.Element {
    const displaySize = this.props.searchParams.get('s') || '0';
    const { height, width } = getDimensionsBasedOnDisplaySize(+displaySize);

    return (
      <>
        {this.props.site && (
        <Tags.Con siteData={this.props.site}>
          <Tags.HeaderCon>
            <Header
              site={this.props.site}
              captureConversion={this.captureConversion}
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
            </div>
            )}
            <iframe
              key={this.state.previewIframeKey}
              ref={this.previewFrameRef}
              id="preview-frame"
              height={height}
              width={width}
              className="preview-frame"
              src={this.state.iframeUrl}
              title={this.props.title}
            />
          </Tags.PreviewFrameWrapper>
        </Tags.Con>
        )}
      </>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PreviewForCTA));
