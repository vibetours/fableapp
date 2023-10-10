import {
  IAnnotationButtonType,
  IAnnotationConfig,
  ITourDataOpts,
  VideoAnnotationPositions
} from '@fable/common/dist/types';
import React from 'react';
import { DEFAULT_ANN_DIMS, sleep } from '@fable/common/dist/utils';
import { NavFn } from '../../types';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import * as Tags from './styled';
import AnnotationVideo from './video-player';
import { generateShadeColor } from './utils';
import { isCoverAnnotation as isCoverAnn, isVideoAnnotation as isVideoAnn } from '../../utils';
import { logEvent } from '../../analytics/utils';
import { AnalyticsEvents, AnnotationBtnClickedPayload, TimeSpentInAnnotationPayload } from '../../analytics/types';
import * as VIDEO_ANN from './video-ann-constants';
import { AnnotationSerialIdMap } from './ops';
import { ApplyDiffAndGoToAnn } from '../screen-editor/types';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { isAnnCustomPosition } from './annotation-config-utils';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  win: Window,
  playMode: boolean,
  tourId: number;
  annotationSerialIdMap: AnnotationSerialIdMap;
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isThemeAnnotation?: boolean;
  maskBox: Rect | null;
}

export type NavigateToAdjacentAnn = (direction: 'prev' | 'next' | 'custom', btnId: string) => void;

