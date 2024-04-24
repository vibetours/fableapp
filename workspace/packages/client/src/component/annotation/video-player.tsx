import React, { RefObject, ReactElement } from 'react';
import Hls from 'hls.js';
import { VideoAnnotationPositions } from '@fable/common/dist/types';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import * as Tags from './styled';
import { AnimEntryDir, IAnnoationDisplayConfig, NavigateToAdjacentAnn } from '.';
import { isCoverAnnotation } from './annotation-config-utils';
import { logEvent } from '../../analytics/utils';
import {
  AnalyticsEvents,
  AnnotationBtnClickedPayload,
  TimeSpentInAnnotationPayload,
  VideoAnnotationSkippedPayload
} from '../../analytics/types';
import { generateShadeColor } from './utils';
import MuteIcon from '../../assets/mute.png';
import UnmuteIcon from '../../assets/unmute.png';

interface IProps {
  borderRadius: string;
  conf: IAnnoationDisplayConfig;
  playMode: boolean,
  annFollowPositions: { top: number, left: number, dir: AnimEntryDir },
  width: number;
  height: number;
  tourId: number;
  navigateToAdjacentAnn: NavigateToAdjacentAnn;
}

interface IOwnStateProps {
  showControls: boolean;
  videoState: 'paused' | 'playing' | 'ended';
  isMuted: boolean;
  firstTimeClick: boolean;
}

export default class AnnotationVideo extends React.PureComponent<IProps, IOwnStateProps> {
  private videoRef: RefObject<HTMLVideoElement> = React.createRef();

