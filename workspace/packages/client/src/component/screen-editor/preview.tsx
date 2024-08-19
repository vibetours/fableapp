import { CreateJourneyPositioning, JourneyData, ScreenData } from '@fable/common/dist/types';
import React from 'react';
import { ScreenType } from '@fable/common/dist/api-contract';
import { P_RespScreen } from '../../entity-processor';
import { scrollIframeEls } from './scroll-util';
import * as Tags from './preview-styled';
import { deserFrame } from './utils/deser';
import { createFableRtUmbrlDivWrapper, getFableRtUmbrlDivWrapper } from '../annotation/utils';
import { FABLE_IFRAME_GENERIC_CLASSNAME, SCREEN_SIZE_MSG } from '../../constants';
import LogoWatermark from '../watermark/logo-watermark';
import { IframePos, EditItem } from '../../types';
import { applyEditsToSerDom } from './utils/edits';

export interface IOwnProps {
  resizeSignal: number;
  journey: JourneyData | null;
  showWatermark: boolean;
  allEdits: EditItem[];
  screen: P_RespScreen;
  screenData: ScreenData;
  hidden: boolean;
  innerRefs?: React.MutableRefObject<HTMLIFrameElement | null>[];
  onBeforeFrameBodyDisplay: (params: { nestedFrames: HTMLIFrameElement[] }) => void;
  onFrameAssetLoad: () => void;
  isScreenPreview: boolean;
  playMode: boolean;
  isResponsive: boolean;
  heightOffset: number;
}

export interface DeSerProps {
  partOfSvgEl: number;
  shadowRoot?: ShadowRoot;
  shadowParent: ShadowRoot | null;
}

const IFRAME_DEFAULT_DOC = '<!DOCTYPE html><html><head></head><body></body></html>';

export const ROOT_EMBED_IFRAME_ID = `fab-reifi-${Math.random() * (10 ** 4) | 0}`;

export default class ScreenPreview extends React.PureComponent<IOwnProps> {
  static readonly ATTR_ORIG_VAL_SAVE_ATTR_NAME = 'fab-orig-val-t';

  // eslint-disable-next-line react/no-unused-class-component-methods
  scaleFactor: number = 1;

  embedFrameRef: React.MutableRefObject<HTMLIFrameElement | null> = React.createRef();

  watermarkRef: React.MutableRefObject<HTMLAnchorElement | null> = React.createRef();

  nestedFrames: Array<HTMLIFrameElement> = [];

  private assetLoadingPromises: Promise<unknown>[] = [];

  private frameLoadingPromises: Promise<unknown>[] = [];

  deserDomIntoFrame = async (frame: HTMLIFrameElement): Promise<void> => {
    /*
     * FIXME By default assume all pages are responsive via css
     *       But there will always be pages like gmail, analytics where responsiveness is implemented via js
     *       For those cases ask user to select if the page is responsive or not.
     *       If it's responsive don't apply any scaling / zooming
     *       If it's not responsive for chrome apply zoom, for firefox apply the following logic.
     *       For scaling, always do width fitting and height should take up the whole height of parent
     */

    // This calculation is to make transform: scale work like zoom property.
    // We can't use Zoom property as it's only supported by chrome and some version of ie.
    //
    // There might be pages (Google Analytics) that are not responsive and while capturing from extension it was
    // captured from a different dimension than a screen that is used to preview the screen.
    //
    // To support screen dimension interchangeably, we have to zoom in / zoom out the screen keeping the aspect ratio
    // same. The following calculation is done >>>
    //
    // 1. Calculate the boundingRect for iframe before we scale. Ideally that's the actual dimension of the frame.
    // 2. Figure out the scale factor for the current screen vs the screen the page was captured
    // 3. Apply scale to the element (wrt origin 0, 0 ; default scaling is centered)
    // 4. Now the container is visually smaller (for scale < 1) than the original one before it was scaled
    // 5. Figure out what's the new height and width with the scale applied

    this.handleScreenResponsiveness();

    const doc = frame?.contentDocument;
    const frameBody = doc?.body;
    const frameHtml = doc?.documentElement;
    if (doc) {
      if (frameHtml && frameBody) {
        const screenData = applyEditsToSerDom(this.props.allEdits, this.props.screenData);
        deserFrame(
          screenData.docTree,
          doc,
          screenData.version,
          this.frameLoadingPromises,
          this.assetLoadingPromises,
          this.nestedFrames,
          this.props.screen.type === ScreenType.Img,
        );
        while (this.frameLoadingPromises.length) {
          await this.frameLoadingPromises.shift();
        }
        frame.contentDocument.body.setAttribute('dxdy', '0,0');
      } else {
        throw new Error("Can't find body of embed iframe");
      }
    } else {
      throw new Error("Can't find document of embed iframe");
    }
  };

