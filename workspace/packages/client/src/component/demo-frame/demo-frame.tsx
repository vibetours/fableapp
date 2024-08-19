import React, { useEffect, useState } from 'react';
import { AppstoreFilled, CompassFilled, DownSquareFilled, DownSquareOutlined, FullscreenOutlined, FundFilled, LoginOutlined, ReloadOutlined } from '@ant-design/icons';
import { FrameSettings } from '@fable/common/dist/api-contract';
import { Tooltip } from 'antd';
import { getMobileOperatingSystem, isLandscapeMode } from '../../utils';
import { IframePos, ScreenSizeData } from '../../types';
import { P_RespTour } from '../../entity-processor';
import * as Tags from './styled';

interface Props {
  mode: FrameSettings;
  iframePos: IframePos;
  showModule: boolean;
  isJourneyMenuOpen: boolean;
  setIsJourneyMenuOpen: () => void;
  JourneyMenuComponent: JSX.Element;
  tour: P_RespTour;
  replayHandler: () => void;
  makeEmbedFrameFullScreen: () => void;
  screenSizeData: ScreenSizeData
}
export default function DemoFrame(props : Props) : JSX.Element {
  return (
    <Tags.Frame
      mode={props.mode}
      iframePos={props.iframePos}
      scaleFactor={Math.min(props.screenSizeData.scaleFactor * 1.25, 1)}
      zIndex={props.isJourneyMenuOpen ? 10 : 8}
    >
      <div className="ctrl-btns">
        <div className="ctrl-btn" style={{ background: '#f87171' }} />
        <div className="ctrl-btn" style={{ background: '#facc15' }} />
        <div className="ctrl-btn" style={{ background: '#22c55e' }} />
      </div>
      <div className="central-options">
        {
              props.showModule && (
                <div className="module-btn-container">
                  <Tooltip trigger={['hover']} placement="bottom" title={!props.isJourneyMenuOpen ? 'Module' : ''}>
                    <button
                      className="module-btn central-btn"
                      onClick={() => {
                        props.setIsJourneyMenuOpen();
                      }}
                      type="button"
                    >
                      <DownSquareFilled />
                    </button>
                  </Tooltip>

                  {props.isJourneyMenuOpen && (
                  <div className="module-menu">
                    {props.JourneyMenuComponent}
                  </div>
                  )}
                </div>
              )
              }
        <div className="central-title">
          <p>{props.tour?.displayName}</p>
          <Tooltip trigger={['hover']} placement="bottom" title="Reload">
            <button
              className="central-btn"
              onClick={props.replayHandler}
              type="button"
            >
              <ReloadOutlined />
            </button>
          </Tooltip>
        </div>
      </div>
      <div className="right-btns">

        <Tooltip trigger={['hover']} placement="bottom" title="Fullscreen">
          <button
            onClick={props.makeEmbedFrameFullScreen}
            type="button"
          >
            <CompassFilled />
          </button>
        </Tooltip>

        {props.tour.site.ctaText._val && props.tour.site.ctaLink._val && (
          <Tooltip trigger={['hover']} placement="bottomLeft" title={props.tour.site.ctaText._val}>
            <a
              href={props.tour.site.ctaLink._val}
              target="_blank"
              rel="noreferrer"
            >
              <button
                type="button"
              >
                <AppstoreFilled />
              </button>
            </a>
          </Tooltip>
        )}
      </div>
    </Tags.Frame>
  );
}
