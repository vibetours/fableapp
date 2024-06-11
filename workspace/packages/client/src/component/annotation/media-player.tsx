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
import {
  TimeSpentInAnnotationPayload,
  VideoAnnotationSkippedPayload
} from '../../analytics/types';
import { convertUrlToBlobUrl, generateShadeColor } from './utils';
import MuteIcon from '../../assets/mute.png';
import UnmuteIcon from '../../assets/unmute.png';
import AudioVisualizer from '../audio-visualizer';
import { getColorContrast } from '../../utils';
import SoundWavePlaceholder from './sound-wave-placeholder';
import { FABLE_AUDIO_MEDIA_CONTROLS } from '../../constants';

interface IProps {
  borderRadius: string;
  conf: IAnnoationDisplayConfig;
  playMode: boolean,
  annFollowPositions: { top: number, left: number, dir: AnimEntryDir },
  width: number;
  height: number;
  tourId: number;
  navigateToAdjacentAnn: NavigateToAdjacentAnn;
  type: 'audio' | 'video';
}

interface IOwnStateProps {
  showControls: boolean;
  mediaState: 'paused' | 'playing' | 'ended';
  isMuted: boolean;
  firstTimeClick: boolean;
  showAudioVisualizer: boolean;
  blobUrls: null | { webm: string, mp4: string, type: 'video' } | { webm: string, type: 'audio' },
}

export default class AnnotationMedia extends React.PureComponent<IProps, IOwnStateProps> {
  private mediaRef: RefObject<HTMLVideoElement> = React.createRef();

