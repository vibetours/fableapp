import { IAnnotationButtonType, IAnnotationConfig, ITourDataOpts, VideoAnnotationPositions } from '@fable/common/dist/types';
import React, { ReactElement } from 'react';
import { NavFn } from '../../types';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import * as Tags from './styled';
import AnnotationVideo from './video-player';
import { playVideoAnn, generateShadeColor } from './utils';
import { isVideoAnnotation as isVideoAnn, isBlankString } from '../../utils';
import { logEvent } from '../../analytics/utils';
import { AnalyticsEvents, AnnotationBtnClickedPayload, TimeSpentInAnnotationPayload } from '../../analytics/types';
import * as VIDEO_ANN from './video-ann-constants';
import { AnnotationSerialIdMap } from './ops';
import { isCoverAnnotation } from './annotation-config-utils';
import { ApplyDiffAndGoToAnn } from '../screen-editor/types';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  win: Window,
  playMode: boolean,
  tourId: string;
  annotationSerialIdMap: AnnotationSerialIdMap;
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
}

export type NavigateToAdjacentAnn = (direction: 'prev' | 'next' | 'custom') => void;

export class AnnotationContent extends React.PureComponent<{
  config: IAnnotationConfig;
  opts: ITourDataOpts;
  isInDisplay: boolean;
  width: number;
  top: number,
  left: number,
  onRender?: (el: HTMLDivElement) => void,
  tourId: string
  annotationSerialIdMap: AnnotationSerialIdMap,
  dir: AnimEntryDir
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
}> {
  static readonly MIN_WIDTH = 360;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private readonly contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  private annotationEntered: number = Date.now();

  componentDidMount(): void {
    this.annotationEntered = Date.now();
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
    } else {
      setTimeout(() => {
        this.conRef.current!.style.transform = 'translate(0px, 0px)';
      }, 48);
    }
  }

  getAnnotationBorder(hasOverlay: boolean): string {
    const borderColor = this.props.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}, rgba(0, 0, 0) 0px 0px ${hasOverlay ? 0 : 8}px -1px`;
  }

  componentWillUnmount(): void {
    this.conRef.current && (this.conRef.current.style.visibility = 'hidden');
  }

  render(): JSX.Element {
    const btns = this.props.config.buttons.filter(c => !c.exclude);
    const serialId = this.props.annotationSerialIdMap[this.props.config.refId] + 1;
    const totalAnnotations = Object.keys(this.props.annotationSerialIdMap).length;
    const d = 30;
    let tx = 0;
    let ty = 0;
    if (this.props.dir === 'l') {
      tx -= d;
    } else if (this.props.dir === 'r') {
      tx += d;
    } else if (this.props.dir === 't') {
      ty -= d;
    } else if (this.props.dir === 'b') {
      ty += d;
    }
    return (
      <Tags.AnContent
        key={this.props.config.refId}
        ref={this.conRef}
        style={{
          minWidth: `${AnnotationContent.MIN_WIDTH}px`,
          width: `${this.props.width}px`,
          display: this.props.isInDisplay ? 'flex' : 'none',
          visibility: 'visible',
          left: this.props.left,
          top: this.props.top,
          transition: 'transform 0.3s ease-out',
          fontSize: '18px',
          transform: `translate(${tx}px, ${ty}px)`,
          boxShadow: this.getAnnotationBorder(this.props.config.showOverlay),
          backgroundColor: this.props.opts.annotationBodyBackgroundColor,
          borderRadius: this.props.opts.borderRadius
        }}
      >
        <Tags.AnInnerContainer
          anPadding={this.props.opts.annotationPadding.trim()}
        >
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          <Tags.AnTextContent
            fontFamily={this.props.opts.annotationFontFamily}
            fontColor={this.props.opts.annotationFontColor}
            ref={this.contentRef}
            borderRadius={this.props.opts.borderRadius}
            dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
          />
          {btns.length > 0 && (
            <Tags.ButtonCon
              justifyContent={btns.length > 1 ? 'space-between' : 'center'}
              borderTopColor={generateShadeColor(this.props.opts.annotationBodyBackgroundColor)}
              btnLength={btns.length}
              flexDirection={this.props.config.buttonLayout === 'default' ? 'row' : 'column'}
              anPadding={this.props.opts.annotationPadding.trim()}
            >
              {Boolean(serialId) && (
              <Tags.Progress
                bg={this.props.opts.annotationBodyBackgroundColor}
                fg={this.props.opts.annotationFontColor}
              >
                  {serialId} of {totalAnnotations}
              </Tags.Progress>
              )}
              {btns.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                <Tags.ABtn
                  bg={this.props.opts.annotationBodyBackgroundColor}
                  idx={idx}
                  key={btnConf.id}
                  btnStyle={btnConf.style}
                  color={this.props.opts.primaryColor}
                  size={btnConf.size}
                  fontFamily={this.props.opts.annotationFontFamily}
                  btnLayout={this.props.config.buttonLayout}
                  borderRadius={this.props.opts.borderRadius}
                  onClick={() => {
                    handleEventLogging(btnConf.id, btnConf.type, this.props.config.refId, this.props.tourId, this.annotationEntered);
                    this.props.navigateToAdjacentAnn(btnConf.type);
                  }}
                > {btnConf.text}
                </Tags.ABtn>
              ))}
            </Tags.ButtonCon>
          )}
        </Tags.AnInnerContainer>
      </Tags.AnContent>
    );
  }
}

type AnimEntryDir = 'l' | 't' | 'r' | 'b';
export class AnnotationCard extends React.PureComponent<IProps> {
  static readonly BREATHING_SPACE_RATIO = 30;

  static readonly ANNOTAITON_EL_MARGIN = 20;

  render(): JSX.Element {
    const displayConfig = this.props.annotationDisplayConfig;
    const config = displayConfig.config;
    const isVideoAnnotation = isVideoAnn(config);
    const isCoverAnn = config.type === 'cover';

    let l = -9999;
    let t = -9999;
    let w = displayConfig.prerender ? this.props.box.width : 0;
    let h = displayConfig.prerender ? this.props.box.height : 0;
    let dir: AnimEntryDir = 't';
    if (displayConfig.isInViewPort) {
      const elBox = this.props.box;
      const winW = this.props.annotationDisplayConfig.windowWidth;
      const winH = this.props.annotationDisplayConfig.windowHeight;

      const boxSize = this.props.annotationDisplayConfig.config.size;

      // TODO this is very complex. measurement calculation and rendering is intertwined. Fix this.
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
            conf={this.props.annotationDisplayConfig}
            playMode={this.props.playMode}
            annFollowPositions={{ top, left }}
            width={w}
            tourId={this.props.tourId}
            navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
          />;
        }
        return <AnnotationContent
          annotationSerialIdMap={this.props.annotationSerialIdMap}
          config={this.props.annotationDisplayConfig.config}
          opts={this.props.annotationDisplayConfig.opts}
          isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
          width={w}
          top={top}
          left={left}
          dir={dir}
          tourId={this.props.tourId}
          navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
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
      } else {
        dir = p || 't';
      }
    }

    if (isVideoAnnotation) {
      return <AnnotationVideo
        conf={this.props.annotationDisplayConfig}
        playMode={this.props.playMode}
        annFollowPositions={{
          top: t / this.props.win.innerHeight + (t % this.props.win.innerHeight),
          left: l / this.props.win.innerWidth + (l % this.props.win.innerWidth),
        }}
        width={w}
        tourId={this.props.tourId}
        navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
      />;
    }

    // This container should never have padding ever
    return <AnnotationContent
      annotationSerialIdMap={this.props.annotationSerialIdMap}
      config={this.props.annotationDisplayConfig.config}
      opts={this.props.annotationDisplayConfig.opts}
      isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
      width={w}
      dir={dir}
      top={t + this.props.win.scrollY}
      left={l + this.props.win.scrollX}
      tourId={this.props.tourId}
      navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
    />;
  }
}

export interface IAnnoationDisplayConfig {
  config: IAnnotationConfig;
  opts: ITourDataOpts,
  isMaximized: boolean;
  isInViewPort: boolean;
  prerender: boolean;
  isVideoAnnotation: boolean;
  dimForSmallAnnotation: { w: number, h: number };
  dimForMediumAnnotation: { w: number, h: number };
  dimForLargeAnnotation: { w: number, h: number };
  windowHeight: number;
  windowWidth: number;
}

export interface IAnnProps {
  box: Rect;
  conf: IAnnoationDisplayConfig;
  isNextAnnVideo: boolean;
  isPrevAnnVideo: boolean;
  hotspotBox?: Rect | null;
  annotationSerialIdMap: AnnotationSerialIdMap;
}

interface IConProps {
  data: Array<IAnnProps>,
  nav: NavFn,
  win: Window,
  playMode: boolean,
  tourId: string;
  applyDiffAndGoToAnn: ApplyDiffAndGoToAnn,
}

interface HotspotProps {
  data: Array<{
    opts: ITourDataOpts,
    conf: IAnnotationConfig,
    box: Rect,
    scrollX: number,
    scrollY: number,
    isGranularHotspot: boolean,
    isNextAnnVideo: boolean,
  }>,
  playMode: boolean,
  tourId: string,
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
}

function handleEventLogging(
  btn_id: string,
  btn_type: IAnnotationButtonType,
  ann_id: string,
  tour_id: string,
  tsAnnEntered: number
): void {
  const btnClickedpayload: AnnotationBtnClickedPayload = { tour_id, ann_id, btn_id, btn_type };

  const time_in_sec = Math.ceil((Date.now() - tsAnnEntered) / 1000);
  const timeSpentOnAnnPayload: TimeSpentInAnnotationPayload = { tour_id, ann_id, time_in_sec };
  logEvent(AnalyticsEvents.ANN_BTN_CLICKED, btnClickedpayload);
  // logEvent(AnalyticsEvents.TIME_SPENT_IN_ANN, timeSpentOnAnnPayload);
}

export class AnnotationHotspot extends React.PureComponent<HotspotProps> {
  private annotationEntered: number = Date.now();

  componentDidMount(): void {
    this.annotationEntered = Date.now();
  }

  render(): (JSX.Element | null)[] {
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
            selColor={p.opts.annotationSelectionColor}
            scrollX={p.scrollX}
            scrollY={p.scrollY}
            isGranularHotspot={p.isGranularHotspot}
            className="fable-hotspot"
            onClick={() => {
              handleEventLogging(btnConf.id, btnConf.type, p.conf.refId, this.props.tourId, this.annotationEntered);
              this.props.navigateToAdjacentAnn('next');
            }}
          />
        );
      }

      return null;
    });
  }
}

export class AnnotationCon extends React.PureComponent<IConProps> {
  render(): JSX.Element[] {
    return this.props.data.map((p) => {
      if (!p.conf.isMaximized && !p.conf.prerender) {
        // return <AnnotationBubble
        //   key={p.conf.config.id}
        //   annotationDisplayConfig={p.conf}
        //   box={p.box}
        //   nav={this.props.nav}
        // />;
        return null;
      }

      const hideAnnotation = p.conf.config.hideAnnotation; /* || isVideoAnn(p.conf.config) */
      const isHotspot = p.conf.config.isHotspot;
      const isGranularHotspot = Boolean(isHotspot && p.hotspotBox);

      const navigateToAdjacentAnn: NavigateToAdjacentAnn = (direction: 'prev' | 'next' | 'custom'): void => {
        const config = p.conf.config;
        const btnConf = config.buttons.filter(button => button.type === direction)[0];
        const isNavToVideoAnn = direction === 'prev' ? p.isPrevAnnVideo : p.isNextAnnVideo;

        if (!btnConf.hotspot) {
          return;
        }

        if (direction === 'custom' || !this.props.playMode) {
          this.props.nav(
            btnConf.hotspot.actionValue,
            btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
          );
          return;
        }

        if ((btnConf.type === 'next' || btnConf.type === 'prev')
          && btnConf.hotspot.actionType === 'navigate'
        ) {
          this.props.applyDiffAndGoToAnn(config.refId, btnConf.hotspot.actionValue, isNavToVideoAnn);
        } else {
          this.props.nav(btnConf.hotspot.actionValue, 'abs');
        }
      };

      return (
        <div key={p.conf.config.id}>
          {
            isHotspot && <AnnotationHotspot
              data={[{
                opts: p.conf.opts,
                conf: p.conf.config,
                box: isGranularHotspot ? p.hotspotBox! : p.box,
                scrollX: this.props.win.scrollX,
                scrollY: this.props.win.scrollY,
                isGranularHotspot,
                isNextAnnVideo: p.isNextAnnVideo,
              }]}
              playMode={this.props.playMode}
              tourId={this.props.tourId}
              navigateToAdjacentAnn={navigateToAdjacentAnn}
            />
          }
          {!hideAnnotation && <AnnotationCard
            annotationSerialIdMap={p.annotationSerialIdMap}
            annotationDisplayConfig={p.conf}
            box={p.box}
            win={this.props.win}
            playMode={this.props.playMode}
            tourId={this.props.tourId}
            navigateToAdjacentAnn={navigateToAdjacentAnn}
          />}
        </div>
      );
    }).filter(el => el) as JSX.Element[];
  }
}
