import ReactDOM, {Root} from 'react-dom/client';
import {IAnnotationConfig} from '@fable/common/dist/types';
import React from 'react';
import {StyleSheetManager} from 'styled-components';
import HighlighterBase from '../base/hightligher-base';
import {IAnnoationDisplayConfig, AnnotationCon, AnnotationContent} from '.';

export enum AnnotationViewMode {
  Show,
  Hide
}

export default class AnnotationLifecycleManager extends HighlighterBase {
  private annotationElMap: Record<string, [HTMLElement, IAnnoationDisplayConfig]>;

  private con: HTMLDivElement;

  private rRoot: Root;

  private scaleFactor: number;

  private vp: {w: number, h: number};

  private mode: AnnotationViewMode;

  private frameIds: number[] = [];

  // Take the initial annotation config from here
  constructor(doc: Document, opts: {scaleFactor: number}) {
    super(doc);
    this.scaleFactor = opts.scaleFactor;
    this.vp = {
      w: Math.max(this.doc.documentElement.clientWidth || 0, this.win.innerWidth || 0),
      h: Math.max(this.doc.documentElement.clientHeight || 0, this.win.innerHeight || 0)
    };
    this.annotationElMap = {};
    const [con, root] = this.createContainerRoot();
    this.con = con;
    this.rRoot = root;
    this.mode = AnnotationViewMode.Hide;
  }

  hide() {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
  }

  show() {
    if (this.mode === AnnotationViewMode.Show) {
      return;
    }
    this.mode = AnnotationViewMode.Show;
    this.render();
    this.con.style.display = '';
  }

  // eslint-disable-next-line class-methods-use-this
  maskHasDarkBg(): boolean {
    return true;
  }

  // eslint-disable-next-line class-methods-use-this
  highlightBgColor(): string {
    return '#ffffff00';
  }

  private onScroll = () => {
    if (this.mode === AnnotationViewMode.Hide) {
      return;
    }

    this.con!.style.display = 'none';
    this.frameIds.forEach(id => clearTimeout(id));
    this.frameIds.length = 0;
    this.frameIds.push(setTimeout(() => {
      this.render();
      this.con!.style.display = '';
    }, 5 * 16) as unknown as number);
  };

  private createContainerRoot(): [HTMLDivElement, Root] {
    const con = this.doc.createElement('div');
    con.setAttribute('class', 'fable-ans');
    con.setAttribute('fable-ignr-sel', 'true');
    con.style.position = 'absolute';
    // this.con.style.transform = 'translate(-1000px, -1000px)';
    // this.con.style.boxShadow = 'inset 0 0 0 2px #ff5722';
    // this.con.style.width = `${this.vp.w}px`;
    // this.con.style.height = `${this.vp.h}px`;
    con.style.left = '0';
    con.style.top = '0';
    con.style.zIndex = `${this.maxZIndex + 2}`;
    this.attachElToUmbrellaDiv(con);
    this.doc.body.addEventListener('scroll', this.onScroll, true);
    const rRoot = ReactDOM.createRoot(con);
    return [con, rRoot];
  }

  showAnnotationFor(el: HTMLElement) {
    const path = this.elPath(el);
    for (const [elPath, [, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      if (elPath === path) annotationDisplayConfig.isMaximized = true;
      else annotationDisplayConfig.isMaximized = false;
    }
    this.render();
  }

  private render() {
    if (this.mode === AnnotationViewMode.Hide) {
      return;
    }
    const props: ({
      box: DOMRect,
      conf: IAnnoationDisplayConfig,
    })[] = [];
    for (const [, [el, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      if (this.isElInViewPort(el)) {
        annotationDisplayConfig.isInViewPort = true;
        props.push({
          box: el.getBoundingClientRect(),
          conf: annotationDisplayConfig,
        });
      } else {
        annotationDisplayConfig.isInViewPort = false;
        props.push({
          box: el.getBoundingClientRect(),
          conf: annotationDisplayConfig,
        });
      }

      if (annotationDisplayConfig.isMaximized) {
        this.selectElement(el);
      }
    }
    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        {target: this.doc.head},
        React.createElement(AnnotationCon, {data: props})
      )
    );
  }

  async addOrReplaceAnnotation(el: HTMLElement, config: IAnnotationConfig, showImmediate = false) {
    const path = this.elPath(el);
    const dim = await this.probeForAnnotationSize(config);
    console.log('dim', dim);

    this.annotationElMap[path] = [el, {
      config,
      isMaximized: false,
      isInViewPort: false,
      minDim: {
        w: dim.minW,
        h: dim.hForMinW,
      },
      maxDim: {
        w: dim.maxW,
        h: dim.hForMaxW
      },
      windowHeight: this.vp.h,
      windowWidth: this.vp.w,
    }];

    if (showImmediate) {
      this.showAnnotationFor(el);
    }
    return this;
  }

  private async probeForAnnotationSize(config: IAnnotationConfig): Promise<{
    minW: number,
    hForMinW: number,
    maxW: number,
    hForMaxW: number
  }> {
    const elMinW = await new Promise((resolve: (e: HTMLDivElement) => void) => {
      this.rRoot.render(
        React.createElement(
          StyleSheetManager,
          {target: this.doc.head},
          React.createElement(AnnotationContent, {
            onRender: resolve,
            isInDisplay: true,
            config,
            width: AnnotationContent.MIN_WIDTH,
            top: -9999,
            left: -9999,
            key: -777
          })
        )
      );
    });
    const minB = elMinW.getBoundingClientRect();

    const elMaxW = await new Promise((resolve: (e: HTMLDivElement) => void) => {
      this.rRoot.render(
        React.createElement(
          StyleSheetManager,
          {target: this.doc.head},
          React.createElement(AnnotationContent, {
            onRender: resolve,
            isInDisplay: true,
            config,
            width: Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 3 | 0),
            top: -9999,
            left: -9999,
            key: -666
          })
        )
      );
    });
    const maxB = elMaxW.getBoundingClientRect();

    return {
      minW: minB.width,
      hForMinW: minB.height,
      maxW: maxB.width,
      hForMaxW: maxB.height
      // maxW: 0,
      // hForMaxW: 0
    };
  }

  public dispose(): void {
    if (this.rRoot) {
      this.rRoot.unmount();
    }
    if (this.con) {
      this.con.remove();
      this.doc.body.removeEventListener('scroll', this.onScroll, true);
    }
    super.dispose();
  }
}
