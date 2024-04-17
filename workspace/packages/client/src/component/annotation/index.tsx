import {
  AnnotationButtonStyle,
  AnnotationPositions,
  CoverAnnotationPositions,
  CustomAnnotationPosition,
  IAnnotationButton,
  IAnnotationButtonType,
  IAnnotationConfig,
  ITourDataOpts,
  VideoAnnotationPositions
} from '@fable/common/dist/types';
import React, { Suspense, lazy } from 'react';
import { DEFAULT_ANN_DIMS, sleep } from '@fable/common/dist/utils';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { ExtMsg, InternalEvents, Msg, NavFn, Payload_NavToAnnotation, Payload_Navigation } from '../../types';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import * as Tags from './styled';
import { EMPTY_IFRAME_ID, generateShadeColor, isLeadFormPresent, validateInput } from './utils';
import {
  getTransparencyFromHexStr,
  isCoverAnnotation as isCoverAnn,
  isVideoAnnotation as isVideoAnn
} from '../../utils';
import {
  AnalyticsEvents,
  AnnotationBtnClickedPayload,
  CtaClickedInternal,
  CtaFrom,
  UserAssignPayload
} from '../../analytics/types';
import * as VIDEO_ANN from './video-ann-constants';
import { AnnotationSerialIdMap } from './ops';
import { ApplyDiffAndGoToAnn, NavToAnnByRefIdFn } from '../screen-editor/types';
import { generateCSSSelectorFromText } from '../screen-editor/utils/css-styles';
import { isAnnCustomPosition } from './annotation-config-utils';
import { emitEvent } from '../../internal-events';
import FocusBubble from './focus-bubble';
import { FableLeadContactProps, getGlobalData } from '../../global';
import AnnotationWatermark from '../watermark/annotation-watermark';

export type Positions = AnnotationPositions
  | VideoAnnotationPositions
  | CustomAnnotationPosition
  | CoverAnnotationPositions;

const getBorderRadius = (
  positioning: Positions,
  isCoverAnnotation: boolean,
  showWatermark: boolean,
  arrowDir: AnimEntryDir,
  borderRadius: number
): string => {
  if (!showWatermark) return `${borderRadius}px`;

  if (arrowDir === 't') {
    if (isCoverAnnotation || positioning === 'center') return `${borderRadius}px ${borderRadius}px 0px 0px`;
    return `0px 0px ${borderRadius}px ${borderRadius}px`;
  }

  return `${borderRadius}px ${borderRadius}px 0px 0px`;
};

