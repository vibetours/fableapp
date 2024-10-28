import React, { RefObject, ReactElement } from 'react';
import Hls from 'hls.js';
import { VideoAnnotationPositions } from '@fable/common/dist/types';
import {
  ArrowLeftOutlined,
  PauseCircleFilled,
  PlayCircleFilled,
  ReloadOutlined,
} from '@ant-design/icons';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import * as Tags from './styled';
import { AnimEntryDir, IAnnoationDisplayConfig, NavigateToAdjacentAnn, VoiceoverMediaState } from '.';
import { isCoverAnnotation } from './annotation-config-utils';
import {
  TimeSpentInAnnotationPayload,
  VideoAnnotationSkippedPayload
} from '../../analytics/types';
import { convertUrlToBlobUrl, generateShadeColor } from './utils';
import AudioVisualizer from '../audio-visualizer';
import { getColorContrast, isSafari } from '../../utils';
import SoundWavePlaceholder from './sound-wave-placeholder';
import { FABLE_AUDIO_MEDIA_CONTROLS } from '../../constants';
import { getAnnotationBtn } from './ops';
import * as GTags from '../../common-styled';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { emitEvent } from '../../internal-events';
import { InternalEvents, VoiceoverMediaStateChangePayload } from '../../types';

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
  voiceoverMediaState: VoiceoverMediaState;
  updatePlayMedia: () => void;
  win: Window;
  doNotAutoplayMedia: string[];
}

interface IOwnStateProps {
  showControls: boolean;
  mediaState: 'none' | 'paused' | 'playing' | 'ended';
  showAudioVisualizer: boolean;
  blobUrls: null | { webm: string, mp4: string, type: 'video' } | { webm: string, type: 'audio' },
  mediaLoaded: boolean;
  mediaProgress: number;
  showBtnOverlay: boolean;
}

export default class AnnotationMedia extends React.PureComponent<IProps, IOwnStateProps> {
  private mediaRef: RefObject<HTMLVideoElement> = React.createRef();

  private hls: Hls | null = null;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showControls: false,
      showAudioVisualizer: false,
      blobUrls: null,
      mediaLoaded: false,
      mediaProgress: 0,
      mediaState: 'none',
      showBtnOverlay: false,
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
      this.setState({ blobUrls: { type: 'audio', webm: blobUrl } });
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
    if (!isSafari()) {
      this.setState(prev => ({ showAudioVisualizer: this.props.type === 'audio'
        && (prev.mediaState === 'playing') }));
    }

    if (!this.props.playMode) {
      this.setState({ mediaState: 'paused', showControls: true });
    }