  componentDidUpdate(prevProps: Readonly<IOwnProps>, prevState: Readonly<{}>, snapshot?: any): void {
    if (this.props.showWatermark && (prevProps.showWatermark !== this.props.showWatermark)) {
      this.handleScreenResponsiveness();
    }

    if (prevProps.isResponsive !== this.props.isResponsive) {
      this.handleScreenResponsiveness();
    }

    /**
     * In the previous code fit height / fit width
     * was determined for an image screen from responsive column of screen db.
     * Right now responsiveness of demo and screen fit-height & fit-width are two independent things
     * and could be applied with one another. We haven't changed the name of the column hence we are still
     * using screen.responsive property, but in reality it's just 1/true -> fit-height and 0/false -> fit-width
     */
    if (prevProps.screen.responsive !== this.props.screen.responsive) {
      this.handleImgScreenResponsiveness();
    }

    if (prevProps.resizeSignal !== this.props.resizeSignal) {
      this.handleScreenResponsiveness();
    }
  }

  componentDidMount(): void {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      throw new Error("Can't find embed iframe");
    }

    frame.onload = () => {
      const timer = setTimeout(async () => {
        await this.deserDomIntoFrame(frame);
        /* requestAnimationFrame */setTimeout(() => {
          const doc = frame.contentDocument;
          const frameBody = doc?.body;
          // Make the iframe visible after all the assets are loaded
          Promise.all(this.assetLoadingPromises).then(() => {
            // create a elative container that would contain all the falbe related els
            if (frameBody) {
              let umbrellaDiv = getFableRtUmbrlDivWrapper(doc);
              if (!umbrellaDiv) {
                umbrellaDiv = createFableRtUmbrlDivWrapper(doc);
              }
              this.props.onBeforeFrameBodyDisplay({
                nestedFrames: this.nestedFrames,
              });
              this.assetLoadingPromises.length = 0;
              if (this.props.screen.type === ScreenType.Img) {
                const screenImage = doc.getElementById('img')!;
                if (screenImage && !screenImage.style.boxShadow) {
                  screenImage.style.boxShadow = '0 0 5px 2px rgba(0, 0, 0, 0.3)';
                }
                this.handleImgScreenResponsiveness();
              }
              if (this.props.isScreenPreview) {
                scrollIframeEls(this.props.screenData.version, doc);
              }
              this.props.onFrameAssetLoad();
            }
          });
        }, 100);
        // If the screen is prerendered (hence hidden) we wait for 2seconds before we start rendering as
        // the rendered screen might do scrolling to the element and this is a arbritary time to wait so that
        // the scroll animation is closer to 60fps.
        // TODO A better way to detect scroll is to update a global variable about scrolling status.
        clearTimeout(timer);
      }, this.props.hidden ? 1000 : 16);
    };
  }

  handleWatermarkPositioning = (top: number, height: number, left: number, width: number): void => {
    const watermarkEl = this.watermarkRef.current;
    const HORIZONTAL_PADDING_FACTOR = 20;
    const VERTICAL_PADDING_FACTOR = 16;
    if (!watermarkEl) return;

    if (
      this.props.journey
      && this.props.journey.flows.length
      && this.props.journey.positioning === CreateJourneyPositioning.Right_Bottom
    ) {
      watermarkEl.style.left = `${Math.round((left) + (HORIZONTAL_PADDING_FACTOR * this.scaleFactor))}px`;
      watermarkEl.style.transform = 'translate(0%, -100%)';
    } else {
      watermarkEl.style.left = `${Math.round((left) + (width * this.scaleFactor) - (HORIZONTAL_PADDING_FACTOR * this.scaleFactor))}px`;
    }

    watermarkEl.style.top = `${Math.round((top) + (height * this.scaleFactor) - (VERTICAL_PADDING_FACTOR * this.scaleFactor))}px`;
    watermarkEl.style.scale = this.scaleFactor.toString();
  };

  sendIframeScreenSizeData = (scaleFactor: number, iframePos: IframePos): void => {
    window.postMessage({
      scaleFactor,
      screenId: this.props.screen.id,
      type: SCREEN_SIZE_MSG,
      iframePos
    }, '*');
  };

  handleScreenResponsiveness = (): void => {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      throw new Error("Can't find embed iframe");
    }

    const origFrameViewPort = frame.parentElement!.getBoundingClientRect();
    frame.style.position = 'absolute';
    frame.style.transformOrigin = '0 0';
    frame.style.top = `${this.props.heightOffset}px`;
    frame.style.left = '0px';

    if (this.props.screen.type === ScreenType.Img) {
      this.handleImgScreenResponsiveness();
    }

    origFrameViewPort.height -= this.props.heightOffset;

    if (!this.props.isResponsive) {
      // INFO for now we use a constant image scaling size of 1280 / 720 (with ratio 16:9)
      const vpdW = this.props.screen.type === ScreenType.SerDom ? this.props.screenData.vpd.w : 1280;
      const vpdH = this.props.screen.type === ScreenType.SerDom ? this.props.screenData.vpd.h : 720;

      const scaleX = origFrameViewPort.width / vpdW;
      const scaleY = origFrameViewPort.height / vpdH;
      const scale = Math.min(scaleX, scaleY);
      // eslint-disable-next-line react/no-unused-class-component-methods
      this.scaleFactor = scale;

      frame.style.transform = `scale(${scale})`;
      frame.style.transformOrigin = '0 0';
      frame.style.position = 'absolute';
      frame.style.width = `${vpdW}px`;
      frame.style.height = `${vpdH}px`;

      const viewPortAfterScaling = frame.getBoundingClientRect();

      const iframePos = {
        left: viewPortAfterScaling.left,
        top: viewPortAfterScaling.top,
        height: viewPortAfterScaling.height,
        width: viewPortAfterScaling.width
      };

      if (origFrameViewPort.width > viewPortAfterScaling.width) {
        frame.style.left = `${(origFrameViewPort.width - viewPortAfterScaling.width) / 2}px`;
        iframePos.left = (origFrameViewPort.width - viewPortAfterScaling.width) / 2;
      }
      if (origFrameViewPort.height > viewPortAfterScaling.height) {
        const scaledOffset = this.props.heightOffset * scale;
        frame.style.top = `${((origFrameViewPort.height - viewPortAfterScaling.height) / 2) + (scaledOffset)}px`;
        iframePos.top = ((origFrameViewPort.height - viewPortAfterScaling.height) / 2) + (scaledOffset);
      }

      this.handleWatermarkPositioning(
        (origFrameViewPort.height - viewPortAfterScaling.height) / 2,
        vpdH,
        (origFrameViewPort.width - viewPortAfterScaling.width) / 2,
        vpdW
      );

      this.sendIframeScreenSizeData(scale, iframePos);
      frame.style.background = 'white';

      return;
    }
    frame.style.width = `${origFrameViewPort.width}px`;
    frame.style.height = `${origFrameViewPort.height}px`;
    frame.style.left = '0';
    frame.style.top = `${this.props.heightOffset}px`;
    // eslint-disable-next-line react/no-unused-class-component-methods
    this.scaleFactor = 1;
    frame.style.transform = 'scale(1)';

    this.handleWatermarkPositioning(
      0,
      origFrameViewPort.height,
      0,
      origFrameViewPort.width
    );
    const iframePos = {
      left: origFrameViewPort.left,
      top: origFrameViewPort.top + this.props.heightOffset,
      height: origFrameViewPort.height,
      width: origFrameViewPort.width
    };
    this.sendIframeScreenSizeData(1, iframePos);
    frame.style.background = 'white';
  };

  handleImgScreenResponsiveness = (): void => {
    const frame = this.embedFrameRef.current!;
    const origFrameViewPort = frame.parentElement!.getBoundingClientRect();

    const doc = frame.contentDocument!;
    const screenImage = doc.getElementById('img');
    origFrameViewPort.height -= this.props.heightOffset;

    if (screenImage) {
      if (this.props.screen.responsive) {
        screenImage.style.width = 'auto';
        screenImage.style.height = `${origFrameViewPort.height}px`;
      } else {
        screenImage.style.width = '100%';
        screenImage.style.height = 'auto';
      }
    }
  };

  render(): JSX.Element {
    const props = this.props.screenData.isHTML4 ? {} : { srcDoc: IFRAME_DEFAULT_DOC };
    return (
      <>
        <Tags.EmbedFrame
          key={this.props.screen.rid}
          // we added this because some html4 doc would not render properly across different machines
          src={this.props.screenData.isHTML4 ? '/aboutblankhtml4.html' : '/aboutblankhtml5.html'}
          title={this.props.screen.displayName}
          id={ROOT_EMBED_IFRAME_ID}
          className={`fable-iframe-${this.props.screen.id} ${FABLE_IFRAME_GENERIC_CLASSNAME}`}
          style={{
            visibility: this.props.hidden ? 'hidden' : 'visible',
            borderRadius: `${this.props.playMode ? 'none' : '20px'}`,
            background: 'transparent',
            boxShadow: this.props.playMode ? 'none' : 'rgba(67, 71, 85, 0.27) 0px 0px 0.25em, rgba(90, 125, 188, 0.05) 0px 0.25em 1em'
          }}
          ref={ref => {
            this.embedFrameRef.current = ref;
            if (this.props.innerRefs) {
              this.props.innerRefs.forEach(r => r.current = ref);
            }
          }}
          heightOffset={this.props.heightOffset}
          {...props}
        />

        {this.props.showWatermark && <LogoWatermark isHidden={this.props.hidden} watermarkRef={this.watermarkRef} />}
      </>
    );
  }
}
