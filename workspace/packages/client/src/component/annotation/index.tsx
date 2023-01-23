import {IAnnotationConfig} from '@fable/common/dist/types';
import React from 'react';
import {StyleSheetManager} from 'styled-components';
import * as Tags from './styled';

interface IProps {
  annotationDisplayConfig: IAnnoationDisplayConfig;
  box: DOMRect
}

export class AnnotationBubble extends React.PureComponent<IProps> {
  render() {
    return (
      <Tags.BubbleCon style={{
        display: this.props.annotationDisplayConfig.isInViewPort ? 'flex' : 'none',
        left: this.props.box.x - 5,
        top: this.props.box.y - 5,
      }}
      >
        {this.props.annotationDisplayConfig.config.localId}
      </Tags.BubbleCon>
    );
  }
}

export class AnnotationContent extends React.PureComponent<{
  config: IAnnotationConfig,
  display: 'flex' | 'none',
  width: number;
  top: number,
  left: number,
  onRender?: (el: HTMLDivElement) => void,
}> {
  static readonly MIN_WIDTH = 280;

  private readonly conRef: React.RefObject<HTMLDivElement> = React.createRef();

  componentDidMount() {
    this.props.onRender && this.props.onRender(this.conRef.current!);
  }

  render() {
    return (

      <div
        ref={this.conRef}
        style={{
          position: 'absolute',
          background: '#fff',
          minWidth: `${AnnotationContent.MIN_WIDTH}px`,
          width: `${this.props.width}px`,
          borderRadius: '8px',
          padding: '0.5rem',
          display: this.props.display ? 'flex' : 'none',
          justifyItems: 'center',
          alignItems: 'center',
          left: this.props.left,
          top: this.props.top,
          zIndex: Number.MAX_SAFE_INTEGER,
        }}
      >
        {this.props.config.bodyContent}
      </div>
    );
  }
}

export class AnnotationCard extends React.PureComponent<IProps> {
  static readonly BREATHING_SPACE_RATIO = 30;

  static readonly ANNOTAITON_EL_MARGIN = 20;

  render() {
    let l = -9999;
    let t = -9999;
    const elBox = this.props.box;
    const winW = this.props.annotationDisplayConfig.windowWidth;
    const winH = this.props.annotationDisplayConfig.windowHeight;
    const mar = this.props.annotationDisplayConfig.minDim.w / this.props.annotationDisplayConfig.minDim.h;

    let w;
    let h;
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
        l = elBox.left + elBox.width / 2;
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

    return <AnnotationContent
      config={this.props.annotationDisplayConfig.config}
      display="flex"
      width={w}
      top={t}
      left={l}
    />;
  }
}

export interface IAnnoationDisplayConfig {
  config: IAnnotationConfig;
  isMaximized: boolean;
  isInViewPort: boolean;
  minDim: {w: number, h: number};
  maxDim: {w: number, h: number};
  windowHeight: number;
  windowWidth: number;
}

interface IConProps {
  data: Array<{conf: IAnnoationDisplayConfig, box: DOMRect}>
  doc: Document
}

export class AnnotationCon extends React.PureComponent<IConProps> {
  render() {
    return (
      <StyleSheetManager target={this.props.doc.head}>
        <React.Fragment>
          {this.props.data.map((p) => {
            if (!p.conf.isMaximized) {
              return <AnnotationBubble key={p.conf.config.localId} annotationDisplayConfig={p.conf} box={p.box} />;
            }
            return (<AnnotationCard key={p.conf.config.localId} annotationDisplayConfig={p.conf} box={p.box} />);
          })}
        </React.Fragment>
      </StyleSheetManager>
    );
  }
}