    if (!this.hls) {
      this.mediaRef!.current!.setAttribute('data-playable', 'true');
      return;
    }
    this.hls.attachMedia(this.mediaRef!.current!);
    if (this.shouldAutoplayVideo()) {
      this.playMediaFromStart();
    }
  }

  componentWillUnmount(): void {
    if (!this.hls) return;
    this.hls.destroy();
    this.hls = null;
  }

  shouldAutoplayVideo = (): boolean => {
    const displayConf = this.props.conf;
    return displayConf.isMaximized && !displayConf.prerender && this.props.playMode && !!this.state.blobUrls;
  };

  handleAutoplayMedia = (): boolean => {
    if (this.shouldAutoplayVideo()) {
      this.setState({ showBtnOverlay: false });
      this.playMediaFromStart();
      this.props.updatePlayMedia();
      return true;
    }
    return false;
  };

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IOwnStateProps>, snapshot?: any): void {
    let isMediaPlayed = false;
    if (this.props.conf.isMaximized && prevProps.conf.isMaximized !== this.props.conf.isMaximized
      && (!this.props.conf.config.voiceover
        || (this.props.conf.config.voiceover && !this.props.doNotAutoplayMedia.includes(this.props.conf.config.refId)))) {
      isMediaPlayed = this.handleAutoplayMedia();
    }

    // In case of voiceover we control the annotation play/pause with message passing
    if (this.props.conf.isMaximized && this.props.voiceoverMediaState !== prevProps.voiceoverMediaState
      && this.props.voiceoverMediaState !== 'none' && this.props.conf.config.voiceover
    ) {
      if (this.props.voiceoverMediaState === 'replay-ann') {
        isMediaPlayed = this.handleAutoplayMedia();
      } else if (this.props.voiceoverMediaState === 'play-pause') {
        if (prevState.mediaState === 'playing') {
          this.mediaRef.current!.pause();
        } else if (prevState.mediaState === 'paused') {
          this.playMedia();
        }
        this.props.updatePlayMedia();
      }
    }

    if (!isMediaPlayed && prevState.blobUrls !== this.state.blobUrls && this.shouldAutoplayVideo()) {
      this.playMediaFromStart();
      isMediaPlayed = true;
    }

    if (
      this.props.type === 'audio'
      && !this.state.showAudioVisualizer
      && prevState.mediaState !== this.state.mediaState
      && (this.state.mediaState === 'playing')
      && !isSafari()
    ) {
      this.setState({ showAudioVisualizer: true });
    }

    if (this.state.mediaState !== prevState.mediaState && this.props.conf.config.voiceover) {
      const mediaState = this.state.showBtnOverlay
        ? 'overlay' : this.state.mediaState;
      emitEvent<Partial<VoiceoverMediaStateChangePayload>>(InternalEvents.VoiceoverMediaStateChange, {
        mediaState,
        annRefId: this.props.conf.config.refId
      });
    }
  }

  playMediaFromStart = (): void => {
    this.mediaRef.current!.currentTime = 0;
    this.playMedia();
  };

  playMedia = (): void => {
    if (this.props.conf.prerender) return;
    this.mediaRef.current!
      .play()
      .then(() => {
        this.onMediaPlay();
      }).catch((e) => {
        this.onMediaPause();
      });
  };

  getAnnotationBorder(): string {
    const borderColor = this.props.conf.opts.annotationBodyBorderColor._val;
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

  onMediaEnded = (): void => {
    if (this.props.conf.prerender) return;
    this.setState({ mediaState: 'none', showControls: false });
    const timeoutId = setTimeout(() => {
      this.setState({ showControls: true, mediaState: 'ended' });
      clearTimeout(timeoutId);
    }, 1500);

    if (this.props.playMode) {
      if (this.props.conf.config.voiceover && this.props.conf.config.buttons.length > 2) {
        this.setState({ showBtnOverlay: true });
        return;
      }
      const btnConf = getAnnotationBtn(this.props.conf.config, 'next');
      this.navigateAnns('next', btnConf.id);
    }
  };

  onMediaPlay = (): void => {
    this.setState({ mediaState: 'playing', showControls: false });
  };

  onMediaPause = (): void => {
    if (this.mediaRef.current!.ended) return;
    this.setState({ mediaState: 'paused', showControls: true });
  };

  updateMediaProgress = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement, Event>): void => {
    const currentTime = e.currentTarget.currentTime;
    const duration = e.currentTarget.duration;
    const progress = (currentTime / duration) * 100;
    this.setState({ mediaProgress: progress });
  };

  render(): ReactElement {
    const config = this.props.conf.config;
    const hlsURl = this.props.type === 'audio' ? config.audio?.hls : config.videoUrlHls;
    const isHlsSupported = this.hls && hlsURl && this.props.playMode;
    const padding: number[] = this.props.conf.opts.annotationPadding._val.split(/\s+/).map(v => (Number.isFinite(+v) ? +v : 14));
    if (padding.length === 1) padding.push(padding[0]);
    if (padding.length === 0) padding.push(14, 14);

    return (
      <>
        <Tags.AnMediaContainer
          style={{
            ...this.getPositioningAndSizingStyles(),
            visibility: this.props.conf.isMaximized && !(
              this.props.conf.config.voiceover && this.props.playMode)
              ? 'visible' : 'hidden',
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
                ref={this.mediaRef}
                border={this.getAnnotationBorder()}
                id={`fable-ann-video-${config.refId}`}
                className="fable-video"
                playsInline
                onPause={() => this.onMediaPause()}
                onPlay={() => this.onMediaPlay()}
                onEnded={() => this.onMediaEnded()}
                preload="metadata"
                onLoadedData={() => this.setState({ mediaLoaded: true })}
                onTimeUpdate={(e) => this.updateMediaProgress(e)}
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
                bgColor={this.props.conf.opts.annotationBodyBackgroundColor._val}
              >
                <audio
                  ref={this.mediaRef}
                  onPause={() => this.onMediaPause()}
                  onPlay={() => this.onMediaPlay()}
                  onEnded={() => this.onMediaEnded()}
                  crossOrigin="anonymous"
                  preload="metadata"
                  onLoadedData={() => this.setState({ mediaLoaded: true })}
                  onTimeUpdate={(e) => this.updateMediaProgress(e)}
                >
                  {!isHlsSupported && this.state.blobUrls?.type === 'audio' && (
                  <>
                    <source src={this.state.blobUrls.webm} type="audio/webm" />
                    <source src={config.audio!.fb.url} type={config.audio!.fb.type} />
                  </>
                  )}
                </audio>
                {this.state.showAudioVisualizer && (
                  <AudioVisualizer
                    audioElement={this.mediaRef.current!}
                    barWidth={1}
                    barColor={getColorContrast(this.props.conf.opts.annotationBodyBackgroundColor._val) === 'dark'
                      ? '#fff' : '#000'}
                  />
                )}

                {
                  !this.state.showAudioVisualizer && this.state.mediaLoaded && (
                  <SoundWavePlaceholder bgColor={getColorContrast(
                    this.props.conf.opts.annotationBodyBackgroundColor._val
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
              showOverlay={this.state.showControls || !this.state.mediaLoaded}
            >
              {!this.props.conf.prerender && this.state.mediaLoaded && (
              <>
                <Tags.AnMediaCtrlBtnsCon>
                  {/* Replay button */}
                  {
                  this.state.mediaState === 'playing' && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.playMediaFromStart();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <ReloadOutlined />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                  {/* Play button */}
                  {
                  (this.state.mediaState === 'paused' || this.state.mediaState === 'ended') && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.playMedia();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <PlayCircleFilled />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                  {/* Pause button */}
                  {
                  this.state.mediaState === 'playing' && (
                    <Tags.AnMediaCtrlBtn
                      showButton={this.state.showControls}
                      type="button"
                      onClick={() => {
                        this.mediaRef.current!.pause();
                      }}
                      className={FABLE_AUDIO_MEDIA_CONTROLS}
                    >
                      <PauseCircleFilled />
                    </Tags.AnMediaCtrlBtn>
                  )
                }
                </Tags.AnMediaCtrlBtnsCon>
                { this.state.showControls
              && (
              <Tags.NavButtonCon
                padding={padding as [number, number]}
                pcolor={this.props.conf.opts.primaryColor._val}
              >
                {this.props.conf.config.buttons.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                  <Tags.ABtn
                    style={{
                      border: btnConf.type === 'prev' ? 'none' : '',
                      background: btnConf.type === 'prev' ? '#00000040' : ''
                    }}
                    bg={generateShadeColor(this.props.conf.opts.primaryColor._val)}
                    idx={idx}
                    key={btnConf.id}
                    btnStyle={btnConf.style._val}
                    color={this.props.conf.opts.primaryColor._val}
                    size={btnConf.size._val}
                    fontFamily={this.props.conf.opts.annotationFontFamily._val}
                    btnLayout="default"
                    borderRadius={this.props.conf.opts.borderRadius._val}
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
                    { btnConf.type === 'next' ? btnConf.text._val : <ArrowLeftOutlined />}
                  </Tags.ABtn>
                ))}
              </Tags.NavButtonCon>
              )}
              </>
              )}
              {!this.state.mediaLoaded && (
              <Tags.AnMediaCtrlBtnsCon>
                <Tags.Loader />
              </Tags.AnMediaCtrlBtnsCon>
              )}
            </Tags.AnMediaControls>
            <Tags.LoaderCon>
              <GTags.LoaderBar
                style={{
                  width: 'calc(100% - 2rem)',
                  transform: 'translate(1rem, 0.5rem)'
                }}
              >
                <GTags.LoaderProgress
                  bwidth={this.state.mediaProgress}
                  bcolor={this.props.conf.opts.annotationBodyBorderColor._val}
                  bradius={4}
                  bopacity={0.50}
                />
              </GTags.LoaderBar>
            </Tags.LoaderCon>
          </Tags.MediaCon>
        </Tags.AnMediaContainer>
        {this.state.showBtnOverlay
        && (
        <Tags.VoiceoverBtnOverlay
          height={this.props.win.innerHeight}
          width={this.props.win.innerWidth}
          bgColor={this.props.conf.opts.annotationBodyBackgroundColor._val}
          top={this.props.win.scrollY}
          left={this.props.win.scrollX}
        >
          {this.props.conf.config.buttons.filter((btn => btn.type !== 'prev'))
            .sort((m, n) => m.order - n.order).map((btnConf, idx) => (
              <Tags.ABtn
                bg={this.props.conf.opts.annotationBodyBackgroundColor._val}
                className={`f-${generateCSSSelectorFromText(btnConf.text._val)}-btn f-ann-btn`}
                idx={idx}
                key={btnConf.id}
                btnStyle={btnConf.style._val}
                color={this.props.conf.opts.primaryColor._val}
                size={btnConf.size._val}
                fontFamily={this.props.conf.opts.annotationFontFamily._val}
                btnLayout="default"
                borderRadius={this.props.conf.opts.borderRadius._val}
                onClick={(e) => {
                  e.stopPropagation();
                  this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id);
                }}
              >
                {btnConf.text._val}
              </Tags.ABtn>
            ))}
        </Tags.VoiceoverBtnOverlay>
        )}
      </>
    );
  }
}
