import React, { useState } from 'react';
import { Popover, Tooltip, Button as AntButton } from 'antd';
import { BarChartOutlined, UndoOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import * as Tags from './styled';
import ScreenshotMonitorIcon from '../../assets/icons/screenshot-monitor.svg';
import ShareIcon from '../../assets/icons/share.svg';
import PublishButton from './publish-button';
import { P_RespTour } from '../../entity-processor';
import { DisplaySize, getDimensionsBasedOnDisplaySize } from '../../utils';
import { getIframeShareCode } from '../header/utils';
import ShareTourModal from './share-modal';
import { IFRAME_BASE_URL } from '../../constants';
import { SiteData } from '../../types';
import { amplitudeShareModalOpen } from '../../amplitude';
import { FeatureForPlan } from '../../plans';

interface Props {
  selectedDisplaySize: DisplaySize;
  setSelectedDisplaySize: (selectedDisplaySize: DisplaySize) => void;
  tour: P_RespTour | null;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  handleReplayClick: () => void;
  showShareModal: boolean;
  setShowShareModal: (showShareModal: boolean) => void;
  onSiteDataChange: (site: SiteData)=> void;
  minimalHeader: boolean;
}

export default function PublishOptions(props: Props): JSX.Element {
  const [openPopover, setOpenPopover] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);
  const { height, width } = getDimensionsBasedOnDisplaySize(props.selectedDisplaySize);

  return (
    <>
      <Tags.Header>
        <div className="right-section">
          <Tooltip title="Replay" overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
            <div onClick={props.handleReplayClick}>
              <UndoOutlined className="action-icon" />
            </div>
          </Tooltip>
          <Popover
            content={<DisplaySizeMenu
              selectedDisplaySize={props.selectedDisplaySize}
              setSelectedDisplaySize={props.setSelectedDisplaySize}
              setOpenPopover={setOpenPopover}
            />}
            arrow={false}
            placement="bottom"
            open={openPopover}
            onOpenChange={(visible) => setOpenPopover(visible)}
          >
            <img className="action-icon" src={ScreenshotMonitorIcon} alt="" />
          </Popover>
          {!props.minimalHeader && (
            <>
              <Tooltip title="Embed" overlayInnerStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
                <div onClick={() => {
                  amplitudeShareModalOpen('preview');
                  props.setShowShareModal(true);
                }}
                >
                  <img className="action-icon" src={ShareIcon} alt="" />
                </div>
              </Tooltip>
              <Tooltip title="Insights" overlayStyle={{ fontSize: '0.75rem', borderRadius: '2px' }}>
                <Link to={props.tour ? `/a/demo/${props.tour.rid}` : ''}>
                  <AntButton
                    size="small"
                    shape="circle"
                    type="text"
                    icon={<BarChartOutlined
                      style={{ color: 'white' }}
                    />}
                  />
                </Link>
              </Tooltip>
              <div className="publish-btn">
                <PublishButton
                  setIsPublishFailed={setIsPublishFailed}
                  setIsPublishing={setIsPublishing}
                  publishTour={props.publishTour}
                  tour={props.tour}
                  size="medium"
                  openShareModal={() => {
                    props.setShowShareModal(true);
                    amplitudeShareModalOpen('preview');
                  }}
                  isPublishing={isPublishing}
                />
              </div>
            </>
          )}
        </div>

        {props.tour && <ShareTourModal
          publishTour={props.publishTour}
          tour={props.tour!}
          height={height}
          width={width}
          relativeUrl={`/demo/${props.tour?.rid}`}
          isModalVisible={props.showShareModal}
          closeModal={() => props.setShowShareModal(false)}
          openShareModal={() => {
            props.setShowShareModal(true);
            amplitudeShareModalOpen('preview');
          }}
          copyUrl={getIframeShareCode(height, width, `/${IFRAME_BASE_URL}/demo/${props.tour?.rid}`)}
          tourOpts={null}
          onSiteDataChange={props.onSiteDataChange}
          isPublishing={isPublishing}
          setIsPublishing={setIsPublishing}
        />}
      </Tags.Header>
    </>
  );
}

interface DisplaySizeMenuProps {
  selectedDisplaySize: DisplaySize;
  setSelectedDisplaySize: (selectedDisplaySize: DisplaySize) => void;
  setOpenPopover: React.Dispatch<React.SetStateAction<boolean>>;
}

function DisplaySizeMenu(props: DisplaySizeMenuProps): JSX.Element {
  const handleMenuItemClick = (displaySize: DisplaySize): void => {
    props.setSelectedDisplaySize(displaySize);
    props.setOpenPopover(false);
  };

  return (
    <Tags.PopoverCon>
      <div className="title">
        Select screen size
      </div>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.FIT_TO_SCREEN)}
        selected={props.selectedDisplaySize === DisplaySize.FIT_TO_SCREEN}
      >
        Fit to screen
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MEDIUM)}
        selected={props.selectedDisplaySize === DisplaySize.MEDIUM}
      >
        Medium
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.SMALL)}
        selected={props.selectedDisplaySize === DisplaySize.SMALL}
      >
        Small
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MOBILE_PORTRAIT)}
        selected={props.selectedDisplaySize === DisplaySize.MOBILE_PORTRAIT}
      >
        Mobile (Portrait)
      </Tags.PopoverMenuItem>
      <Tags.PopoverMenuItem
        onClick={() => handleMenuItemClick(DisplaySize.MOBILE_LANDSCAPE)}
        selected={props.selectedDisplaySize === DisplaySize.MOBILE_LANDSCAPE}
      >
        Mobile (Landscape)
      </Tags.PopoverMenuItem>
    </Tags.PopoverCon>
  );
}
