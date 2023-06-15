import { IAnnotationConfig, ITourDataOpts, VideoAnnotationPositions } from '@fable/common/dist/types';
import React from 'react';
import { NavFn } from '../../types';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import * as Tags from './styled';
import { isBlankString, isCoverAnnotation } from './annotation-config-utils';
import * as VIDEO_ANN from './video-ann-constants';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  nav: NavFn,
  win: Window,
  playMode: boolean,
}

export class AnnotationContent extends React.PureComponent<{
  config: IAnnotationConfig;
  opts: ITourDataOpts;
  isInDisplay: boolean;
  width: number;
  top: number,
  left: number,
  onRender?: (el: HTMLDivElement) => void,
  nav: NavFn,
}> {
  static readonly MIN_WIDTH = 320;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private readonly contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount() {
    if (this.props.onRender) {
      if (this.contentRef.current) {
        const imgs = this.contentRef.current?.getElementsByTagName('img');
        Promise.all(Array.from(imgs).map(img => new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          img.onabort = resolve;
        }))).then(() => {
          requestAnimationFrame(() => this.props.onRender!(this.conRef.current!));
        });
      } else {
        this.props.onRender(this.conRef.current!);
      }
    }
  }

  getAnnotationBorder() {
    const borderColor = this.props.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}`;
  }

  render() {
    const btns = this.props.config.buttons.filter(c => !c.exclude);
    return (
      <Tags.AnContent
        className="fable-test-cl"
        ref={this.conRef}
        style={{
          minWidth: `${AnnotationContent.MIN_WIDTH}px`,
          width: `${this.props.width}px`,
          display: this.props.isInDisplay ? 'flex' : 'none',
          left: this.props.left,
          top: this.props.top,
          fontSize: '18px',
          boxShadow: this.getAnnotationBorder(),
          backgroundColor: `${this.props.opts.annotationBodyBackgroundColor}`
        }}
      >
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          <Tags.AnTextContent
            bodyTextSize={this.props.config.bodyTextSize}
            ref={this.contentRef}
            dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
          />
          <div style={{
            display: 'flex',
            justifyContent: btns.length > 1 ? 'space-between' : 'center',
            alignItems: 'center',
            marginTop: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid #dddddd'
          }}
          >
            {btns.sort((m, n) => m.order - n.order).map(btnConf => (
              <Tags.ABtn
                key={btnConf.id}
                btnStyle={btnConf.style}
                color={this.props.opts.primaryColor}
                size={btnConf.size}
                onClick={() => {
                  btnConf.hotspot && this.props.nav(
                    btnConf.hotspot.actionValue,
                    btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
                  );
                }}
              > {btnConf.text}
              </Tags.ABtn>
            ))}
          </div>
        </div>
      </Tags.AnContent>
    );
  }
}

export class AnnotationCard extends React.PureComponent<IProps> {
  static readonly BREATHING_SPACE_RATIO = 30;

  static readonly ANNOTAITON_EL_MARGIN = 20;

  render() {
    const config = this.props.annotationDisplayConfig.config;
    const isVideoAnnotation = !isBlankString(config.videoUrl)
    || (!isBlankString(config.videoUrlMp4) && !isBlankString(config.videoUrlWebm));
    const isCoverAnn = config.type === 'cover';

    let l = -9999;
    let t = -9999;
    let w = 0;
    let h = 0;
    if (this.props.annotationDisplayConfig.isInViewPort) {
      const elBox = this.props.box;
      const winW = this.props.annotationDisplayConfig.windowWidth;
      const winH = this.props.annotationDisplayConfig.windowHeight;

      const boxSize = this.props.annotationDisplayConfig.config.size;

      if (boxSize === 'small') {
        w = this.props.annotationDisplayConfig.dimForSmallAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForSmallAnnotation.h;
      }

      if (boxSize === 'medium') {
        if (isVideoAnnotation) {
          if (isCoverAnn) {
            switch (this.props.annotationDisplayConfig.config.positioning) {
              case VideoAnnotationPositions.BottomLeft:
              case VideoAnnotationPositions.BottomRight:
                w = VIDEO_ANN.COVER_MED_WIDTH;
                h = VIDEO_ANN.COVER_MED_HEIGHT;
                break;
              case VideoAnnotationPositions.Center:
              case VideoAnnotationPositions.Follow:
              default:
                w = VIDEO_ANN.COVER_MED_WIDTH_CENTER;
                h = VIDEO_ANN.COVER_MED_HEIGHT_CENTER;
                break;
            }
          }

          if (!isCoverAnn) {
            w = VIDEO_ANN.DEFAULT_MED_WIDTH;
            h = VIDEO_ANN.DEFAULT_MED_HEIGHT;
          }
        }

        if (!isVideoAnnotation) {
          w = this.props.annotationDisplayConfig.dimForMediumAnnotation.w;
          h = this.props.annotationDisplayConfig.dimForMediumAnnotation.h;
        }
      }

      if (boxSize === 'large') {
        if (isVideoAnnotation) {
          if (isCoverAnn) {
            switch (this.props.annotationDisplayConfig.config.positioning) {
              case VideoAnnotationPositions.BottomLeft:
              case VideoAnnotationPositions.BottomRight:
                w = VIDEO_ANN.COVER_LARGE_WIDTH;
                h = VIDEO_ANN.COVER_LARGE_HEIGHT;
                break;
              case VideoAnnotationPositions.Center:
              case VideoAnnotationPositions.Follow:
              default:
                w = VIDEO_ANN.COVER_LARGE_WIDTH_CENTER;
                h = VIDEO_ANN.COVER_LARGE_HEIGHT_CENTER;
                break;
            }
          }

          if (!isCoverAnn) {
            w = VIDEO_ANN.DEFAULT_LARGE_WIDTH;
            h = VIDEO_ANN.DEFAULT_LARGE_HEIGHT;
          }
        }

        if (!isVideoAnnotation) {
          w = this.props.annotationDisplayConfig.dimForLargeAnnotation.w;
          h = this.props.annotationDisplayConfig.dimForLargeAnnotation.h;
        }
      }

      if (this.props.annotationDisplayConfig.config.type === 'cover') {
        const top = winH / 2 - h / 2;
        const left = winW / 2 - w / 2;
        if (isVideoAnnotation) {
          return <AnnotationVideo
            nav={this.props.nav}
            annotationDisplayConfig={this.props.annotationDisplayConfig}
            playMode={this.props.playMode}
            annFollowPositions={{ top, left }}
            width={w}
            height={h}
          />;
        }
        return <AnnotationContent
          config={this.props.annotationDisplayConfig.config}
          opts={this.props.annotationDisplayConfig.opts}
          isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
          nav={this.props.nav}
          width={w}
          top={top}
          left={left}
        />;
      }

      const leftSpace = elBox.left;
      const rightSpace = winW - elBox.right;
      const ml = leftSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO);
      const mr = rightSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO);
      let p: 'l' | 'r' | 't' | 'b' | undefined;
      if (ml > 1 || mr > 1) {
        p = ml > mr ? 'l' : 'r';
      }
      if (p === 'l' || p === 'r') {
        t = elBox.top + elBox.height / 2 - (h / 2);
        if (t <= AnnotationCard.ANNOTAITON_EL_MARGIN) {
          // If the top of the annotation is outside the viewport
          t = Math.max(elBox.top - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.top);
        }
        if (t + h + AnnotationCard.ANNOTAITON_EL_MARGIN >= winH) {
          // If the bottom of the annotation is outside the viewport
          t = Math.min(elBox.bottom - h + HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.bottom - h);
        }

        if (p === 'l') {
          l = elBox.left - w - AnnotationCard.ANNOTAITON_EL_MARGIN;
        } else {
          l = elBox.right + AnnotationCard.ANNOTAITON_EL_MARGIN;
        }
      } else {
        const topSpace = elBox.top;
        const bottomSpace = winH - elBox.bottom;
        const mt = topSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO);
        const mb = bottomSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO);
        if (mb > 1 || mt > 1) {
          p = mb > mt ? 'b' : 't';
        }
        if (p === 't' || p === 'b') {
          l = elBox.left + elBox.width / 2 - (w / 2);
          if (p === 't') {
            t = elBox.top - h - AnnotationCard.ANNOTAITON_EL_MARGIN;
          } else {
            t = elBox.bottom + AnnotationCard.ANNOTAITON_EL_MARGIN;
          }
        }
      }

      if (!p) {
        l = elBox.right - w - AnnotationCard.ANNOTAITON_EL_MARGIN;
        t = elBox.bottom - h - AnnotationCard.ANNOTAITON_EL_MARGIN;
      }
    }

    if (isVideoAnnotation) {
      return <AnnotationVideo
        nav={this.props.nav}
        annotationDisplayConfig={this.props.annotationDisplayConfig}
        playMode={this.props.playMode}
        annFollowPositions={{
          top: t / this.props.win.innerHeight + (t % this.props.win.innerHeight),
          left: l / this.props.win.innerWidth + (l % this.props.win.innerWidth),
        }}
        width={w}
        height={h}
      />;
    }

    // This container should never have padding ever
    return <AnnotationContent
      config={this.props.annotationDisplayConfig.config}
      opts={this.props.annotationDisplayConfig.opts}
      isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
      nav={this.props.nav}
      width={w}
      top={t + this.props.win.scrollY}
      left={l + this.props.win.scrollX}
    />;
  }
}

export interface IAnnoationDisplayConfig {
  config: IAnnotationConfig;
  opts: ITourDataOpts,
  isMaximized: boolean;
  isInViewPort: boolean;
  dimForSmallAnnotation: {w: number, h: number};
  dimForMediumAnnotation: {w: number, h: number};
  dimForLargeAnnotation: {w: number, h: number};
  windowHeight: number;
  windowWidth: number;
}

interface IConProps {
  data: Array<{conf: IAnnoationDisplayConfig, box: Rect, hotspotBox: Rect | null}>,
  nav: NavFn,
  win: Window,
  playMode: boolean
}
interface HotspotProps {
  data: Array<{conf: IAnnotationConfig, box: Rect, scrollX: number, scrollY: number, isGranularHotspot: boolean}>,
  nav: NavFn,
  playMode: boolean,
}

export class AnnotationHotspot extends React.PureComponent<HotspotProps> {
  render() {
    return this.props.data.map((p, idx) => {
      const btnConf = p.conf.buttons.filter(button => button.type === 'next')[0];

      /**
       * If we show the annotation in edit mode, the user won't be able to select any
       * element inside the element.
       * For that reason, we have this check where we show the hotspot only when the
       * screen is in play mode or it is a granular hotspot.
       */
      if (this.props.playMode || p.isGranularHotspot) {
        return (
          <Tags.AnHotspot
            key={p.conf.id}
            box={p.box}
            scrollX={p.scrollX}
            scrollY={p.scrollY}
            isGranularHotspot={p.isGranularHotspot}
            className="fable-hotspot"
            onClick={() => {
              btnConf.hotspot && this.props.nav(
                btnConf.hotspot.actionValue,
                btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
              );
            }}
          />
        );
      }

      return null;
    });
  }
}

interface VideoProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  nav: NavFn,
  playMode: boolean,
  annFollowPositions: {top: number, left: number},
  width: number;
  height: number;
}

export class AnnotationVideo extends React.PureComponent<VideoProps> {
  getAnnotationBorder() {
    const borderColor = this.props.annotationDisplayConfig.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}`;
  }

  getPositioningAndSizingStyles() {
    const position = this.props.annotationDisplayConfig.config.positioning;
    const isCover = isCoverAnnotation(this.props.annotationDisplayConfig.config.id);
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
      height: `${this.props.height}px`,
    };
  }

  render() {
    const btnConf = this.props.annotationDisplayConfig.config.buttons.filter(button => button.type === 'next')[0];

    const config = this.props.annotationDisplayConfig.config;

    const isCover = isCoverAnnotation(config.id);

    if (!isBlankString(config.videoUrlMp4) && !isBlankString(config.videoUrlWebm)) {
      return (
        <Tags.AnVideo
          autoPlay
          border={this.getAnnotationBorder()}
          isCover={isCover}
          className="fable-video"
          style={{ ...this.getPositioningAndSizingStyles() }}
          onEnded={() => {
            if (!this.props.playMode) {
              return;
            }
            btnConf.hotspot && this.props.nav(
              btnConf.hotspot.actionValue,
              btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
            );
          }}
        >
          <source src={config.videoUrlMp4} type="video/mp4" />
          <source src={config.videoUrlWebm} type="video/webm" />
        </Tags.AnVideo>
      );
    }

    return (
      <Tags.AnVideo
        autoPlay
        border={this.getAnnotationBorder()}
        isCover={isCover}
        className="fable-video"
        style={{ ...this.getPositioningAndSizingStyles() }}
        onEnded={() => {
          if (!this.props.playMode) {
            return;
          }
          btnConf.hotspot && this.props.nav(
            btnConf.hotspot.actionValue,
            btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
          );
        }}
      >
        <source src={this.props.annotationDisplayConfig.config.videoUrl} />
      </Tags.AnVideo>
    );
  }
}