  private hls: Hls | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showControls: false,
      mediaState: 'paused',
      isMuted: true,
      firstTimeClick: true,
      showAudioVisualizer: false,
      blobUrls: null,
    };
    if (Hls.isSupported() && this.props.playMode) {
      const config = this.props.conf.config;
      const hlsURl = this.props.type === 'audio' ? config.audio?.hls : config.videoUrlHls;
      if (hlsURl) {
        this.initPlayer(hlsURl);
      }
    }

    this.convertToBlob();
  }

  convertToBlob = async (): Promise<void> => {
    const config = this.props.conf.config;

    if (config.audio) {
      const webmUrl = config.audio.webm;
      const blobUrl = await convertUrlToBlobUrl(webmUrl);
      this.setState({ blobUrls: { type: 'audio', webm: webmUrl } });
      return;
    }

    const urls = [config.videoUrlWebm, config.videoUrlMp4];
    const [blobWebmUrl, blobMp4Url] = await Promise.all(urls.map(url => convertUrlToBlobUrl(url)));
    this.setState({ blobUrls: { type: 'video', webm: blobWebmUrl, mp4: blobMp4Url } });
  };

  private initPlayer(hlsUrl: string): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.hls = new Hls({
      enableWorker: false,
    });

    this.hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      this.hls!.loadSource(hlsUrl);

      this.hls!.on(Hls.Events.MANIFEST_PARSED, () => {
        this.mediaRef!.current!.setAttribute('data-playable', 'true');
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
            this.initPlayer(hlsUrl);
            break;
        }
      }
    });
  }

  componentDidMount(): void {
    this.setState(prev => ({ showAudioVisualizer: this.props.type === 'audio' && prev.mediaState === 'playing' }));
    if (!this.hls) {
      this.mediaRef!.current!.setAttribute('data-playable', 'true');
      return;
    }
    this.hls.attachMedia(this.mediaRef!.current!);
    this.setControlsBasedOnMediaState();
    if (this.props.conf.isMaximized && this.state.blobUrls) {
      this.playMedia();
    }
  }

  componentWillUnmount(): void {
    if (!this.hls) return;
    this.hls.destroy();
    this.hls = null;
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    let isMediaPlayed = false;
    if (prevProps.conf.isMaximized !== this.props.conf.isMaximized && this.props.conf.isMaximized) {
      this.setControlsBasedOnMediaState();

      if (this.state.blobUrls) {
        this.playMedia();
        isMediaPlayed = true;
      }
    }

    if (!isMediaPlayed && this.state.blobUrls && prevState.blobUrls !== this.state.blobUrls) {
      this.playMedia();
      isMediaPlayed = true;
    }

    if (
      this.props.type === 'audio'
      && !this.state.showAudioVisualizer
      && prevState.mediaState !== 'playing' && this.state.mediaState === 'playing'
    ) {
      this.setState({ showAudioVisualizer: true });
    }
  }

  playMedia = (): void => {
    if (this.props.conf.prerender) return;
    this.mediaRef.current!.play();
    this.mediaRef.current!.autoplay = false;
    if (this.props.playMode) this.mediaRef.current!.muted = false;
  };

  setControlsBasedOnMediaState = (): void => {
    if (this.mediaRef.current?.paused) {
      this.setState({ showControls: true, mediaState: 'paused' });
    } else {
      this.setState({ showControls: false, mediaState: 'playing' });
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
    const time_in_sec_played = Math.ceil(this.mediaRef.current!.currentTime);
    const videoAnnSkippedPayload: VideoAnnotationSkippedPayload = { tour_id, ann_id, time_in_sec_played };
    if (!this.mediaRef.current!.ended) {
      // logEvent(AnalyticsEvents.VIDEO_ANN_SKIPPED, videoAnnSkippedPayload);
    } else {
      const timeSpentOnAnnPayload: TimeSpentInAnnotationPayload = {
        tour_id,
        ann_id,
        time_in_sec: Math.ceil(this.mediaRef.current!.duration)
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

    this.mediaRef.current!.pause();
    this.mediaRef.current!.currentTime = 0;

    this.props.navigateToAdjacentAnn(direction, btnId);
  };

  render(): ReactElement {
    const config = this.props.conf.config;
    const hlsURl = this.props.type === 'audio' ? config.audio?.hls : config.videoUrlHls;
    const isHlsSupported = this.hls && hlsURl && this.props.playMode;

    return (
      <Tags.AnMediaContainer
        style={{
          ...this.getPositioningAndSizingStyles(),
          visibility: this.props.conf.isMaximized ? 'visible' : 'hidden',
          position: this.props.conf.isMaximized ? 'absolute' : 'fixed',
        }}
        onMouseOver={() => this.setState({ showControls: true })}
        onMouseOut={() => {
          if (this.state.mediaState === 'playing') {
            this.setState({ showControls: false });
          }
        }}
      >

        <Tags.MediaCon style={{ position: 'relative', display: 'flex' }}>
          {
            this.props.type === 'video' && (
              <Tags.AnVideo
                style={{ borderRadius: this.props.borderRadius }}
                // loop={this.state.firstTimeClick}
                // autoPlay
                muted={this.state.isMuted}
                ref={this.mediaRef}
                border={this.getAnnotationBorder()}
                id={`fable-ann-video-${config.refId}`}
                className="fable-video"
                playsInline
                onPause={() => this.setState({ mediaState: 'paused' })}
                onPlay={() => this.setState({ mediaState: 'playing' })}
                onEnded={() => this.setState({ showControls: true, mediaState: 'ended' })}
                onVolumeChange={() => this.setState({ isMuted: this.mediaRef.current?.muted || false })}
              >
                {!isHlsSupported && this.state.blobUrls?.type === 'video' && (
                <>
                  <source src={this.state.blobUrls.mp4} type="video/mp4" />
                  <source src={this.state.blobUrls.webm} type="video/webm" />
                  {/* {config.videoUrl && (<source src={config.videoUrlWebm} type="video/webm" />)} */}
                </>
                )}
              </Tags.AnVideo>
            )
          }

          {
            this.props.type === 'audio' && (
              <Tags.AnAudioCon
                style={{ borderRadius: this.props.borderRadius }}
                border={this.getAnnotationBorder()}
                id={`fable-ann-audio-${config.refId}`}
                className="fable-audio"
                bgColor={this.props.conf.opts.annotationBodyBackgroundColor}
              >
                <audio
                  ref={this.mediaRef}
                  onPause={() => this.setState({ mediaState: 'paused' })}
                  onPlay={() => this.setState({ mediaState: 'playing' })}
                  onEnded={() => this.setState({ showControls: true, mediaState: 'ended' })}
                  loop={this.state.firstTimeClick}
                  autoPlay
                  muted={this.state.isMuted}
                  crossOrigin="anonymous"
                  onVolumeChange={() => this.setState({ isMuted: this.mediaRef.current?.muted || false })}
                >
                  {!isHlsSupported && this.state.blobUrls?.type === 'audio' && (
                  <>
                    <source src={this.state.blobUrls.webm} type="audio/webm" />
                  </>
                  )}
                </audio>
                {this.state.showAudioVisualizer && (
                  <AudioVisualizer
                    audioElement={this.mediaRef.current!}
                    barWidth={1}
                    barColor={getColorContrast(this.props.conf.opts.annotationBodyBackgroundColor) === 'dark'
                      ? '#fff' : '#000'}
                  />
                )}

                {
                  (this.state.isMuted || this.state.mediaState !== 'playing') && (
                    <SoundWavePlaceholder bgColor={getColorContrast(
                      this.props.conf.opts.annotationBodyBackgroundColor
                    ) === 'dark'
                      ? '#fff' : '#000'}
                    />
                  )
                }
              </Tags.AnAudioCon>
            )
          }

          <Tags.AnMediaControls
            style={{ borderRadius: this.props.borderRadius }}
            showOverlay={this.state.showControls}
          >
            {!this.props.conf.prerender && (
            <>
              {this.state.mediaState !== 'ended' && (
                <Tags.AnMediaCtrlBtn
                  showButton={this.state.isMuted || this.state.showControls}
                  type="button"
                  onClick={() => {
                    if (this.state.firstTimeClick) {
                      this.mediaRef.current!.currentTime = 0;
                      this.mediaRef.current!.play();
                      this.setState({ firstTimeClick: false });
                    }
                    this.setState((prevState) => ({ ...prevState, isMuted: !prevState.isMuted }));
                  }}
                  className={FABLE_AUDIO_MEDIA_CONTROLS}
                >
                  {/* TODO: Change this icon */}
                  {this.state.isMuted ? <img src={MuteIcon} alt="mute" style={{ width: '46px', height: '46px' }} />
                    : <img src={UnmuteIcon} alt="unmute" style={{ width: '46px', height: '46px' }} />}
                </Tags.AnMediaCtrlBtn>
              )}
              {
                this.state.mediaState === 'ended' && (
                  <Tags.ReplayButton
                    pcolor={this.props.conf.opts.primaryColor}
                    type="button"
                    onClick={() => {
                      this.mediaRef.current!.play();
                    }}
                    className={FABLE_AUDIO_MEDIA_CONTROLS}
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
                        raiseDeferredError(new Error(`Custom button for ${this.props.type} is not implemented`));
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
          </Tags.AnMediaControls>
        </Tags.MediaCon>

      </Tags.AnMediaContainer>
    );
  }
}