  private hls: Hls | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showControls: false,
      videoState: 'paused',
      isMuted: true,
      firstTimeClick: true
    };
    if (Hls.isSupported() && this.props.playMode && this.props.conf.config.videoUrlHls) {
      this.initPlayer();
    }
  }

  private initPlayer(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.hls = new Hls({
      enableWorker: false,
    });

    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      this.hls!.loadSource(this.props.conf.config.videoUrlHls);

      this.hls!.on(Hls.Events.MANIFEST_PARSED, () => {
        this.videoRef!.current!.setAttribute('data-playable', 'true');
      });
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            this.hls!.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            this.hls!.recoverMediaError();
            break;
          default:
            this.initPlayer();
            break;
        }
      }
    });
  }

  componentDidMount(): void {
    if (!this.hls) {
      this.videoRef!.current!.setAttribute('data-playable', 'true');
      return;
    }
    this.hls.attachMedia(this.videoRef!.current!);
    this.setControlsBasedOnVideoState();
  }

  componentWillUnmount(): void {
    if (!this.hls) return;
    this.hls.destroy();
    this.hls = null;
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    if (prevProps.conf.isMaximized !== this.props.conf.isMaximized && this.props.conf.isMaximized) {
      this.setControlsBasedOnVideoState();
    }
  }

  setControlsBasedOnVideoState = (): void => {
    if (this.videoRef.current?.paused) {
      this.setState({ showControls: true, videoState: 'paused' });
    } else {
      this.setState({ showControls: false, videoState: 'playing' });
    }
  };

  getAnnotationBorder(): string {
    const borderColor = this.props.conf.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}`;
  }

  logStepEvent = (direction: 'next' | 'prev'): void => {
    const ann_id = this.props.conf.config.refId;
    const tour_id = this.props.tourId;
    const time_in_sec_played = Math.ceil(this.videoRef.current!.currentTime);
    const videoAnnSkippedPayload: VideoAnnotationSkippedPayload = { tour_id, ann_id, time_in_sec_played };
    if (!this.videoRef.current!.ended) {
      // logEvent(AnalyticsEvents.VIDEO_ANN_SKIPPED, videoAnnSkippedPayload);
    } else {
      const timeSpentOnAnnPayload: TimeSpentInAnnotationPayload = {
        tour_id,
        ann_id,
        time_in_sec: Math.ceil(this.videoRef.current!.duration)
      };

      // logEvent(AnalyticsEvents.TIME_SPENT_IN_ANN, timeSpentOnAnnPayload);
    }
  };

  getPositioningAndSizingStyles(): Record<string, string> {
    const position = this.props.conf.config.positioning;
    const isCover = isCoverAnnotation(this.props.conf.config.id);
    const offsetPosition = '20px';

    let styles: Record<string, string> = {};
    switch (position) {
      case VideoAnnotationPositions.BottomRight:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.BottomLeft:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.Center:
        styles = { ...styles,
          top: `${this.props.annFollowPositions.top}px`,
          left: `${this.props.annFollowPositions.left}px`
        };
        break;
      case VideoAnnotationPositions.Follow:
      default: {
        if (isCover) {
          styles = { ...styles,
            top: `${this.props.annFollowPositions.top}px`,
            left: `${this.props.annFollowPositions.left}px`
          };
        } else {
          styles = {
            ...styles,
            top: `${this.props.annFollowPositions.top}px`,
            left: `${this.props.annFollowPositions.left}px`,
          };
          const annDir = this.props.annFollowPositions.dir;
          styles.display = 'flex';
          if (annDir === 't') {
            styles.alignItems = 'end';
          } else if (annDir === 'b') {
            styles.alignItems = 'start';
          } else {
            styles.alignItems = 'center';
          }
        }
        break;
      }
    }
    return {
      ...styles,
      width: `${this.props.width}px`,
      height: `${this.props.height}px`,
    };
  }

  navigateAnns = (direction: 'prev' | 'next', btnId: string): void => {
    this.logStepEvent(direction);

    this.videoRef.current!.pause();
    this.videoRef.current!.currentTime = 0;

    this.props.navigateToAdjacentAnn(direction, btnId);
  };

  render(): ReactElement {
    const config = this.props.conf.config;
    const isHlsSupported = this.hls && config.videoUrlHls && this.props.playMode;

    return (
      <Tags.AnVideoContainer
        style={{
          ...this.getPositioningAndSizingStyles(),
          visibility: this.props.conf.isMaximized ? 'visible' : 'hidden',
          position: this.props.conf.isMaximized ? 'absolute' : 'fixed',
        }}
        onMouseOver={() => this.setState({ showControls: true })}
        onMouseOut={() => {
          if (this.state.videoState === 'playing') {
            this.setState({ showControls: false });
          }
        }}
      >

        <div style={{ position: 'relative', display: 'flex' }}>
          <Tags.AnVideo
            style={{ borderRadius: this.props.borderRadius }}
            loop={this.state.firstTimeClick}
            autoPlay
            muted={this.state.isMuted}
            ref={this.videoRef}
            border={this.getAnnotationBorder()}
            id={`fable-ann-video-${config.refId}`}
            className="fable-video"
            playsInline
            onPause={() => this.setState({ videoState: 'paused' })}
            onPlay={() => this.setState({ videoState: 'playing' })}
            onEnded={() => this.setState({ showControls: true, videoState: 'ended' })}
          >
            {!isHlsSupported && (
            <>
              <source src={config.videoUrlMp4} type="video/mp4" />
              <source src={config.videoUrlWebm} type="video/webm" />
              {config.videoUrl && (<source src={config.videoUrlWebm} type="video/webm" />)}
            </>
            )}
          </Tags.AnVideo>

          <Tags.AnVideoControls
            style={{ borderRadius: this.props.borderRadius }}
            showOverlay={this.state.showControls}
          >
            {!this.props.conf.prerender && (
            <>
              {this.state.videoState !== 'ended' && (
                <Tags.AnVideoCtrlBtn
                  showButton={this.state.isMuted || this.state.showControls}
                  type="button"
                  onClick={() => {
                    if (this.state.firstTimeClick) {
                      this.videoRef.current!.currentTime = 0;
                      this.videoRef.current!.play();
                      this.setState({ firstTimeClick: false });
                    }
                    this.setState((prevState) => ({ ...prevState, isMuted: !prevState.isMuted }));
                  }}
                >
                  {/* TODO: Change this icon */}
                  {this.state.isMuted ? <img src={MuteIcon} alt="mute" style={{ width: '46px', height: '46px' }} />
                    : <img src={UnmuteIcon} alt="unmute" style={{ width: '46px', height: '46px' }} />}
                </Tags.AnVideoCtrlBtn>
              )}
              {
                this.state.videoState === 'ended' && (
                  <Tags.ReplayButton
                    pcolor={this.props.conf.opts.primaryColor}
                    type="button"
                    onClick={() => this.videoRef.current!.play()}
                  >
                    <ReloadOutlined />
                  </Tags.ReplayButton>
                )
              }
              { this.state.showControls
              && (
              <Tags.NavButtonCon
                pcolor={this.props.conf.opts.primaryColor}
              >
                {this.props.conf.config.buttons.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                  <Tags.ABtn
                    style={{
                      border: btnConf.type === 'prev' ? 'none' : '',
                      background: btnConf.type === 'prev' ? '#00000040' : ''
                    }}
                    bg={generateShadeColor(this.props.conf.opts.primaryColor,)}
                    idx={idx}
                    key={btnConf.id}
                    btnStyle={btnConf.style}
                    color={this.props.conf.opts.primaryColor}
                    size={btnConf.size}
                    fontFamily={this.props.conf.opts.annotationFontFamily}
                    btnLayout="default"
                    borderRadius={this.props.conf.opts.borderRadius}
                    onClick={() => {
                      if (btnConf.type === 'next') {
                        this.navigateAnns('next', btnConf.id);
                      } else if (btnConf.type === 'prev') {
                        this.navigateAnns('prev', btnConf.id);
                      } else {
                        raiseDeferredError(new Error('Custom button for video is not implemented'));
                      }
                    }}
                  >
                    { btnConf.type === 'next' ? btnConf.text : <ArrowLeftOutlined />}
                  </Tags.ABtn>
                ))}
              </Tags.NavButtonCon>
              )}
            </>
            )}
          </Tags.AnVideoControls>
        </div>

      </Tags.AnVideoContainer>
    );
  }
}
