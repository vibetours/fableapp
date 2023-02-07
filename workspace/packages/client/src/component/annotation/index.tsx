import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { NavFn } from '../../types';
import * as Tags from './styled';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: DOMRect,
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

  componentDidMount() {
    this.props.onRender && this.props.onRender(this.conRef.current!);
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
          boxShadow: '0 0 5px 0px #bdbdbd',
        }}
      >
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', width: '100%' }}>
          <div>
            {this.props.config.bodyContent}
          </div>
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
      const mar = this.props.annotationDisplayConfig.minDim.w / this.props.annotationDisplayConfig.minDim.h;

      if ((Math.ceil(mar * 10)) >= 12) {
        // if aspect ration is greater than 1.2, then the smallest size is appropriate
        w = this.props.annotationDisplayConfig.minDim.w;
        h = this.props.annotationDisplayConfig.minDim.h;
      } else {
        // otherwise will try to place it height wise as
        w = this.props.annotationDisplayConfig.maxDim.w;
        h = this.props.annotationDisplayConfig.maxDim.h;
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
  minDim: {w: number, h: number};
  maxDim: {w: number, h: number};
  windowHeight: number;
  windowWidth: number;
}

interface IConProps {
  data: Array<{conf: IAnnoationDisplayConfig, box: DOMRect}>,
  nav: NavFn,
  win: Window
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
      return (<AnnotationCard
        key={p.conf.config.id}
        annotationDisplayConfig={p.conf}
        box={p.box}
        nav={this.props.nav}
        win={this.props.win}
      />);
    });
  }
}
