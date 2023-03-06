import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { NavFn } from '../../types';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import * as Tags from './styled';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: Rect,
  nav: NavFn,
  win: Window,
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
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* TODO: use some other mechanism to populate the following
          div with bodyContent. DO NOT USE "dangerouslySetInnerHTML" */}
          <Tags.AnTextContent
            ref={this.contentRef}
            dangerouslySetInnerHTML={{ __html: this.props.config.bodyContent }}
          />
          <div style={{
            display: 'flex',
            justifyContent: btns.length > 1 ? 'space-between' : 'center',
            alignItems: 'center',
            marginTop: '1rem'
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
        w = this.props.annotationDisplayConfig.dimForMediumAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForMediumAnnotation.h;
      }

      if (boxSize === 'large') {
        w = this.props.annotationDisplayConfig.dimForLargeAnnotation.w;
        h = this.props.annotationDisplayConfig.dimForLargeAnnotation.h;
      }

      if (this.props.annotationDisplayConfig.config.type === 'cover') {
        return <AnnotationContent
          config={this.props.annotationDisplayConfig.config}
          opts={this.props.annotationDisplayConfig.opts}
          isInDisplay={this.props.annotationDisplayConfig.isInViewPort}
          nav={this.props.nav}
          width={w}
          top={winH / 2 - h / 2}
          left={winW / 2 - w / 2}
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
  data: Array<{conf: IAnnoationDisplayConfig, box: Rect}>,
  nav: NavFn,
  win: Window
}
interface HotspotProps {
  data: Array<{conf: IAnnotationConfig, box: Rect, scrollX: number, scrollY: number}>,
  nav: NavFn,
}

export class AnnotationHotspot extends React.PureComponent<HotspotProps> {
  render() {
    return this.props.data.map((p, idx) => {
      const btnConf = p.conf.buttons.filter(button => button.type === 'next')[0];

      return (
        <Tags.AnHotspot
          key={p.conf.id}
          box={p.box}
          scrollX={p.scrollX}
          scrollY={p.scrollY}
          className="fable-hotspot"
          onClick={() => {
            btnConf.hotspot && this.props.nav(
              btnConf.hotspot.actionValue,
              btnConf.hotspot.actionType === 'navigate' ? 'annotation-hotspot' : 'abs'
            );
          }}
        />
      );
    });
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
      return (
        <div key={p.conf.config.id}>
          {
            isHotspot && <AnnotationHotspot
              data={[{
                conf: p.conf.config,
                box: p.box,
                scrollX: this.props.win.scrollX,
                scrollY: this.props.win.scrollY
              }]}
              nav={this.props.nav}
            />
          }
          { !hideAnnotation && <AnnotationCard
            annotationDisplayConfig={p.conf}
            box={p.box}
            nav={this.props.nav}
            win={this.props.win}
          />}
        </div>
      );
    });
  }
}
