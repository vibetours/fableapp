import { ScreenData } from '@fable/common/dist/types';
import React from 'react';
import { ScreenType } from '@fable/common/dist/api-contract';
import { P_RespScreen } from '../../entity-processor';
import { scrollIframeEls } from './scroll-util';
import * as Tags from './preview-styled';
import { deserFrame } from './utils/deser';
import { FABLE_RT_UMBRL, getFableRtUmbrlDiv } from '../annotation/utils';
import { FABLE_IFRAME_GENERIC_CLASSNAME } from '../../constants';

export interface IOwnProps {
  screen: P_RespScreen;
  screenData: ScreenData;
  hidden?: boolean;
  innerRefs?: React.MutableRefObject<HTMLIFrameElement | null>[];
  onBeforeFrameBodyDisplay: (params: { nestedFrames: HTMLIFrameElement[] }) => void;
  onFrameAssetLoad: () => void;
  isScreenPreview: boolean;
  playMode: boolean;
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
        deserFrame(
          this.props.screenData.docTree,
          doc,
          this.props.screenData.version,
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
    if (prevProps.screen.responsive !== this.props.screen.responsive) {
      this.handleScreenResponsiveness();
    }
  }

  componentDidMount(): void {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      throw new Error("Can't find embed iframe");
    }

    frame.onload = () => {
      setTimeout(async () => {
        await this.deserDomIntoFrame(frame);
        /* requestAnimationFrame */setTimeout(() => {
          const doc = frame.contentDocument;
          const frameBody = doc?.body;
          // Make the iframe visible after all the assets are loaded
          Promise.all(this.assetLoadingPromises).then(() => {
            // create a elative container that would contain all the falbe related els
            if (frameBody) {
              let umbrellaDiv = getFableRtUmbrlDiv(doc);
              if (!umbrellaDiv) {
                umbrellaDiv = doc.createElement('div');
                umbrellaDiv.setAttribute('class', FABLE_RT_UMBRL);
                umbrellaDiv.style.position = 'absolute';
                umbrellaDiv.style.left = `${0}`;
                umbrellaDiv.style.top = `${0}`;
                umbrellaDiv.style.setProperty('display', 'block', 'important');
                frameBody.appendChild(umbrellaDiv);
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
      }, this.props.hidden ? 1000 : 16);
    };
  }

  handleScreenResponsiveness = (): void => {
    const frame = this.embedFrameRef.current;
    if (!frame) {
      throw new Error("Can't find embed iframe");
    }

    const origFrameViewPort = frame.parentElement!.getBoundingClientRect();
    frame.style.position = 'absolute';
    frame.style.transformOrigin = '0 0';

    if (this.props.screen.type === ScreenType.Img) {
      this.handleImgScreenResponsiveness();
    }

    if (this.props.screen.type === ScreenType.Img || (this.props.screen.type === ScreenType.SerDom && !this.props.screen.responsive)) {
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
      if (origFrameViewPort.width > viewPortAfterScaling.width) {
        frame.style.left = `${(origFrameViewPort.width - viewPortAfterScaling.width) / 2}px`;
      }
      if (origFrameViewPort.height > viewPortAfterScaling.height) {
        frame.style.top = `${(origFrameViewPort.height - viewPortAfterScaling.height) / 2}px`;
      }
      return;
    }

    frame.style.width = `${origFrameViewPort.width}px`;
    frame.style.height = `${origFrameViewPort.height}px`;
    frame.style.left = '0';
    frame.style.top = '0';
    // eslint-disable-next-line react/no-unused-class-component-methods
    this.scaleFactor = 1;
    frame.style.transform = 'scale(1)';
  };

  handleImgScreenResponsiveness = (): void => {
    const frame = this.embedFrameRef.current!;
    const origFrameViewPort = frame.parentElement!.getBoundingClientRect();

    const doc = frame.contentDocument!;
    const screenImage = doc.getElementById('img');

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
    return (
      <Tags.EmbedFrame
        key={this.props.screen.rid}
        src="about:blank"
        title={this.props.screen.displayName}
        id={ROOT_EMBED_IFRAME_ID}
        className={`fable-iframe-${this.props.screen.id} ${FABLE_IFRAME_GENERIC_CLASSNAME}`}
        style={{
          visibility: this.props.hidden ? 'hidden' : 'visible',
          borderRadius: `${this.props.playMode ? 'none' : '20px'}`,
        }}
        ref={ref => {
          this.embedFrameRef.current = ref;
          if (this.props.innerRefs) {
            this.props.innerRefs.forEach(r => r.current = ref);
          }
        }}
        srcDoc={IFRAME_DEFAULT_DOC}
      />
    );
  }
}
