import ReactDOM, { Root } from 'react-dom/client';
import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { StyleSheetManager } from 'styled-components';
import HighlighterBase from '../base/hightligher-base';
import { IAnnoationDisplayConfig, AnnotationCon, AnnotationContent } from '.';
import { getDefaultTourOpts } from './annotation-config-utils';
import { NavFn } from '../../types';

export enum AnnotationViewMode {
  Show,
  Hide
}

export default class AnnotationLifecycleManager extends HighlighterBase {
  private annotationElMap: Record<string, [HTMLElement, IAnnoationDisplayConfig]>;

  // TODO since theme is global across the annotations, we keep only once instance of this.
  //      we reingest the theme on every render. Handle it in a better way
  private opts: ITourDataOpts = getDefaultTourOpts();

  private con: HTMLDivElement;

  private rRoot: Root;

  private vp: {w: number, h: number};

  private mode: AnnotationViewMode;

  private frameIds: number[] = [];

  private nav: NavFn;

  private isPlayMode: boolean;

  // Take the initial annotation config from here
  constructor(doc: Document, opts: {navigate: NavFn, isPlayMode: boolean}) {
    super(doc);
    this.nav = opts.navigate;
    this.vp = {
      w: Math.max(this.doc.documentElement.clientWidth || 0, this.win.innerWidth || 0),
      h: Math.max(this.doc.documentElement.clientHeight || 0, this.win.innerHeight || 0)
    };
    this.annotationElMap = {};
    const [con, root] = this.createContainerRoot();
    this.con = con;
    this.rRoot = root;
    this.mode = AnnotationViewMode.Hide;
    this.isPlayMode = opts.isPlayMode;
  }

  private hideAllAnnotations() {
    for (const [, [_, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.isMaximized = false;
    }
  }

  hide() {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
    this.removeMaskIfPresent();
    this.hideAllAnnotations();
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
      annotationDisplayConfig.opts = this.opts;
      if (elPath === path) {
        annotationDisplayConfig.isMaximized = true;
        annotationDisplayConfig.isInViewPort = true;
      } else {
        annotationDisplayConfig.isMaximized = false;
        annotationDisplayConfig.isInViewPort = false;
      }
    }
    el.scrollIntoView({
      behavior: 'smooth',
      block: this.isPlayMode ? 'center' : 'nearest',
      inline: this.isPlayMode ? 'center' : 'nearest'
    });
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
      props.push({
        box: el.getBoundingClientRect(),
        conf: annotationDisplayConfig,
      });
      if (annotationDisplayConfig.isMaximized) {
        this.selectElement(el);
      }
    }
    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        { target: this.doc.head },
        React.createElement(AnnotationCon, { data: props, nav: this.nav })
      )
    );
  }

  async addOrReplaceAnnotation(
    el: HTMLElement,
    config: IAnnotationConfig,
    opts: ITourDataOpts,
    showImmediate = false
  ) {
    const path = this.elPath(el);
    const dim = await this.probeForAnnotationSize(config);
    this.opts = opts;
    this.annotationElMap[path] = [el, {
      config,
      opts,
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
          { target: this.doc.head },
          React.createElement(AnnotationContent, {
            onRender: resolve,
            isInDisplay: true,
            config,
            opts: this.opts,
            width: AnnotationContent.MIN_WIDTH,
            top: -9999,
            left: -9999,
            key: -777,
            nav: this.nav,
          })
        )
      );
    });
    const minB = elMinW.getBoundingClientRect();

    const elMaxW = await new Promise((resolve: (e: HTMLDivElement) => void) => {
      this.rRoot.render(
        React.createElement(
          StyleSheetManager,
          { target: this.doc.head },
          React.createElement(AnnotationContent, {
            onRender: resolve,
            isInDisplay: true,
            config,
            opts: this.opts,
            width: Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 3 | 0),
            top: -9999,
            left: -9999,
            key: -666,
            nav: this.nav,
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