export class AnnotationCon extends React.PureComponent<IConProps> {
  render() {
    return this.props.data.map((p) => {
      if (!p.conf.isMaximized) {
        // return <AnnotationBubble
        //   key={p.conf.config.id}
        //   annotationDisplayConfig={p.conf}
        //   box={p.box}
        //   nav={this.props.nav}
        // />;
        return <div key={p.conf.config.id} />;
      }

      const hideAnnotation = p.conf.config.hideAnnotation;
      const isHotspot = p.conf.config.isHotspot;
      const isGranularHotspot = Boolean(isHotspot && p.hotspotBox);
      return (
        <div key={p.conf.config.id}>
          {
            isHotspot && <AnnotationHotspot
              data={[{
                conf: p.conf.config,
                box: isGranularHotspot ? p.hotspotBox! : p.box,
                scrollX: this.props.win.scrollX,
                scrollY: this.props.win.scrollY,
                isGranularHotspot,
              }]}
              nav={this.props.nav}
              playMode={this.props.playMode}
            />
          }
          { !hideAnnotation && <AnnotationCard
            annotationDisplayConfig={p.conf}
            box={p.box}
            nav={this.props.nav}
            win={this.props.win}
            playMode={this.props.playMode}
          />}
        </div>
      );
    });
  }
}
