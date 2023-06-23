import ReactDOM, { Root } from 'react-dom/client';
import { Coords, IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { StyleSheetManager } from 'styled-components';
import { ScreenType } from '@fable/common/dist/api-contract';
import HighlighterBase, { Rect } from '../base/hightligher-base';
import { IAnnoationDisplayConfig, AnnotationCon, AnnotationContent } from '.';
import { getDefaultTourOpts } from './annotation-config-utils';
import { NavFn } from '../../types';
import { isBodyEl } from '../../utils';
import { scrollToAnn } from './utils';

const scrollIntoView = require('scroll-into-view');

export enum AnnotationViewMode {
  Show,
  Hide
}

export default class AnnotationLifecycleManager extends HighlighterBase {
  static SCROLL_TO_EL_TIME_MS = 350;

  private annotationElMap: Record<string, [HTMLElement, IAnnoationDisplayConfig]>;

  // TODO since theme is global across the annotations, we keep only once instance of this.
  //      we reingest the theme on every render. Handle it in a better way
  private opts: ITourDataOpts = getDefaultTourOpts();

  private con: HTMLDivElement;

  private rRoot: Root;

  private conProbe: HTMLDivElement;

  private rRootProbe: Root;

  private vp: { w: number, h: number };

  private mode: AnnotationViewMode;

  private frameIds: number[] = [];

  private nav: NavFn;

  private componentDisposed = false;

  private isAnnotationDrawingInProgress = false;

  private isPlayMode: boolean;

  private screenType: ScreenType;

  // Take the initial annotation config from here
  constructor(
    doc: Document,
    nestedFrames: HTMLIFrameElement[],
    opts: { navigate: NavFn, isPlayMode: boolean },
    screenType: ScreenType
  ) {
    super(doc, nestedFrames);
    this.nav = opts.navigate;
    this.vp = {
      w: Math.max(this.doc.documentElement.clientWidth || 0, this.win.innerWidth || 0),
      h: Math.max(this.doc.documentElement.clientHeight || 0, this.win.innerHeight || 0)
    };
    this.annotationElMap = {};
    const [con, root] = this.createContainerRoot('ann-display');
    const [conProbe, rootProbe] = this.createContainerRoot('ann-probe');
    this.con = con;
    this.rRoot = root;
    this.conProbe = conProbe;
    this.rRootProbe = rootProbe;
    this.mode = AnnotationViewMode.Hide;
    this.isPlayMode = opts.isPlayMode;
    this.screenType = screenType;
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

  // eslint-disable-next-line class-methods-use-this
  getBoundingRectWrtRootFrame(el: HTMLElement): Rect {
    const doc = el.ownerDocument;
    const [dx, dy] = this.getCumulativeDxdy(doc);
    const box = el.getBoundingClientRect();
    return {
      x: box.x + dx,
      y: box.y + dy,
      top: box.top + dy,
      bottom: box.bottom + dy,
      left: box.left + dx,
      right: box.right + dx,
      height: box.height,
      width: box.width,
    };
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

  private beforeScrollStart = () => {
    if (!this.isPlayMode) {
      return;
    }
    this.con!.style.visibility = 'hidden';
    this.createFullScreenMask();
  };

  private onScrollComplete = () => {
    this.render();
    this.con!.style.visibility = 'visible';
  };

  private createContainerRoot(type: 'ann-display' | 'ann-probe' = 'ann-display'): [HTMLDivElement, Root] {
    const con = this.doc.createElement('div');
    con.setAttribute('class', `fable-annotations-${type === 'ann-probe' ? 'probe-' : ''}container`);
    con.setAttribute('fable-ignr-sel', 'true');
    con.style.position = 'absolute';
    con.style.left = '0';
    con.style.top = '0';
    con.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    this.attachElToUmbrellaDiv(con);
    const rRoot = ReactDOM.createRoot(con);
    return [con, rRoot];
  }

  showAnnotationFor(el: HTMLElement, config: IAnnotationConfig) {
    let currId: string;
    if (this.screenType === ScreenType.Img && config.type === 'default') {
      currId = config.id;
    } else {
      // TODO: check if config.id has the elpath
      currId = this.elPath(el);
    }

    for (const [id, [, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.opts = this.opts;
      if (id === currId) {
        annotationDisplayConfig.isMaximized = true;
        annotationDisplayConfig.isInViewPort = true;
      } else {
        annotationDisplayConfig.isMaximized = false;
        annotationDisplayConfig.isInViewPort = false;
      }
    }

    if (this.screenType === ScreenType.Img && config.type === 'default') {
      const coordsStr = config.id;
      this.beforeScrollStart();
      const [x, y, width, height] = coordsStr.split('-');
      const box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      scrollToAnn(this.win, box, this.annotationElMap[coordsStr][1]);
      setTimeout(() => {
        this.onScrollComplete();
      }, AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS / 2);
      return;
    }

    this.beforeScrollStart();
    // we don't use el.scrollIntoView directly as it moves whole page layout if we want to keep the target el in center.
    // Fable's tour is embedded in iframe of customer's page, we can't let the document scroll outside fable's iframe.
    // el.scrollIntoView does not allow us to provide any boundary.
    //
    // We detect body element and then don't apply scroll as the library we use sometime scrolls the page all the way to
    // the bottom of the page when body is selected.
    //
    // WARN Determining the nested scroll level through multiple container is a tricky problem across brower and across
    // different dom elments (iframe / showdow root). For the interest of the time we did not solve ourself and used the
    // scroll-into-view library. This library is not audited. TODO Later on, fix this ourself
    if (!isBodyEl(el)) {
      scrollIntoView(el, {
        time: AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS,
      }, (type: 'complete' | 'cancel') => {
        if (type === 'complete') this.onScrollComplete();
      });
    } else {
      setTimeout(this.onScrollComplete, AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS / 2);
    }
  }

  private render() {
    if (this.mode === AnnotationViewMode.Hide) {
      return;
    }
    if (this.componentDisposed) {
      return;
    }
    const props: ({
      box: Rect,
      conf: IAnnoationDisplayConfig,
      hotspotBox: Rect | null,
    })[] = [];
    for (const [, [el, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      let box: Rect;
      if (this.screenType === ScreenType.Img && annotationDisplayConfig.config.type === 'default') {
        const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
        box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      } else {
        box = this.getBoundingRectWrtRootFrame(el);
      }

      let hotspotEl = null;
      const hotspotElPath = annotationDisplayConfig.config.hotspotElPath;
      if (hotspotElPath) {
        hotspotEl = this.elFromPath(hotspotElPath);
      }
      props.push({
        box,
        conf: annotationDisplayConfig,
        hotspotBox: hotspotEl ? this.getBoundingRectWrtRootFrame(hotspotEl) : null,
      });
      if (annotationDisplayConfig.isMaximized) {
        if (annotationDisplayConfig.config.type === 'cover') {
          this.createFullScreenMask();
        } else if (this.screenType === ScreenType.Img) {
          const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
          this.selectBoxInDoc({ x: +x, y: +y, width: +width, height: +height });
        } else {
          this.selectElementInDoc(el, el.ownerDocument);
        }
        this.showTransparentMask(!annotationDisplayConfig.config.showOverlay);
      }
    }
    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        { target: this.doc.head },
        React.createElement(AnnotationCon, { data: props, nav: this.nav, win: this.win, playMode: this.isPlayMode })
      )
    );
  }

  async addOrReplaceAnnotation(
    el: HTMLElement,
    config: IAnnotationConfig,
    opts: ITourDataOpts,
    showImmediate = false,
  ) {
    if (this.isAnnotationDrawingInProgress) {
      return this;
    }

    this.isAnnotationDrawingInProgress = true;
    const dim = await this.probeForAnnotationSize(config);

    let key : string;
    if (this.screenType === ScreenType.Img && config.type === 'default') {
      key = config.id;
    } else {
      key = this.elPath(el);
    }

    if (!this.componentDisposed) {
      this.opts = opts;
      this.annotationElMap[key] = [el, {
        config,
        opts,
        isMaximized: false,
        isInViewPort: false,
        dimForSmallAnnotation: { ...dim.dimForSmallAnnotation },
        dimForMediumAnnotation: { ...dim.dimForMediumAnnotation },
        dimForLargeAnnotation: { ...dim.dimForLargeAnnotation },
        windowHeight: this.vp.h,
        windowWidth: this.vp.w,
      }];

      if (showImmediate) {
        this.showAnnotationFor(el, config);
      }
    }

    this.isAnnotationDrawingInProgress = false;
    return this;
  }

  private async probeForAnnotationSize(config: IAnnotationConfig): Promise<{
    dimForSmallAnnotation: {w: number, h: number},
    dimForMediumAnnotation: {w: number, h: number},
    dimForLargeAnnotation: {w: number, h: number},
  }> {
    const smallWidth = AnnotationContent.MIN_WIDTH;
    const mediumWidth = Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 3 | 0);
    const largeWidth = Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 2.5 | 0);

    try {
      const elSmall = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: this.doc.head },
            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              opts: this.opts,
              width: smallWidth,
              top: -9999,
              left: -9999,
              key: 777,
              nav: this.nav,
            })
          )
        );
      });
      const smallDim = elSmall.getBoundingClientRect();

      const elMedium = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: this.doc.head },
            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              opts: this.opts,
              width: mediumWidth,
              top: -9999,
              left: -9999,
              key: 666,
              nav: this.nav,
            })
          )
        );
      });
      const mediumDim = elMedium.getBoundingClientRect();

      const elLarge = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: this.doc.head },
            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              opts: this.opts,
              width: largeWidth,
              top: -9999,
              left: -9999,
              key: 888,
              nav: this.nav,
            })
          )
        );
      });
      const largeDim = elLarge.getBoundingClientRect();

      return {
        dimForSmallAnnotation: { w: smallDim.width, h: smallDim.height },
        dimForMediumAnnotation: { w: mediumDim.width, h: mediumDim.height },
        dimForLargeAnnotation: { w: largeDim.width, h: largeDim.height },
      };
    } catch (e) {
      if (!this.componentDisposed) {
        // Sometime there might be errors because component will get unmounted but rendering won't finish
        // we would ignore this. Not ideal, but here we are
        throw e;
      }
    }

    return {
      dimForSmallAnnotation: { w: 0, h: 0 },
      dimForMediumAnnotation: { w: 0, h: 0 },
      dimForLargeAnnotation: { w: 0, h: 0 },
    };
  }

  public dispose(): void {
    this.componentDisposed = true;
    setTimeout(() => {
      if (this.rRoot) {
        this.rRoot.unmount();
        this.rRootProbe.unmount();
      }
      if (this.con) {
        this.con.remove();
        this.conProbe.remove();
      }
      super.dispose();
    });
  }
}
