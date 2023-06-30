import React, { RefObject, ReactElement } from 'react';
import Hls, { HlsConfig } from 'hls.js';
import { VideoAnnotationPositions } from '@fable/common/dist/types';
import * as Tags from './styled';
import { IAnnoationDisplayConfig } from '.';
import { NavFn } from '../../types';
import { isCoverAnnotation } from './annotation-config-utils';
import { playVideoAnn } from './utils';

interface IProps {
  conf: IAnnoationDisplayConfig;
  nav: NavFn,
  playMode: boolean,
  annFollowPositions: {top: number, left: number},
  width: number;
  isNextAnnVideo: boolean;
}

export default class AnnotationVideo extends React.PureComponent<IProps> {
  private videoRef: RefObject<HTMLVideoElement> = React.createRef();

  private hls: Hls | null = null;

  constructor(props: IProps) {
    super(props);
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
  }

  componentWillUnmount(): void {
    if (!this.hls) return;
    this.hls.destroy();
    this.hls = null;
  }

  getAnnotationBorder(): string {
    const borderColor = this.props.conf.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}`;
  }

  getPositioningAndSizingStyles() {
    const position = this.props.conf.config.positioning;
    const isCover = isCoverAnnotation(this.props.conf.config.id);
    const offsetPosition = '20px';

    let styles = {};
    switch (position) {
      case VideoAnnotationPositions.BottomRight:
        styles = { ...styles, bottom: offsetPosition, right: offsetPosition };
        break;
      case VideoAnnotationPositions.BottomLeft:
        styles = { ...styles, bottom: offsetPosition, left: offsetPosition };
        break;
      case VideoAnnotationPositions.Center:
        styles = { ...styles, bottom: '50%', right: '50%', transform: 'translate(50%, 50%)' };
        break;
      case VideoAnnotationPositions.Follow: {
        if (isCover) {
          styles = { ...styles, bottom: '50%', right: '50%', transform: 'translate(50%, 50%)' };
        } else {
          styles = {
            ...styles,
            top: `${this.props.annFollowPositions.top}px`,
            left: `${this.props.annFollowPositions.left}px`
          };
        }
        break;
      }
      default:
        styles = { ...styles, bottom: offsetPosition, right: offsetPosition };
        break;
    }

    return {
      ...styles,
      width: `${this.props.width}px`,
    };
  }

  render(): ReactElement {
    const config = this.props.conf.config;
    const btnConf = config.buttons.filter(button => button.type === 'next')[0];
    const isHlsSupported = this.hls && config.videoUrlHls && this.props.playMode;
    console.log('>>> hls', isHlsSupported);

    return (
      <Tags.AnVideo
        border={this.getAnnotationBorder()}
        ref={this.videoRef}
        id={`fable-ann-video-${config.refId}`}
        className="fable-video"
        style={{
          ...this.getPositioningAndSizingStyles(),
          visibility: this.props.conf.isMaximized ? 'visible' : 'hidden'
        }}
        out={this.props.conf.isMaximized ? 'slidein' : 'slideout'}
        onEnded={() => {
          if (!this.props.playMode) {
            return;
          }

          btnConf.hotspot && this.props.nav(
            btnConf.hotspot.actionValue,
            btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
          );

          if (this.props.isNextAnnVideo && btnConf.type === 'next' && btnConf.hotspot) {
            const [screenId, annId] = btnConf.hotspot.actionValue.split('/');
            playVideoAnn(screenId, annId);
          }
        }}
      >
        {!isHlsSupported && (
          <>
            <source src={config.videoUrlMp4} type="video/mp4" />
            <source src={config.videoUrlWebm} type="video/webm" />
            {config.videoUrl && (<source src={config.videoUrlWebm} type="video/webm" />)}
          </>
        )}
      </Tags.AnVideo>
    );
  }
}