const AnnotationVideo = lazy(() => import('./video-player'));
interface NavigateToAnnMessage<T> extends MessageEvent{
  data: Msg<T>
}
interface IProps {
  el: HTMLElement;
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  win: Window,
  playMode: boolean,
  tourId: number;
  annotationSerialIdMap: AnnotationSerialIdMap;
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
  isThemeAnnotation?: boolean;
  maskBox: Rect | null;
  nav: NavFn
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
  doc?: Document,
  isProbing?: boolean,
}> {
  static readonly MIN_WIDTH = DEFAULT_ANN_DIMS.width;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private readonly contentRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount(): void {
    if (this.props.onRender) {
      if (this.contentRef.current) {
        const annTextP = this.contentRef.current.querySelector('p') || this.contentRef.current;
        const defaultFontFamily = this.props.opts.annotationFontFamily || getComputedStyle(annTextP!).fontFamily;

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
        primaryColor={this.props.opts.primaryColor}
        fontColor={this.props.opts.annotationFontColor}
        borderRadius={this.props.opts.borderRadius}
        padding={this.props.opts.annotationPadding.split(/\s+/).map(v => (Number.isFinite(+v) ? +v : 14)) as [number, number]}
        bgColor={this.props.opts.annotationBodyBackgroundColor}
        style={{
          minWidth: `${this.props.config.size === 'custom' ? 0 : AnnotationContent.MIN_WIDTH}px`,
          width: `${this.props.width}px`,
          display: this.props.isInDisplay ? 'flex' : 'none',
          visibility: 'visible',
          left: this.props.left,
          top: this.props.top,
          fontSize: '18px',
          boxShadow: this.getAnnotationBorder(this.props.config.showOverlay),
          borderRadius: getBorderRadius(
            this.props.config.positioning,
            isCoverAnn(this.props.config),
            this.props.opts.showFableWatermark,
            this.props.dir,
            this.props.opts.borderRadius
          ),
          position: this.props.isThemeAnnotation ? 'unset' : 'absolute',
        }}
        id={this.props.isProbing ? '' : 'fable-ann-card-rendered'}
        className={`fable-ann-card f-a-c-${this.props.config.refId} dir-${this.props.dir}`}
      >
        <Tags.AnInnerContainer
          anPadding={this.props.opts.annotationPadding.trim()}
          className="f-inner-con"
        >
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          {
            this.props.config.isLeadFormPresent ? (
              <form target={EMPTY_IFRAME_ID} action="about:blank">
                <Tags.AnTextContent
                  fontFamily={this.props.opts.annotationFontFamily}
                  fontColor={this.props.opts.annotationFontColor}
                  ref={this.contentRef}
                  borderRadius={this.props.opts.borderRadius}
                  dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
                  className="f-text"
                />
              </form>
            ) : (
              <Tags.AnTextContent
                fontFamily={this.props.opts.annotationFontFamily}
                fontColor={this.props.opts.annotationFontColor}
                ref={this.contentRef}
                borderRadius={this.props.opts.borderRadius}
                dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
                className="f-text"
              />
            )
          }
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
                  noPad={btnConf.type === 'prev' && this.props.config.buttonLayout === 'default'}
                  btnStyle={btnConf.type === 'prev' && this.props.config.buttonLayout === 'default' ? AnnotationButtonStyle.Link : btnConf.style}
                  color={this.props.opts.primaryColor}
                  size={btnConf.size}
                  fontFamily={this.props.opts.annotationFontFamily}
                  btnLayout={this.props.config.buttonLayout}
                  borderRadius={this.props.opts.borderRadius}
                  onClick={() => {
                    if (this.conRef.current && isLeadFormPresent(this.conRef.current) && btnConf.type === 'next') {
                      const leadFormFields = this.conRef.current?.getElementsByClassName('LeadForm__optionContainer');

                      let shouldNavigate = true;
                      const leadForm: Record<string, string> = {};
                      if (leadFormFields) {
                        for (const field of Array.from(leadFormFields)) {
                          const { isValid, fieldName, fieldValue } = validateInput(field as HTMLDivElement);
                          if (!isValid) shouldNavigate = false;
                          leadForm[fieldName] = fieldValue;
                        }
                      }

                      if (shouldNavigate) {
                        setTimeout(() => {
                          const evt: FableLeadContactProps = {
                            ...leadForm,
                            email: leadForm.email
                          };
                          emitEvent<Partial<FableLeadContactProps>>(InternalEvents.LeadAssign, evt);
                        }, 16);

                        setTimeout(() => this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id), 0);
                      }
                    } else {
                      setTimeout(() => this.props.navigateToAdjacentAnn(btnConf.type, btnConf.id), 0);
                    }
                  }}
                >
                  <span>{
                    btnConf.type === 'prev' && this.props.config.buttonLayout === 'default' ? (
                      <ArrowLeftOutlined style={{
                        fontSize: '1.5rem',
                        color: this.props.opts.primaryColor
                      }}
                      />) : btnConf.text
                    }
                  </span>
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

  static readonly MIN_SPACE = 4;

  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  private transitionTimer : number | NodeJS.Timeout = 0;

  private SELECTION_BUBBLE_DIAMETER = 18;

  private SELECTION_BUBBLE_MARGIN = 8;

  componentDidMount(): void {
    if (!this.props.annotationDisplayConfig.prerender) {
      window.addEventListener('message', this.receiveMessage, false);
    }
    if (this.conRef.current && !this.props.annotationDisplayConfig.prerender) { this.resetAnnPos(); }
    if (this.props.annotationDisplayConfig.isMaximized) {
      emitEvent<Partial<Payload_Navigation>>(InternalEvents.OnNavigation, {
        currentAnnotationRefId: this.props.annotationDisplayConfig.config.refId
      });
    }
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

    if (prevProps.annotationDisplayConfig.isMaximized !== this.props.annotationDisplayConfig.isMaximized
       && this.props.annotationDisplayConfig.isMaximized) {
      emitEvent<Partial<Payload_Navigation>>(InternalEvents.OnNavigation, {
        currentAnnotationRefId: this.props.annotationDisplayConfig.config.refId
      });
      if (this.conRef.current && this.props.annotationDisplayConfig.isVideoAnnotation) { this.resetAnnPos(); }
    }

    if (!this.props.annotationDisplayConfig.prerender && prevProps.annotationDisplayConfig.prerender) {
      window.addEventListener('message', this.receiveMessage, false);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('message', this.receiveMessage, false);

    clearTimeout(this.transitionTimer);
    this.transitionTimer = 0;
  }

  receiveMessage = (e: NavigateToAnnMessage<Payload_NavToAnnotation>): void => {
    if (e.data.sender !== 'sharefable.com') return;
    if (e.data.type === ExtMsg.NavToAnnotation) {
      if (e.data.payload.main && this.props.annotationDisplayConfig.isMaximized) {
        this.props.nav(e.data.payload.main, 'annotation-hotspot');
      } else if (e.data.payload.action && this.props.annotationDisplayConfig.isMaximized) {
        const btnConfig = this.props.annotationDisplayConfig.config.buttons.filter(
          button => button.type === e.data.payload.action
        )[0];
        this.props.navigateToAdjacentAnn(e.data.payload.action, btnConfig.id);
      }
    }
  };

  resetAnnPos = (): void => {
    this.transitionTimer = setTimeout(() => {
      this.conRef.current!.style.transition = 'transform 0.3s ease-out';
      this.conRef.current!.style.transform = 'translate(0px, 0px)';
    }, 48);
  };

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

  getAutoDefaultAndVideoAnnRenderingData = (w: number, h: number,): {
    l: number,
    t: number,
    dir: AnimEntryDir,
    isUltrawideBox: boolean
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const elBox = this.props.box;
    const winW = displayConfig.windowWidth;
    const winH = displayConfig.windowHeight;

    let l = -9999;
    let t = -9999;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox = false;

    if (!displayConfig.isInViewPort) return { l, t, dir, isUltrawideBox };
    if (displayConfig.isVideoAnnotation && displayConfig.config.positioning === 'center') {
      t = winH / 2 - h / 2;
      l = winW / 2 - w / 2;
      return { l, t, dir, isUltrawideBox };
    }

    if (displayConfig.isVideoAnnotation && displayConfig.config.positioning === VideoAnnotationPositions.BottomLeft) {
      t = winH - h - 20;
      l = 20;
      return { l, t, dir, isUltrawideBox };
    }

    if (displayConfig.isVideoAnnotation && displayConfig.config.positioning === VideoAnnotationPositions.BottomRight) {
      t = winH - h - 20;
      l = winW - w - 20;
      return { l, t, dir, isUltrawideBox };
    }

    const extraSpace = displayConfig.opts.borderRadius;

    const maskBoxPadding = this.props.maskBox
      ? HighlighterBase.getMaskPaddingWithBox(this.props.box, this.props.maskBox)
      : { left: 0, right: 0, top: 0, bottom: 0 };

    const LEFT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.left;
    const RIGHT_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.right;
    const TOP_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.top;
    const BOTTOM_ANN_EL_MARGIN = AnnotationCard.ANNOTAITON_EL_MARGIN + maskBoxPadding.bottom;

    const leftSpace = elBox.left;
    const rightSpace = winW - elBox.right;
    const ml = leftSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
    const mr = rightSpace / (w + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
    let p: 'l' | 'r' | 't' | 'b' | undefined;
    let isHorDir = false;
    if (ml > 1 || mr > 1) {
      p = ml > mr ? 'l' : 'r';
      isHorDir = true;
    }
    if (isHorDir) {
      t = elBox.top + elBox.height / 2 - (h / 2);

      if (t <= TOP_ANN_EL_MARGIN) {
        // If the top of the annotation is outside the viewport
        t = Math.max(elBox.top - HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.top);
      }
      if (t + h + TOP_ANN_EL_MARGIN >= winH) {
        // If the bottom of the annotation is outside the viewport
        t = Math.min(elBox.bottom - h + HighlighterBase.ANNOTATION_PADDING_ONE_SIDE, elBox.bottom - h);
      }

      if (t - extraSpace <= AnnotationCard.MIN_SPACE || t + h + extraSpace >= winH) {
        isHorDir = false;
      }

      if (p === 'l') {
        l = elBox.left - w - LEFT_ANN_EL_MARGIN;
      } else {
        l = elBox.right + RIGHT_ANN_EL_MARGIN;
      }
    }

    if (!isHorDir) {
      const topSpace = elBox.top;
      const bottomSpace = winH - elBox.bottom;
      const mt = topSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
      const mb = bottomSpace / (h + AnnotationCard.BREATHING_SPACE_RATIO + extraSpace);
      if (mb > 1 || mt > 1) {
        p = mb > mt ? 'b' : 't';
      }
      if (p === 't' || p === 'b') {
        l = elBox.left + elBox.width / 2 - (w / 2);

        if (l + w > winW) {
          l = winW - w - extraSpace;
        } else if (l < 0) {
          l = extraSpace;
        }

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

  getCoverAnnRenderingData = (w: number, h: number,): {
    l: number,
    t: number,
  } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const winW = displayConfig.windowWidth;
    const winH = displayConfig.windowHeight;
    const pos = displayConfig.config.positioning;

    let l = winW / 2 - w / 2;
    const t = winH / 2 - h / 2;

    if (pos === CoverAnnotationPositions.LEFT) {
      l = winW / 4 - w / 2;
    }
    if (pos === CoverAnnotationPositions.RIGHT) {
      l = winW / 2 + winW / 4 - w / 2;
    }

    return { l, t };
  };

  adjustTopLeftOfAnn = (
    l: number,
    t: number,
    w: number,
    h: number,
    dir: AnimEntryDir,
  ): { l: number, t: number } => {
    const displayConfig = this.props.annotationDisplayConfig;
    const elBox = this.props.box;

    const annBox = {
      top: t,
      left: l,
      width: w,
      height: h,
    };

    const borderRadius = displayConfig.opts.borderRadius;
    const arrowWidth = 30;
    const arrowHeight = arrowWidth;

    if (dir === 'l' || dir === 'r') {
      let arrowTop = elBox.top + elBox.height / 2 - arrowWidth / 2;
      if (arrowTop + arrowHeight > annBox.top + annBox.height - borderRadius) {
        const diff = (arrowTop + arrowHeight) - (annBox.top + annBox.height);
        arrowTop -= diff;
      } else if (arrowTop < annBox.top + borderRadius) {
        const diff = annBox.top - arrowTop;
        arrowTop += diff;
      }
      if (elBox.height < annBox.height) {
        if (arrowTop < t + borderRadius) {
          t -= borderRadius;
        } else if (arrowTop + arrowWidth > t + h - borderRadius) {
          t += borderRadius;
        }
      }
    }

    if (dir === 't' || dir === 'b') {
      let arrowLeft = elBox.left + elBox.width / 2 - arrowWidth / 2;
      if (arrowLeft + arrowWidth >= annBox.left + annBox.width - borderRadius) {
        const diff = (arrowLeft + arrowWidth) - (annBox.left + annBox.width);
        arrowLeft -= diff;
      } else if (arrowLeft < annBox.left + borderRadius) {
        const diff = annBox.left - arrowLeft;
        arrowLeft += diff;
      }
      if (elBox.width < annBox.width) {
        if (arrowLeft <= l + borderRadius) {
          l -= borderRadius;
        } else if (arrowLeft + arrowWidth >= l + w - borderRadius) {
          l += borderRadius;
        }
      }
    }

    return { t, l };
  };

  getCustomDefaultAndVideoAnnPosDir = (): AnimEntryDir => {
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
  getCustomDefaultAndVideoAnnPosLeft = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomDefaultAndVideoAnnPosDir();
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

  getCustomDefaultAndVideoAnnPosTop = (w: number, h: number): number => {
    const pos = this.props.annotationDisplayConfig.config.positioning;
    const dir = this.getCustomDefaultAndVideoAnnPosDir();
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

    if (l < AnnotationCard.MIN_SPACE) return true;
    if (t < AnnotationCard.MIN_SPACE) return true;
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

  getFocusBubbleStyles = (maskBoxRect: Rect, dir: AnimEntryDir) : React.CSSProperties => {
    const {
      top: maskBoxTop,
      left: maskBoxLeft,
      width: maskBoxWidth,
      height: maskBoxHeight
    } = maskBoxRect;

    const annPos = dir;
    const styles: Record<string, string> = {};

    if (annPos === 'l' || annPos === 'r') {
      if (annPos === 'l') {
        styles.left = `${maskBoxLeft - this.SELECTION_BUBBLE_DIAMETER / 2 + this.SELECTION_BUBBLE_MARGIN}px`;
      } else {
        styles.left = `${
          maskBoxLeft + maskBoxWidth - this.SELECTION_BUBBLE_DIAMETER / 2 - this.SELECTION_BUBBLE_MARGIN}px`;
      }
      styles.top = `${maskBoxTop + maskBoxHeight / 2 - this.SELECTION_BUBBLE_DIAMETER / 2}px`;
    } else {
      if (annPos === 't') {
        styles.top = `${maskBoxTop - this.SELECTION_BUBBLE_DIAMETER / 2 + this.SELECTION_BUBBLE_MARGIN}px`;
      } else {
        styles.top = `${
          maskBoxTop + maskBoxHeight - this.SELECTION_BUBBLE_DIAMETER / 2 - this.SELECTION_BUBBLE_MARGIN}px`;
      }
      styles.left = `${maskBoxLeft + maskBoxWidth / 2 - this.SELECTION_BUBBLE_DIAMETER / 2}px`;
    }

    return styles;
  };

  // TODO[refactor]
  //  Multiple branching besed render happens leading to similar configuration of same component. Make a single render
  //  by calculating the variables / configs via branching and applying those variables / config on the singular
  //  rendered component
  render(): JSX.Element {
    const { w, h } = this.getAnnWidthHeight();
    const displayConfig = this.props.annotationDisplayConfig;

    const config = displayConfig.config;
    const isVideoAnnotation = isVideoAnn(config);
    const isCoverAnnotation = isCoverAnn(config);

    let t: number = 0;
    let l: number = 0;
    let dir: AnimEntryDir = 't';
    let isUltrawideBox: boolean = false;

    const annType = isVideoAnn(config) ? 'video' : config.type;

    if (annType === 'default' || annType === 'video') {
      let showAutoPositioning = !isAnnCustomPosition(this.props.annotationDisplayConfig.config.positioning);

      if (!showAutoPositioning) {
        l = this.getCustomDefaultAndVideoAnnPosLeft(w, h);
        t = this.getCustomDefaultAndVideoAnnPosTop(w, h);
        dir = this.getCustomDefaultAndVideoAnnPosDir();

        const adjustedPos = this.adjustTopLeftOfAnn(l, t, w, h, dir);
        l = adjustedPos.l;
        t = adjustedPos.t;

        const annOutsideOfViewport = this.isAnnOutSideOfViewPort(l, t, w, h);

        if (annOutsideOfViewport) { showAutoPositioning = true; }
      }

      if (showAutoPositioning) {
        const renderingData = this.getAutoDefaultAndVideoAnnRenderingData(w, h);
        t = renderingData.t;
        l = renderingData.l;
        dir = renderingData.dir;
        isUltrawideBox = renderingData.isUltrawideBox;

        if (!isUltrawideBox) {
          const adjustedPos = this.adjustTopLeftOfAnn(l, t, w, h, dir);
          l = adjustedPos.l;
          t = adjustedPos.t;
        }
      }
    }

    if (annType === 'cover') {
      const renderingData = this.getCoverAnnRenderingData(w, h);
      t = renderingData.t;
      l = renderingData.l;
    }

    const [cdx, cdy] = HighlighterBase.getCumulativeDxDy(this.props.win);
    const maskBoxRect = HighlighterBase.getMaskBoxRect(this.props.box, this.props.win, cdx, cdy);
    let arrowColor = this.props.annotationDisplayConfig.opts.annotationBodyBorderColor;
    let isBorderColorDefault = false;
    if (arrowColor.toUpperCase() === '#BDBDBD' || getTransparencyFromHexStr(arrowColor) <= 30) {
      arrowColor = this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor;
      isBorderColorDefault = true;
    }

    const d = 30;
    let tx = 0;
    let ty = 0;

    if (!isCoverAnnotation && !(
      this.props.annotationDisplayConfig.config.positioning === VideoAnnotationPositions.BottomLeft
      || this.props.annotationDisplayConfig.config.positioning === VideoAnnotationPositions.BottomRight)) {
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
        { !this.props.annotationDisplayConfig.config.hideAnnotation && (
          <div
            ref={this.conRef}
            style={{
              transform: this.props.isThemeAnnotation || this.props.annotationDisplayConfig.prerender
                ? 'none' : `translate(${tx}px, ${ty}px)`,
            }}
          >
            {/* this is arrow head */}
            {
            this.shouldShowArrowHead() && !isUltrawideBox && (
              <AnnotationIndicator
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
            {/* this is video annotation */}
            <Suspense fallback={null}>
              {
                isVideoAnnotation && (
                <AnnotationVideo
                  borderRadius={getBorderRadius(
                    this.props.annotationDisplayConfig.config.positioning,
                    isCoverAnnotation,
                    this.props.annotationDisplayConfig.opts.showFableWatermark,
                    dir,
                    this.props.annotationDisplayConfig.opts.borderRadius
                  )}
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
                />
                )
              }
            </Suspense>
            {/* this is normal annotation content */}
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

            {!displayConfig.prerender
            && this.props.annotationDisplayConfig.opts.showFableWatermark
            && (
              <AnnotationWatermark
                borderRadius={this.props.annotationDisplayConfig.opts.borderRadius}
                isVideoAnn={isVideoAnn(config)}
                bgColor={this.props.annotationDisplayConfig.opts.annotationBodyBackgroundColor}
                fontColor={this.props.annotationDisplayConfig.opts.annotationFontColor}
                top={t}
                left={l}
                height={h}
                width={w}
                arrowDir={dir}
                isCoverAnn={isCoverAnn(config)}
                positioning={this.props.annotationDisplayConfig.config.positioning}
              />
            )}
          </div>
        )}

        {/* this is focus bubble */}
        {
          config.selectionShape === 'pulse' && !isCoverAnn(config) && !displayConfig.prerender && <FocusBubble
            diameter={this.SELECTION_BUBBLE_DIAMETER}
            style={{
              position: 'absolute',
              ...this.getFocusBubbleStyles(maskBoxRect, dir)
            }}
            selColor={config.annotationSelectionColor}
          />
        }

        {/* this is selection effect */}
        {
          config.selectionEffect === 'blinking'
          && config.selectionShape !== 'pulse'
          && !isCoverAnn(config)
          && !displayConfig.prerender
          && <Tags.AnHotspot
            shouldAnimate
            className="blinking-el-mask"
            selColor={config.annotationSelectionColor}
            box={maskBoxRect}
            scrollX={this.props.win.scrollX}
            scrollY={this.props.win.scrollY}
            style={{ borderRadius: getComputedStyle(this.props.el).borderRadius || '2px' }}
          />
        }
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

export class AnnotationIndicator extends React.PureComponent<AnnotationArrowHeadProps> {
  conRef: React.RefObject<HTMLDivElement> = React.createRef();

  static ARROW_PADDING = 5;

  static ARROW_SPACE = AnnotationCard.ANNOTAITON_EL_MARGIN - AnnotationIndicator.ARROW_PADDING;

  private TRIANGLE_BASE_SIDE_LENGTH = 200;

  private TRIANGLE_POINTING_SIDE_LENGTH = 100;

  getArrowWidthHeight(): {arrowWidth: number, arrowHeight: number} {
    const arrowSpace = AnnotationIndicator.ARROW_SPACE;
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

    const arrowPadding = AnnotationIndicator.ARROW_PADDING;

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
        top -= diff + this.props.annBorderRadius;
      } else if (top < this.props.annBox.top + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.top - top;
        top += diff + this.props.annBorderRadius;
      }

      // hide the arrow if the arrow goes out of the el box
      const verCenterOfArrow = top + arrowHeight / 2;
      if (verCenterOfArrow < this.props.maskBoxRect.top
        || verCenterOfArrow > this.props.maskBoxRect.top + this.props.maskBoxRect.height) {
        styles.display = 'none';
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
        left -= diff + this.props.annBorderRadius;
      } else if (left < this.props.annBox.left + this.props.annBorderRadius / 2) {
        const diff = this.props.annBox.left - left;
        left += diff + this.props.annBorderRadius;
      }

      // hide the arrow if the arrow goes out of the el box
      const horCenterOfArrow = left + arrowWidth / 2;
      if (horCenterOfArrow < this.props.maskBoxRect.left
        || horCenterOfArrow > this.props.maskBoxRect.left + this.props.maskBoxRect.width) {
        styles.display = 'none';
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
          style={{
            ...this.getTransformRotateStyle(),
            verticalAlign: 'top',
            width: `${arrowWidth}px`,
            height: `${arrowHeight}px`,
            filter: 'none',
            margin: 0
          }}
        >
          <path
            className="fab-arr-path"
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
  isElVisible: boolean;
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
  el: HTMLElement;
  hotspotEl: HTMLElement | null;
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
  updateCurrentFlowMain: (btnType: IAnnotationButtonType, main?: string)=> void,
  updateJourneyProgress: (annRefId: string)=>void,
  navigateToAnnByRefIdOnSameScreen: NavToAnnByRefIdFn,
  onCompMount: ()=>void
}

interface HotspotProps {
  data: Array<{
    win: Window,
    el: HTMLElement,
    hotspotEl: HTMLElement | null,
    opts: ITourDataOpts,
    conf: IAnnotationConfig,
    box: Rect,
    scrollX: number,
    scrollY: number,
    isGranularHotspot: boolean,
    isNextAnnVideo: boolean,
    annotationIndexString: string
  }>,
  playMode: boolean,
  navigateToAdjacentAnn: NavigateToAdjacentAnn,
}

function handleEventLogging(
  btn: IAnnotationButton,
  tour_id: number,
  annotationConfig: IAnnotationConfig
): void {
  setTimeout(() => {
    const btnClickedpayload: AnnotationBtnClickedPayload = {
      tour_id, ann_id: annotationConfig.refId, btn_id: btn.id, btn_type: btn.type
    };

    emitEvent<Partial<AnnotationBtnClickedPayload>>(InternalEvents.OnAnnotationNav, {
      ...btnClickedpayload,
    });

    if ((btn.type === 'custom' || btn.type === 'next') && btn.hotspot && btn.hotspot.actionType === 'open') {
      emitEvent<Partial<CtaClickedInternal>>(InternalEvents.OnCtaClicked, {
        ctaFrom: CtaFrom.Annotation,
        btnId: btn.id,
        url: btn.hotspot!.actionValue,
        btnTxt: btn.text
      });
    }
    // logEvent(AnalyticsEvents.TIME_SPENT_IN_ANN, timeSpentOnAnnPayload);
  }, 0);
}

export class AnnotationHotspot extends React.PureComponent<HotspotProps> {
  render(): (JSX.Element | null)[] {
    return this.props.data.map((p, idx) => {
      const btnConf = p.conf.buttons.filter(button => button.type === 'next')[0];
      const [cdx, cdy] = HighlighterBase.getCumulativeDxDy(p.win);
      const maskBoxRect = HighlighterBase.getMaskBoxRect(p.box, p.win, cdx, cdy);

      /**
       * If we show the annotation in edit mode, the user won't be able to select any
       * element inside the element.
       * For that reason, we have this check where we show the hotspot only when the
       * screen is in play mode or it is a granular hotspot.
       */
      if (this.props.playMode || p.isGranularHotspot) {
        return (
          <Tags.AnHotspot
            style={{ borderRadius: getComputedStyle(p.isGranularHotspot ? p.hotspotEl! : p.el).borderRadius || '2px' }}
            key={p.conf.id}
            box={maskBoxRect}
            selColor={p.conf.annotationSelectionColor}
            scrollX={p.scrollX}
            scrollY={p.scrollY}
            shouldAnimate={p.isGranularHotspot}
            className="fable-hotspot"
            onClick={() => {
              this.props.navigateToAdjacentAnn('next', btnConf.id);
            }}
          />
        );
      }

      return null;
    });
  }
}

interface AnnBubbleProps {
  conf: IAnnotationConfig,
  box: Rect,
  navigateToAnnByRefId: NavToAnnByRefIdFn;
  isElVisible: boolean;
  win: Window;
}

export class AnnotationBubble extends React.PureComponent<AnnBubbleProps> {
  render(): (JSX.Element) {
    const bubbleWidth = 18;
    const midPoint = this.props.win.innerHeight / 2;
    const left = this.props.box.left - bubbleWidth / 2;
    let top = this.props.box.top - bubbleWidth / 2;
    if (!this.props.isElVisible) {
      if (top < midPoint) {
        top = 0 - bubbleWidth / 2;
      } else {
        top = this.props.win.innerHeight - bubbleWidth / 2;
      }
    }
    return (
      <>
        <Tags.AnBubble
          style={{
            position: 'absolute',
            top: `${top}px`,
            left: `${left}px`,
          }}
          className="fable-multi-ann-marker"
          onClick={() => {
            this.props.navigateToAnnByRefId(this.props.conf.refId);
          }}
          bubbleWidth={bubbleWidth}
        >
          <FocusBubble diameter={bubbleWidth} selColor={this.props.conf.annotationSelectionColor} />
        </Tags.AnBubble>
      </>
    );
  }
}

export class AnnotationCon extends React.PureComponent<IConProps> {
  componentDidMount(): void {
    this.props.onCompMount();
  }

  componentDidUpdate(prevProps: Readonly<IConProps>, prevState: Readonly<{}>, snapshot?: any): void {
    this.props.onCompMount();
  }

  render(): JSX.Element[] {
    return this.props.data.map((p) => {
      if (!p.conf.isMaximized && !p.conf.prerender) {
        return <AnnotationBubble
          key={p.conf.config.id}
          conf={p.conf.config}
          box={p.box}
          navigateToAnnByRefId={this.props.navigateToAnnByRefIdOnSameScreen}
          isElVisible={p.conf.isElVisible}
          win={this.props.win}
        />;
      }

      if (!p.conf.isElVisible && !p.conf.prerender) return null;

      const hideAnnotation = p.conf.config.hideAnnotation; /* || isVideoAnn(p.conf.config) */
      const isHotspot = p.conf.config.isHotspot;
      const isGranularHotspot = Boolean(isHotspot && p.hotspotBox);

      const navigateToAdjacentAnn: NavigateToAdjacentAnn = (type: 'prev' | 'next' | 'custom', btnId: string): void => {
        const config = p.conf.config;
        const btnConf = type === 'custom'
          ? config.buttons.filter(button => button.id === btnId)[0]
          : config.buttons.filter(button => button.type === type)[0];
        const isNavToVideoAnn = type === 'prev' ? p.isPrevAnnVideo : p.isNextAnnVideo;

        handleEventLogging(
          btnConf,
          this.props.tourId,
          p.conf.config
        );

        if (btnConf.type === 'next') {
          this.props.updateJourneyProgress(p.conf.config.refId);
        }

        if (!btnConf.hotspot) {
          if (this.props.playMode) {
            this.props.updateCurrentFlowMain(btnConf.type);
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

      const maskBoxPadding = p.maskBox
        ? HighlighterBase.getMaskPaddingWithBox(p.box, p.maskBox)
        : { left: 0, right: 0, top: 0, bottom: 0 };

      return (
        <div
          key={p.conf.config.id}
          style={{
            position: 'absolute',
            zIndex: '2',
          }}
        >
          {
            isHotspot && <AnnotationHotspot
              data={[{
                win: this.props.win,
                el: p.el,
                hotspotEl: p.hotspotEl,
                opts: p.conf.opts,
                conf: p.conf.config,
                box: isGranularHotspot ? p.hotspotBox! : p.box,
                scrollX: this.props.win.scrollX,
                scrollY: this.props.win.scrollY,
                isGranularHotspot,
                isNextAnnVideo: p.isNextAnnVideo,
                annotationIndexString: p.annotationSerialIdMap[p.conf.config.refId]
              }]}
              playMode={this.props.playMode}
              navigateToAdjacentAnn={navigateToAdjacentAnn}
            />
          }
          <AnnotationCard
            el={p.el}
            annotationSerialIdMap={p.annotationSerialIdMap}
            annotationDisplayConfig={p.conf}
            box={p.box}
            win={this.props.win}
            playMode={this.props.playMode}
            tourId={this.props.tourId}
            navigateToAdjacentAnn={navigateToAdjacentAnn}
            maskBox={p.maskBox}
            nav={this.props.nav}
          />
        </div>
      );
    }).filter(el => el) as JSX.Element[];
  }
}
