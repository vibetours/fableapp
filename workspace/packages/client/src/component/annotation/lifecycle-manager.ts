import ReactDOM, { Root } from 'react-dom/client';
import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';
import React from 'react';
import { StyleSheetManager } from 'styled-components';
import { ScreenType } from '@fable/common/dist/api-contract';
import { getDefaultTourOpts } from '@fable/common/dist/utils';
import HighlighterBase, { HighlighterBaseConfig, Rect } from '../base/hightligher-base';
import { IAnnoationDisplayConfig, AnnotationCon, AnnotationContent, IAnnProps } from '.';
import { AnnotationPerScreen, NavFn } from '../../types';
import { isBodyEl, isVideoAnnotation } from '../../utils';
import { FABLE_RT_UMBRL, getFableRtUmbrlDiv, isPrevNextBtnLinksToVideoAnn, scrollToAnn } from './utils';
import { AnnotationSerialIdMap } from './ops';
import { ApplyDiffAndGoToAnn } from '../screen-editor/types';

const scrollIntoView = require('scroll-into-view');

export enum AnnotationViewMode {
  Show,
  Hide
}

interface SelInf { id: string; cls: string, isOurId: boolean, hotspotCls?: string }

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

  private allAnnotationsForTour: AnnotationPerScreen[];

  private allAnnotationsForScreen: IAnnotationConfig[];

  private tourDataOpts: ITourDataOpts;

  private tourId: number;

  private annotationSerialIdMap: AnnotationSerialIdMap;

  private applyDiffAndGoToAnn: ApplyDiffAndGoToAnn;

  private undoLastAnnStyleOverride: Array<() => void> = [];

  static getFablePrefixedClsName(cls: string): string {
    return `f-c-${cls}`;
  }

  static getFablePrefixedId(id: string): string {
    return `f-i-${id}`;
  }

  static getCompositeSelector(el: HTMLElement, config: IAnnotationConfig): [
    compositeSelector: string,
    selectorInf: SelInf
  ] {
    let isOurId = false;
    let id = el.getAttribute('id');
    if (!id) {
      id = AnnotationLifecycleManager.getFablePrefixedId(config.refId);
      isOurId = true;
    }
    const cls = AnnotationLifecycleManager.getFablePrefixedClsName(config.refId);
    let hotspotCls: string | undefined;
    if (config.hotspotElPath) {
      hotspotCls = 'fable-hotspot';
    }
    return [`#${id}.${cls}`, {
      isOurId,
      id,
      cls,
      hotspotCls
    }];
  }

  // Take the initial annotation config from here
  constructor(
    doc: Document,
    nestedFrames: HTMLIFrameElement[],
    opts: { navigate: NavFn, isPlayMode: boolean },
    screenType: ScreenType,
    allAnnotationsForTour: AnnotationPerScreen[],
    allAnnotationsForScreen: IAnnotationConfig[],
    tourDataOpts: ITourDataOpts,
    tourId: number,
    annotationSerialIdMap: AnnotationSerialIdMap,
    config: HighlighterBaseConfig,
    applyDiffAndGoToAnnFn: ApplyDiffAndGoToAnn
  ) {
    super(doc, nestedFrames, config);
    this.nav = opts.navigate;
    this.vp = {
      w: Math.max(this.doc.documentElement.clientWidth || 0, this.win.innerWidth || 0),
      h: Math.max(this.doc.documentElement.clientHeight || 0, this.win.innerHeight || 0)
    };
    this.annotationElMap = {};
    const [con, root] = this.createContainerRoot('');
    const [conProbe, rootProbe] = this.createContainerRoot('ann-probe');
    this.con = con;
    this.rRoot = root;
    this.conProbe = conProbe;
    this.rRootProbe = rootProbe;
    this.mode = AnnotationViewMode.Hide;
    this.isPlayMode = opts.isPlayMode;
    this.screenType = screenType;
    this.allAnnotationsForTour = allAnnotationsForTour;
    this.allAnnotationsForScreen = allAnnotationsForScreen;
    this.tourDataOpts = tourDataOpts;
    this.tourId = tourId;
    this.annotationSerialIdMap = annotationSerialIdMap;
    this.applyDiffAndGoToAnn = applyDiffAndGoToAnnFn;
    this.prerenderVideoAnnotations();
  }

  resetCons(): void {
    let umbrellaDiv = getFableRtUmbrlDiv(this.doc) as HTMLDivElement;
    if (!umbrellaDiv) {
      umbrellaDiv = this.doc.createElement('div');
      umbrellaDiv.setAttribute('class', FABLE_RT_UMBRL);
      umbrellaDiv.style.position = 'absolute';
      umbrellaDiv.style.left = `${0}`;
      umbrellaDiv.style.top = `${0}`;
      this.doc.body.appendChild(umbrellaDiv);

      const [con, root] = this.createContainerRoot('');
      const [conProbe, rootProbe] = this.createContainerRoot('ann-probe');
      this.con = con;
      this.rRoot = root;
      this.conProbe = conProbe;
      this.rRootProbe = rootProbe;
      this.createMask();
    }
  }

  private hideAllAnnotations(): void {
    for (const [, [_, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.isMaximized = false;
    }
  }

  hide(): void {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
    this.updateConfig('showOverlay', false);
    this.hideAllAnnotations();
  }

  hideAnnButKeepMask(): void {
    this.mode = AnnotationViewMode.Hide;
    this.con.style.display = 'none';
    this.hideAllAnnotations();
    this.createFullScreenMask();
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

  show(): void {
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

  private beforeScrollStart = (): void => {
    if (!this.isPlayMode) {
      return;
    }
    this.con!.style.visibility = 'hidden';
    this.createFullScreenMask();
  };

  // algorithm: https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity#how_is_specificity_calculated
  // eslint-disable-next-line class-methods-use-this
  private setCssSelectorForHighestProbalbleSpecificity(el: HTMLElement, config: IAnnotationConfig): () => void {
    const [, sel] = AnnotationLifecycleManager.getCompositeSelector(el, config);

    if (sel.isOurId) {
      el.setAttribute('id', sel.id);
    }
    el.classList.add(sel.cls);
    el.classList.add('f-fable-anim-target');
    return () => {
      if (sel.isOurId) el.removeAttribute('id');
      el.classList.remove(sel.cls);
      el.classList.remove('f-fable-anim-target');
    };
  }

  private static readonly ANIM_ONLY_CSS = `
.f-fable-anim-target, .f-fable-anim-target * {
  transition: all 0.3s ease-out;
}

`;

  private exportTourThemeAsCssVar(): string {
    return `
:root {
  --fable-primary-color: ${this.tourDataOpts.primaryColor};
  --fable-selection-color: ${this.tourDataOpts.annotationSelectionColor};
  --fable-annotation-bg-color: ${this.tourDataOpts.annotationBodyBackgroundColor};
  --fable-annotation-border-color: ${this.tourDataOpts.annotationBodyBorderColor};
  --fable-annotation-font-color: ${this.tourDataOpts.annotationFontColor};
  --fable-annotation-border-radius: ${this.tourDataOpts.borderRadius};
}

`;
  }

  private addCustomStyleSheetFor(el: HTMLElement, config: IAnnotationConfig, styleStr: string): () => void {
    if (!styleStr) return () => {};

    this.updateConfig('showOverlay', false);
    this.updateConfig('selectionColor', 'transparent');

    const doc = el.ownerDocument;
    let styleTag = doc.getElementById('f-fable-override-eph-style');
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.setAttribute('id', 'f-fable-override-eph-style');
      if (doc.body) doc.body.appendChild(styleTag);
    }
    styleTag.innerHTML = AnnotationLifecycleManager.ANIM_ONLY_CSS + this.exportTourThemeAsCssVar() + styleStr;

    return () => {
      if (styleTag) styleTag.innerHTML = AnnotationLifecycleManager.ANIM_ONLY_CSS + this.exportTourThemeAsCssVar();
      this.updateConfig('showOverlay', config.showOverlay);
      this.updateConfig('selectionColor', this.tourDataOpts.annotationSelectionColor);
      this.render();
    };
  }

  previewCustomStyle(css: string, el: HTMLElement, config: IAnnotationConfig): () => void {
    const undo2 = this.addCustomStyleSheetFor(el, config, css);
    const undo1 = this.setCssSelectorForHighestProbalbleSpecificity(el, config);
    return () => {
      undo1();
      undo2();
    };
  }

  private onScrollComplete = (el: HTMLElement, config: IAnnotationConfig): void => {
    this.render();
    this.con!.style.visibility = 'visible';
    const undo1 = this.addCustomStyleSheetFor(el, config, config.targetElCssStyle);
    const undo2 = this.setCssSelectorForHighestProbalbleSpecificity(el, config);
    this.undoLastAnnStyleOverride.push(undo1, undo2);
  };

  private createContainerRoot(type: '' | 'ann-probe' | 'ann-video' = ''): [HTMLDivElement, Root] {
    const con = this.doc.createElement('div');
    con.setAttribute('class', `fable-annotations-${type}-container`);
    con.setAttribute('fable-ignr-sel', 'true');
    con.style.position = 'absolute';
    con.style.left = '0';
    con.style.top = '0';
    con.style.zIndex = `${Number.MAX_SAFE_INTEGER}`;
    this.attachElToUmbrellaDiv(con);
    const rRoot = ReactDOM.createRoot(con);
    return [con, rRoot];
  }

  private showAnnotationFor(el: HTMLElement, config: IAnnotationConfig): void {
    this.undoLastAnnStyleOverride.forEach(f => f());

    const currId = config.id;

    for (const [id, [, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      annotationDisplayConfig.opts = this.opts;
      if (id === currId) {
        annotationDisplayConfig.isMaximized = true;
        annotationDisplayConfig.isInViewPort = true;
        annotationDisplayConfig.prerender = false;
      } else {
        annotationDisplayConfig.isMaximized = false;
        annotationDisplayConfig.isInViewPort = false;
        annotationDisplayConfig.prerender = annotationDisplayConfig.isVideoAnnotation;
      }
    }

    if (this.screenType === ScreenType.Img && config.type === 'default') {
      const coordsStr = config.id;
      this.beforeScrollStart();
      const [x, y, width, height] = coordsStr.split('-');
      const box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      scrollToAnn(this.win, box, this.annotationElMap[coordsStr][1]);
      setTimeout(() => {
        this.onScrollComplete(el, config);
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
        if (type === 'complete') this.onScrollComplete(el, config);
      });
    } else {
      this.win.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      setTimeout(() => this.onScrollComplete(el, config), AnnotationLifecycleManager.SCROLL_TO_EL_TIME_MS / 2);
    }
  }

  private render(): void {
    if (this.mode === AnnotationViewMode.Hide) {
      return;
    }
    if (this.componentDisposed) {
      return;
    }

    const props: IAnnProps[] = [];

    for (const [_, [el, annotationDisplayConfig]] of Object.entries(this.annotationElMap)) {
      let box: Rect;
      if (this.screenType === ScreenType.Img && annotationDisplayConfig.config.type === 'default') {
        const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
        box = this.getAbsFromRelCoords({ x: +x, y: +y, width: +width, height: +height });
      } else {
        box = this.getBoundingRectWrtRootFrame(el);
      }

      let hotspotEl = null;
      const hotspotElPath = annotationDisplayConfig.config.hotspotElPath;
      if (hotspotElPath && annotationDisplayConfig.isMaximized) {
        hotspotEl = this.elFromPath(hotspotElPath);
      }

      const {
        isNextAnnVideo,
        isPrevAnnVideo,
      } = isPrevNextBtnLinksToVideoAnn(annotationDisplayConfig.config, this.allAnnotationsForTour);

      props.push({
        box,
        conf: annotationDisplayConfig,
        hotspotBox: hotspotEl ? this.getBoundingRectWrtRootFrame(hotspotEl) : null,
        isNextAnnVideo,
        isPrevAnnVideo,
        annotationSerialIdMap: this.annotationSerialIdMap,
      });
      if (annotationDisplayConfig.isMaximized) {
        this.updateConfig('showOverlay', annotationDisplayConfig.config.showOverlay);
        if (hotspotElPath && annotationDisplayConfig.config.isHotspot) {
          this.updateConfig('selectionColor', '#ffffff00');
        } else {
          this.updateConfig('selectionColor', this.opts.annotationSelectionColor);
        }
        if (annotationDisplayConfig.config.type === 'cover') {
          this.createFullScreenMask();
        } else if (this.screenType === ScreenType.Img) {
          const [x, y, width, height] = annotationDisplayConfig.config.id.split('-');
          this.selectBoxInDoc({ x: +x, y: +y, width: +width, height: +height });
        } else {
          this.selectElementInDoc(el, el.ownerDocument);
        }
      }
    }

    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },
        React.createElement(AnnotationCon, {
          data: props,
          nav: this.nav,
          win: this.win,
          playMode: this.isPlayMode,
          tourId: this.tourId,
          applyDiffAndGoToAnn: this.applyDiffAndGoToAnn
        })
      )
    );
  }

  async addOrReplaceAnnotation(
    el: HTMLElement,
    config: IAnnotationConfig,
    opts: ITourDataOpts,
    showImmediate = false,
  ): Promise<void> {
    if (this.isAnnotationDrawingInProgress) {
      return;
    }

    this.isAnnotationDrawingInProgress = true;
    const dim = await this.probeForAnnotationSize(config);

    const key = config.id;
    if (!this.componentDisposed) {
      this.opts = opts;
      this.annotationElMap[key] = [el, {
        config,
        opts,
        isMaximized: false,
        isInViewPort: false,
        prerender: false,
        isVideoAnnotation: isVideoAnnotation(config),
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
  }

  private prerenderVideoAnnotations(): void {
    const videoAnnotations = this.allAnnotationsForScreen.filter((config) => isVideoAnnotation(config));

    const videoAnnsProps: IAnnProps[] = videoAnnotations.map(config => {
      const displayConf = {
        config,
        opts: this.tourDataOpts,
        isMaximized: false,
        isInViewPort: false,
        prerender: true,
        isVideoAnnotation: true,
        dimForSmallAnnotation: { w: 10, h: 10 },
        dimForMediumAnnotation: { w: 10, h: 10 },
        dimForLargeAnnotation: { w: 10, h: 10 },
        windowHeight: this.vp.h,
        windowWidth: this.vp.w,
      };

      let el: HTMLElement;
      const key = config.id;
      if (this.screenType === ScreenType.Img && config.type === 'default') {
        el = document.querySelector('img')!;
      } else if (config.type === 'cover') {
        el = this.doc.querySelector('body')!;
      } else {
        el = this.elFromPath(config.id)!;
      }

      this.annotationElMap[key] = [el, displayConf];

      return {
        box: {
          x: 10,
          y: 10,
          height: 10,
          width: 10,
          top: 10,
          bottom: 10,
          left: 10,
          right: 10,
        },
        conf: displayConf,
        isNextAnnVideo: false,
        isPrevAnnVideo: false,
        annotationSerialIdMap: this.annotationSerialIdMap
      };
    });

    this.rRoot.render(
      React.createElement(
        StyleSheetManager,
        { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },
        React.createElement(AnnotationCon, {
          data: videoAnnsProps,
          nav: this.nav,
          win: this.win,
          playMode: this.isPlayMode,
          tourId: this.tourId,
          applyDiffAndGoToAnn: this.applyDiffAndGoToAnn,
        })
      )
    );
  }

  private async probeForAnnotationSize(config: IAnnotationConfig): Promise<{
    dimForSmallAnnotation: { w: number, h: number },
    dimForMediumAnnotation: { w: number, h: number },
    dimForLargeAnnotation: { w: number, h: number },
  }> {
    const smallWidth = AnnotationContent.MIN_WIDTH;
    const mediumWidth = Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 3.5 | 0);
    const largeWidth = Math.max(AnnotationContent.MIN_WIDTH, this.vp.w / 2.5 | 0);

    try {
      const elSmall = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },
            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              dir: 't',
              opts: this.opts,
              width: smallWidth,
              top: -9999,
              left: -9999,
              key: 777,
              tourId: this.tourId,
              annotationSerialIdMap: this.annotationSerialIdMap,
              navigateToAdjacentAnn: () => {},
            })
          )
        );
      });
      const smallDim = elSmall.getBoundingClientRect();

      const elMedium = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },

            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              dir: 't',
              opts: this.opts,
              width: mediumWidth,
              top: -9999,
              left: -9999,
              key: 666,
              tourId: this.tourId,
              annotationSerialIdMap: this.annotationSerialIdMap,
              navigateToAdjacentAnn: () => {},
            })
          )
        );
      });
      const mediumDim = elMedium.getBoundingClientRect();

      const elLarge = await new Promise((resolve: (e: HTMLDivElement) => void) => {
        this.rRootProbe.render(
          React.createElement(
            StyleSheetManager,
            { target: getFableRtUmbrlDiv(this.doc) as HTMLElement },

            React.createElement(AnnotationContent, {
              onRender: resolve,
              isInDisplay: true,
              config,
              opts: this.opts,
              dir: 't',
              width: largeWidth,
              top: -9999,
              left: -9999,
              key: 888,
              tourId: this.tourId,
              annotationSerialIdMap: this.annotationSerialIdMap,
              navigateToAdjacentAnn: () => {},
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