export class AnnotationContent extends React.PureComponent<{
  config: IAnnotationConfig;
  opts: ITourDataOpts;
  isInDisplay: boolean;
  width: number;
  top: number,
  left: number,
  onRender?: (el: HTMLDivElement) => void,
  tourId: number,
  annotationSerialIdMap: AnnotationSerialIdMap,
  dir: AnimEntryDir
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isThemeAnnotation?: boolean,
  doc?: Document
}> {
  static readonly MIN_WIDTH = DEFAULT_ANN_DIMS.width;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private readonly contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  private annotationEntered: number = Date.now();

  componentDidMount(): void {
    this.annotationEntered = Date.now();
    if (this.props.onRender) {
      if (this.contentRef.current) {
        const annTextP = this.contentRef.current.querySelector('p')!;
        const defaultFontFamily = this.props.opts.annotationFontFamily || getComputedStyle(annTextP).fontFamily;

        let fontLoadingPromise: Promise<unknown> = Promise.resolve();
        if (defaultFontFamily && this.props.doc) {
          let timer = 0;
          fontLoadingPromise = Promise.race([
            sleep(300),
            new Promise((res) => {
              timer = setInterval(() => {
                const result = this.props.doc?.fonts.check(`1rem ${defaultFontFamily}`);
                if (result) res(1);
              }, 16) as unknown as number;
            })
          ]);
          fontLoadingPromise.then(() => {
            if (timer) clearInterval(timer);
          });
        }

        const els: Array<HTMLImageElement | HTMLLinkElement> = Array
          .from(this.contentRef.current?.getElementsByTagName('img'));

        Promise.all(els.map(img => new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
          img.onabort = resolve;
        })).concat(fontLoadingPromise)).then(() => {
          requestAnimationFrame(() => this.props.onRender!(this.conRef.current!));
        });
      } else {
        this.props.onRender(this.conRef.current!);
      }
    }
  }

  getAnnotationBorder(hasOverlay: boolean): string {
    const borderColor = this.props.opts.annotationBodyBorderColor;
    const defaultBorderColor = '#BDBDBD';

    const blur = borderColor.toUpperCase() === defaultBorderColor ? '5px' : '0px';
    const spread = borderColor.toUpperCase() === defaultBorderColor ? '0px' : '2px';

    return `0 0 ${blur} ${spread} ${borderColor}, rgba(0, 0, 0) 0px 0px ${hasOverlay ? 0 : 4}px -1px`;
  }

  componentWillUnmount(): void {
    this.conRef.current && (this.conRef.current.style.visibility = 'hidden');
  }

  render(): JSX.Element {
    const btns = this.props.config.buttons.filter(c => !c.exclude);

    return (
      <Tags.AnContent
        key={this.props.config.refId}
        ref={this.conRef}
        style={{
          minWidth: `${this.props.config.size === 'custom' ? 0 : AnnotationContent.MIN_WIDTH}px`,
          width: `${this.props.width}px`,
          display: this.props.isInDisplay ? 'flex' : 'none',
          visibility: 'visible',
          left: this.props.left,
          top: this.props.top,
          fontSize: '18px',
          boxShadow: this.getAnnotationBorder(this.props.config.showOverlay),
          backgroundColor: this.props.opts.annotationBodyBackgroundColor,
          borderRadius: this.props.opts.borderRadius,
          position: this.props.isThemeAnnotation ? 'unset' : 'absolute',
        }}
        className={`fable-ann-card f-a-c-${this.props.config.refId}`}
        id={`f-a-i-${this.props.config.refId}`}
      >
        <Tags.AnInnerContainer
          anPadding={this.props.opts.annotationPadding.trim()}
          className="f-inner-con"
        >
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          <Tags.AnTextContent
            fontFamily={this.props.opts.annotationFontFamily}
            fontColor={this.props.opts.annotationFontColor}
            ref={this.contentRef}
            borderRadius={this.props.opts.borderRadius}
            dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
            className="f-text"
          />
          {btns.length > 0 && (
            <Tags.ButtonCon
              justifyContent={btns.length > 1 ? 'space-between' : 'center'}
              borderTopColor={generateShadeColor(this.props.opts.annotationBodyBackgroundColor)}
              btnLength={btns.length}
              flexDirection={this.props.config.buttonLayout === 'default' ? 'row' : 'column'}
              anPadding={this.props.opts.annotationPadding.trim()}
              className="f-button-con"
            >
              {this.props.annotationSerialIdMap[this.props.config.refId] && (
              <Tags.Progress
                bg={this.props.opts.annotationBodyBackgroundColor}
                fg={this.props.opts.annotationFontColor}
                fontFamily={this.props.opts.annotationFontFamily || 'inherit'}
                className="f-progress"
              >
                {this.props.annotationSerialIdMap[this.props.config.refId]}
              </Tags.Progress>
              )}
              {btns.sort((m, n) => m.order - n.order).map((btnConf, idx) => (
                <Tags.ABtn
                  bg={this.props.opts.annotationBodyBackgroundColor}
                  className={`f-${generateCSSSelectorFromText(btnConf.text)}-btn`}
                  idx={idx}
                  key={btnConf.id}
                  btnStyle={btnConf.style}
                  color={this.props.opts.primaryColor}
                  size={btnConf.size}
                  fontFamily={this.props.opts.annotationFontFamily}
                  btnLayout={this.props.config.buttonLayout}
                  borderRadius={this.props.opts.borderRadius}
                  onClick={() => {
                    handleEventLogging(
                      btnConf.id,
                      btnConf.type,
                      this.props.config.refId,
                      this.props.tourId,
                      this.annotationEntered
                    );
                    this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id);
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

export type AnimEntryDir = 'l' | 't' | 'r' | 'b';
export class AnnotationCard extends React.PureComponent<IProps> {
  static readonly BREATHING_SPACE_RATIO = 30;

  static readonly ANNOTAITON_EL_MARGIN = 20;

  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount(): void {
    setTimeout(() => {
      if (this.conRef.current) {
        this.conRef.current.style.transform = 'translate(0px, 0px)';
      }
    }, 48);
  }

  componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<{}>, snapshot?: any): void {
    const prevConfig = prevProps.annotationDisplayConfig.config;
    const currConfig = this.props.annotationDisplayConfig.config;
    if (prevConfig.positioning !== currConfig.positioning) {
      setTimeout(() => {
        if (this.conRef.current) {
          this.conRef.current.style.transform = 'translate(0px, 0px)';
        }
      }, 0);
    }
  }

  getAnnWidthHeight = ():{
    w: number,
    h: number,
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const config = displayConfig.config;
    const isVideoAnnotation = isVideoAnn(config);
    const isCoverAnnotation = isCoverAnn(config);

    const boxSize = this.props.annotationDisplayConfig.config.size;

    let w = displayConfig.prerender ? this.props.box.width : 0;
    let h = displayConfig.prerender ? this.props.box.height : 0;

    if (boxSize === 'small') {
      w = this.props.annotationDisplayConfig.dimForSmallAnnotation.w;
      h = this.props.annotationDisplayConfig.dimForSmallAnnotation.h;
    }

    if (boxSize === 'medium') {
      if (isVideoAnnotation) {
        if (isCoverAnnotation) {
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

        if (!isCoverAnnotation) {
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
        if (isCoverAnnotation) {
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

        if (!isCoverAnnotation) {
          w = VIDEO_ANN.DEFAULT_LARGE_WIDTH;
          h = VIDEO_ANN.DEFAULT_LARGE_HEIGHT;
        }
      }

      if (!isVideoAnnotation) {
        w = this.props.annotationDisplayConfig.dimForLargeAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForLargeAnnotation.h;
      }
    }

    if (boxSize === 'custom') {
      w = this.props.annotationDisplayConfig.dimForCustomAnnotation.w;
      h = this.props.annotationDisplayConfig.dimForCustomAnnotation.h;
      if (isVideoAnnotation) {
        h = VIDEO_ANN.getHeightForConstWidth(w);
      }
    }
    return {
      w, h
    };
  };

  getAutoAnnRenderingData = (w: number, h: number,): {
    l: number,
    t: number,
    dir: AnimEntryDir,
    isUltrawideBox: boolean
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const elBox = this.props.box;
    const winW = this.props.annotationDisplayConfig.windowWidth;
    const winH = this.props.annotationDisplayConfig.windowHeight;

    let l = -9999;
    let t = -9999;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox = false;

    if (!displayConfig.isInViewPort) return { l, t, dir, isUltrawideBox };

    if (this.props.annotationDisplayConfig.config.type === 'cover') {
      t = winH / 2 - h / 2;
      l = winW / 2 - w / 2;
      return { l, t, dir, isUltrawideBox };
    }

    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const LEFT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.left;
    const RIGHT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.right;
    const TOP_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.top;
    const BOTTOM_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.bottom;

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
      if (t <= TOP_ANN_EL_MARGIN) {
        // If the top of the annotation is outside the viewport
        t = Math.max(elBox.top - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.top);
      }
      if (t + h + TOP_ANN_EL_MARGIN >= winH) {
        // If the bottom of the annotation is outside the viewport
        t = Math.min(elBox.bottom - h + HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.bottom - h);
      }

      if (p === 'l') {
        l = elBox.left - w - LEFT_ANN_EL_MARGIN;
      } else {
        l = elBox.right + RIGHT_ANN_EL_MARGIN;
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
          t = elBox.top - h - TOP_ANN_EL_MARGIN;
        } else {
          t = elBox.bottom + BOTTOM_ANN_EL_MARGIN;
        }
      }
    }

    if (!p) {
      isUltrawideBox = true;
      l = elBox.right - w - LEFT_ANN_EL_MARGIN;
      t = elBox.bottom - h - TOP_ANN_EL_MARGIN;
    } else {
      dir = p || 't';
    }

    return {
      l, t, dir, isUltrawideBox
    };
  };

  getCustomAnnPosDir = (): AnimEntryDir => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const side = pos.split('-')[1];

    let dir: AnimEntryDir = 't';

    if (side === 'top') { dir = 't'; }
    if (side === 'right') { dir = 'r'; }
    if (side === 'bottom') { dir = 'b'; }
    if (side === 'left') { dir = 'l'; }

    return dir;
  };

  /** *
   *  If custom position is c-top-left
   *  top -> position
   *  left -> subposition
   */
  getCustomAnnPosLeft = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomAnnPosDir();
    const elBox = this.props.box;
    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const LEFT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.left;
    const RIGHT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.right;

    if (dir === 'l') { return elBox.left - w - LEFT_ANN_EL_MARGIN; }
    if (dir === 'r') { return elBox.right + RIGHT_ANN_EL_MARGIN; }

    const subPosition = pos.split('-').at(-1);
    if (subPosition === 'left') { return elBox.left - maskBoxPadding.left; }
    if (subPosition === 'right') { return elBox.right - w + maskBoxPadding.right; }
    if (subPosition === 'center') { return (elBox.left + elBox.width / 2) - (w / 2); }

    return 0;
  };

  getCustomAnnPosTop = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomAnnPosDir();
    const elBox = this.props.box;

    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const TOP_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.top;
    const BOTTOM_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.bottom;

    if (dir === 't') { return elBox.top - h - TOP_ANN_EL_MARGIN; }
    if (dir === 'b') { return elBox.bottom + BOTTOM_ANN_EL_MARGIN; }

    const subPosition = pos.split('-').at(-1);
    if (subPosition === 'top') { return elBox.top - maskBoxPadding.top; }
    if (subPosition === 'bottom') { return elBox.bottom - h + maskBoxPadding.bottom; }
    if (subPosition === 'center') { return (elBox.top + elBox.height / 2) - (h / 2); }

    return 0;
  };

  isAnnOutSideOfViewPort = (l: number, t: number, w: number, h: number): boolean => {
    const winW = this.props.annotationDisplayConfig.windowWidth;
    const winH = this.props.annotationDisplayConfig.windowHeight;

    if (l < 0) return true;
    if (t < 0) return true;
    if (l + w > winW) return true;
    if (t + h > winH) return true;

    return false;
  };

  shouldShowArrowHead = (): boolean => {
    const config = this.props.annotationDisplayConfig.config;
    const pos = config.positioning;
    const isVideoAnnotation = isVideoAnn(config);
    const isCoverAnnotation = isCoverAnn(config);

    if (isCoverAnnotation) return false;

    if (isVideoAnnotation) {
      return (pos === 'follow' || isAnnCustomPosition(pos)) && !this.props.annotationDisplayConfig.prerender;
    }

    return true;
  };

  // TODO[refactor]
  //  Multiple branching besed render happens leading to similar configuration of same component. Make a single render
  //  by calculating the variables / configs via branching and applying those variables / config on the singular
  //  rendered component
  render(): JSX.Element {
    const { w, h } = this.getAnnWidthHeight();

    let showAutoPositioning = !isAnnCustomPosition(this.props.annotationDisplayConfig.config.positioning);
    let t: number = 0;
    let l: number = 0;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox: boolean = false;

    if (!showAutoPositioning) {
      l = this.getCustomAnnPosLeft(w, h);
      t = this.getCustomAnnPosTop(w, h);
      dir = this.getCustomAnnPosDir();

      const annOutsideOfViewport = this.isAnnOutSideOfViewPort(l, t, w, h);

      if (annOutsideOfViewport) { showAutoPositioning = true; }
    }

    if (showAutoPositioning) {
      const renderingData = this.getAutoAnnRenderingData(w, h);
      t = renderingData.t;
      l = renderingData.l;
      dir = renderingData.dir;
      isUltrawideBox = renderingData.isUltrawideBox;
    }

    const displayConfig = this.props.annotationDisplayConfig;
    const config = displayConfig.config;
    const isVideoAnnotation = isVideoAnn(config);
    const isCoverAnnotation = isCoverAnn(config);

    const [cdx, cdy] = HighlighterBase.getCumulativeDxDy(this.props.win);
    const maskBoxRect = HighlighterBase.getMaskBoxRect(this.props.box, this.props.win, cdx, cdy);
    let arrowColor = this.props.annotationDisplayConfig.opts.annotationBodyBorderColor;
    let isBorderColorDefault = false;
    if (arrowColor.toUpperCase() === '#BDBDBD') {
      arrowColor = this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor;
      isBorderColorDefault = true;
    }

    const d = 30;
    let tx = 0;
    let ty = 0;

    if (!isCoverAnnotation) {
      if (dir === 'l') {
        tx -= d;
      } else if (dir === 'r') {
        tx += d;
      } else if (dir === 't') {
        ty -= d;
      } else if (dir === 'b') {
        ty += d;
      }
    } else {
      ty -= d;
    }

    if (!isCoverAnnotation) {
      t += this.props.win.scrollY;
      l += this.props.win.scrollX;
    }

    return (
      <>
        {
          isVideoAnnotation && (
          <AnnotationVideo
            conf={this.props.annotationDisplayConfig}
            playMode={this.props.playMode}
            annFollowPositions={{
              top: t,
              left: l,
              dir,
            }}
            width={w}
            height={h}
            tourId={this.props.tourId}
            navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
            annotationSerialIdMap={this.props.annotationSerialIdMap}
          />
          )
        }
        <div
          ref={this.conRef}
          style={{
            transition: 'transform 0.3s ease-out',
            transform: this.props.isThemeAnnotation ? 'none' : `translate(${tx}px, ${ty}px)`,
          }}
        >
          {
            this.shouldShowArrowHead() && !isUltrawideBox && (
              <AnnotationArrowHead
                box={{
                  ...this.props.box,
                  top: this.props.box.top + this.props.win.scrollY,
                  left: this.props.box.left + this.props.win.scrollX,
                }}
                pos={dir}
                maskBoxRect={maskBoxRect}
                arrowColor={arrowColor}
                annBox={{
                  top: t,
                  left: l,
                  width: w,
                  height: h
                }}
                isBorderColorDefault={isBorderColorDefault}
                annBorderRadius={this.props.annotationDisplayConfig.opts.borderRadius}
              />
            )
            }
          {
            !isVideoAnnotation && (
              <AnnotationContent
                annotationSerialIdMap={this.props.annotationSerialIdMap}
                config={this.props.annotationDisplayConfig.config}
                opts={this.props.annotationDisplayConfig.opts}
                isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
                width={w}
                top={t}
                left={l}
                tourId={this.props.tourId}
                dir={dir}
                navigateToAdjacentAnn={this.props.navigateToAdjacentAnn}
              />
            )
          }
        </div>
      </>
    );
  }
}

interface AnnotationArrowHeadProps {
  box: Rect;
  pos: AnimEntryDir;
  arrowColor: string;
  maskBoxRect: Rect;
  annBox: {
    top: number;
    left: number;
    height: number;
    width: number;
  }
  isBorderColorDefault: boolean;
  annBorderRadius: number;
}

export class AnnotationArrowHead extends React.PureComponent<AnnotationArrowHeadProps> {
  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  static ARROW_PADDING = 5;

  static ARROW_SPACE = AnnotationCard.ANNOTAITON_EL_MARGIN - AnnotationArrowHead.ARROW_PADDING;

  private TRIANGLE_BASE_SIDE_LENGTH = 100;

  private TRIANGLE_POINTING_SIDE_LENGTH = 80;

  getArrowWidthHeight(): {arrowWidth: number, arrowHeight: number} {
    const arrowSpace = AnnotationArrowHead.ARROW_SPACE;
    const ratio = this.TRIANGLE_BASE_SIDE_LENGTH / this.TRIANGLE_POINTING_SIDE_LENGTH;

    const isAnnPosVertical = this.isAnnPosVertical();

    const width = isAnnPosVertical ? arrowSpace * ratio : arrowSpace;
    const height = isAnnPosVertical ? arrowSpace : arrowSpace * ratio;

    return { arrowWidth: width, arrowHeight: height };
  }

  getPositioningStyles(): Record<string, string> {
    const styles: Record<string, string> = {};

    const {
      top: maskBoxTop,
      left: maskBoxLeft,
      width: maskBoxWidth,
      height: maskBoxHeight
    } = this.props.maskBoxRect;

    const arrowPadding = AnnotationArrowHead.ARROW_PADDING;

    const arrowLeftOffset = this.props.isBorderColorDefault ? 1 : 0;

    const annPos = this.props.pos;

    const { arrowWidth, arrowHeight } = this.getArrowWidthHeight();

    if (annPos === 'l' || annPos === 'r') {
      let top = this.props.box.top + this.props.box.height / 2 - arrowHeight / 2;
      if (annPos === 'l') {
        styles.left = `${maskBoxLeft - arrowWidth - arrowPadding - arrowLeftOffset}px`;
      } else {
        styles.left = `${maskBoxLeft + maskBoxWidth + arrowPadding + arrowLeftOffset}px`;
      }
      if (top + arrowHeight > this.props.annBox.top + this.props.annBox.height - this.props.annBorderRadius / 2) {
        const diff = (top + arrowHeight) - (this.props.annBox.top + this.props.annBox.height);
        top -= diff + this.props.annBorderRadius / 2;
      } else if (top < this.props.annBox.top + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.top - top;
        top += diff + this.props.annBorderRadius / 2;
      }
      styles.top = `${top}px`;
    } else {
      let left = this.props.box.left + this.props.box.width / 2 - arrowWidth / 2;
      if (annPos === 't') {
        styles.top = `${maskBoxTop - arrowHeight - arrowPadding - arrowLeftOffset}px`;
      } else {
        styles.top = `${maskBoxTop + maskBoxHeight + arrowPadding + arrowLeftOffset}px`;
      }
      if (left + arrowWidth >= this.props.annBox.left + this.props.annBox.width - this.props.annBorderRadius / 2) {
        const diff = (left + arrowWidth) - (this.props.annBox.left + this.props.annBox.width);
        left -= diff + this.props.annBorderRadius / 2;
      } else if (left < this.props.annBox.left + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.left - left;
        left += diff + this.props.annBorderRadius / 2;
      }
      styles.left = `${left}px`;
    }

    return {
      position: 'absolute',
      zIndex: '2',
      ...styles,
    };
  }

  getTransformRotateStyle(): {transform: string} {
    if (this.props.pos === 't' || this.props.pos === 'r') {
      return { transform: 'rotate(180deg)' };
    }
    return { transform: 'rotate(0deg)' };
  }

  isAnnPosVertical = (): boolean => this.props.pos === 't' || this.props.pos === 'b';

  getViewBox(): string {
    if (this.isAnnPosVertical()) {
      return `
      -${this.TRIANGLE_BASE_SIDE_LENGTH / 2} 0 ${this.TRIANGLE_BASE_SIDE_LENGTH} ${this.TRIANGLE_POINTING_SIDE_LENGTH}`;
    }
    return `0 0 ${this.TRIANGLE_POINTING_SIDE_LENGTH} ${this.TRIANGLE_BASE_SIDE_LENGTH}`;
  }

  getTrianglePath = (): string => {
    const CURVE_START_OFFSET = 14;
    const CURVE_VAL = 1;

    if (this.isAnnPosVertical()) {
      const startCurvePoint = {
        x: 0 - CURVE_START_OFFSET,
        y: 0 + CURVE_START_OFFSET
      };
      const endCurvePoint = {
        x: 0 + CURVE_START_OFFSET,
        y: 0 + CURVE_START_OFFSET
      };
      return `
      M-${this.TRIANGLE_BASE_SIDE_LENGTH / 2} ${this.TRIANGLE_POINTING_SIDE_LENGTH}
      L${startCurvePoint.x} ${startCurvePoint.y}
      C${startCurvePoint.x} ${startCurvePoint.y}, 
        0 ${CURVE_VAL}, 
        ${endCurvePoint.x} ${endCurvePoint.y}
      L${endCurvePoint.x} ${endCurvePoint.y}
      L${this.TRIANGLE_BASE_SIDE_LENGTH / 2} ${this.TRIANGLE_POINTING_SIDE_LENGTH}
      Z
      `;
    }

    const startCurvePoint = {
      x: this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_START_OFFSET,
      y: this.TRIANGLE_BASE_SIDE_LENGTH / 2 - CURVE_START_OFFSET
    };
    const endCurvePoint = {
      x: this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_START_OFFSET,
      y: this.TRIANGLE_BASE_SIDE_LENGTH / 2 + CURVE_START_OFFSET
    };
    return `
      M0 0
      L${startCurvePoint.x} ${startCurvePoint.y}
      C${startCurvePoint.x} ${startCurvePoint.y}, 
        ${this.TRIANGLE_POINTING_SIDE_LENGTH - CURVE_VAL} ${this.TRIANGLE_BASE_SIDE_LENGTH / 2}, 
        ${endCurvePoint.x} ${endCurvePoint.y}
      L${endCurvePoint.x} ${endCurvePoint.y}
      L0 ${this.TRIANGLE_BASE_SIDE_LENGTH}
      Z
    `;
  };

  render(): JSX.Element {
    const { arrowWidth, arrowHeight } = this.getArrowWidthHeight();

    return (
      <div
        style={{
          ...this.getPositioningStyles(),
          width: `${arrowWidth}px`,
          height: `${arrowHeight}px`
        }}
        ref={this.conRef}
      >
        <svg
          width={`${arrowWidth}px`}
          height={`${arrowHeight}px`}
          viewBox={this.getViewBox()}
          style={{ ...this.getTransformRotateStyle(), verticalAlign: 'top' }}
        >
          <path
            fill={this.props.arrowColor}
            d={this.getTrianglePath()}
          />
        </svg>
      </div>
    );
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
  dimForCustomAnnotation: { w: number, h: number };
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
  maskBox: Rect | null;
}

interface IConProps {
  data: Array<IAnnProps>,
  nav: NavFn,
  win: Window,
  playMode: boolean,
  tourId: number;
  applyDiffAndGoToAnn: ApplyDiffAndGoToAnn,
  allFlows: string[],
  currentFlowMain: string,
  updateCurrentFlowMain: (main: string)=> void,
  updateJourneyProgress: (annRefId: string)=>void,
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
  tourId: number,
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
}

function handleEventLogging(
  btn_id: string,
  btn_type: IAnnotationButtonType,
  ann_id: string,
  tour_id: number,
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
              this.props.navigateToAdjacentAnn('next', btnConf.id);
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

      const navigateToAdjacentAnn: NavigateToAdjacentAnn = (type: 'prev' | 'next' | 'custom', btnId: string): void => {
        const config = p.conf.config;
        const btnConf = type === 'custom'
          ? config.buttons.filter(button => button.id === btnId)[0]
          : config.buttons.filter(button => button.type === type)[0];
        const isNavToVideoAnn = type === 'prev' ? p.isPrevAnnVideo : p.isNextAnnVideo;

        if (btnConf.type === 'next' && this.props.currentFlowMain) {
          this.props.updateJourneyProgress(p.conf.config.refId);
        }

        if (!btnConf.hotspot) {
          if (this.props.playMode) {
            const currentFlowMainIndex = this.props.allFlows.findIndex((flow) => flow === this.props.currentFlowMain);
            if (btnConf.type === 'next' && currentFlowMainIndex < this.props.allFlows.length - 1) {
              const nextMain = this.props.allFlows[currentFlowMainIndex + 1];
              this.props.applyDiffAndGoToAnn(config.refId, nextMain, isNavToVideoAnn);
              this.props.updateCurrentFlowMain(nextMain);
            } else if (btnConf.type === 'prev' && currentFlowMainIndex > 0) {
              const prevMain = this.props.allFlows[currentFlowMainIndex - 1];
              this.props.applyDiffAndGoToAnn(config.refId, prevMain, isNavToVideoAnn);
              this.props.updateCurrentFlowMain(prevMain);
            }
          }
          return;
        }

        if (type === 'custom' || !this.props.playMode) {
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
            maskBox={p.maskBox}
          />}
        </div>
      );
    }).filter(el => el) as JSX.Element[];
  }
}
