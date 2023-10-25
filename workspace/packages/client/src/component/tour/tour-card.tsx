import React, { useState } from 'react';
import {
  CaretRightOutlined,
  BarChartOutlined,
  ShareAltOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined
} from '@ant-design/icons';
import { Tooltip, Popover, Button, message } from 'antd';
import { CmnEvtProp } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import { P_RespTour } from '../../entity-processor';
import * as Tags from './styled';
import { CtxAction } from '../../container/tours';
import * as GTags from '../../common-styled';
import ShareTourModal from '../publish-preview/share-modal';
import { getIframeShareCode, copyToClipboard } from '../header/utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc } from '../../utils';

interface Props {
  tour: P_RespTour;
  handleShowModal: (tour: P_RespTour | null, ctxAction: CtxAction) => void;
  handleDelete: (tour: P_RespTour | null) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
}

export default function TourCard({ tour, handleShowModal, handleDelete, publishTour }: Props): JSX.Element {
  const [messageApi, contextHolder] = message.useMessage();
  const [isShareModalVisible, setIsShareModalVisible] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishFailed, setIsPublishFailed] = useState(false);

  const copyHandler = async (): Promise<void> => {
    const text = getIframeShareCode('100%', '100%', `/p/demo/${tour?.rid}`);
    await copyToClipboard(text);
    messageApi.open({
      type: 'success',
      content: 'Copied to clipboard',
    });
  };
  return (
    <>
      {contextHolder}
      <Tags.TourCardCon to={`/demo/${tour.rid}`}>
        <Tags.TourThumbnail />
        <Tags.CardDataCon>
          <Tags.DisplayName>
            {tour.displayName}
          </Tags.DisplayName>
          <Tags.TourMetaDataCon>
            Edited {tour.displayableUpdatedAt}
            <Tags.Divider />
            <Tags.AvatarCon>
              Created by <GTags.Avatar src={tour.createdBy.avatar} referrerPolicy="no-referrer" />
            </Tags.AvatarCon>
          </Tags.TourMetaDataCon>

        </Tags.CardDataCon>
        <Tags.TourActionBtnCon>
          <Tooltip title="Preview" overlayStyle={{ fontSize: '0.75rem' }}>
            <Button
              id="TG-1"
              style={{ padding: 0, margin: 0 }}
              size="small"
              shape="circle"
              type="text"
              icon={<CaretRightOutlined />}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                traceEvent(AMPLITUDE_EVENTS.TOUR_PREVIEW_CLICKED, {
                  preview_clicked_from: 'tours',
                  tour_url: createIframeSrc(`/demo/${tour.rid}`)
                }, [CmnEvtProp.EMAIL]);
                window.open(`/pp/demo/${tour.rid}`)?.focus();
              }}
            />
          </Tooltip>
          <Tooltip title="Analytics" overlayStyle={{ fontSize: '0.75rem' }}>
            <Button
              id="TG-2"
              style={{ padding: 0, margin: 0 }}
              size="small"
              shape="circle"
              type="text"
              icon={<BarChartOutlined />}
              onClick={e => {
                e.stopPropagation();
                e.preventDefault();
                window.open(`/a/demo/${tour.rid}`, '_blank')?.focus();
              }}
            />
          </Tooltip>
          <Popover
            content={
              <div onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              >
                <GTags.PopoverMenuItem
                  onMouseDown={e => setIsShareModalVisible(true)}
                >
                  <ShareAltOutlined />&nbsp;&nbsp;&nbsp;Share / Embed Tour
                </GTags.PopoverMenuItem>
                <GTags.PopoverMenuItem
                  onMouseDown={e => handleShowModal(tour, CtxAction.Rename)}
                >
                  <EditOutlined />&nbsp;&nbsp;&nbsp;Rename Tour
                </GTags.PopoverMenuItem>
                <GTags.PopoverMenuItem
                  onMouseDown={e => handleShowModal(tour, CtxAction.Duplicate)}
                >
                  <CopyOutlined />&nbsp;&nbsp;&nbsp;Duplicate Tour
                </GTags.PopoverMenuItem>
                <GTags.PopoverMenuItemDivider color="#ff735050" />
                <GTags.PopoverMenuItem
                  onMouseDown={e => handleDelete(tour)}
                  style={{
                    color: '#ff7350'
                  }}
                >
                  <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Tour
                </GTags.PopoverMenuItem>
              </div>
          }
            trigger="focus"
            placement="right"
          >
            <Button
              id="TG-3"
              style={{ padding: 0, margin: 0 }}
              size="small"
              shape="circle"
              type="text"
              icon={<MoreOutlined />}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
              }}
            />
          </Popover>
        </Tags.TourActionBtnCon>
      </Tags.TourCardCon>
      <ShareTourModal
        height="100%"
        width="100%"
        isModalVisible={isShareModalVisible}
        relativeUrl={`/p/demo/${tour?.rid}`}
        closeModal={() => setIsShareModalVisible(false)}
        copyHandler={copyHandler}
        embedClickedFrom="tours"
        isPublishing={isPublishing}
        setIsPublishing={setIsPublishing}
        setIsPublishFailed={setIsPublishFailed}
        isPublishFailed={isPublishFailed}
        publishTour={publishTour}
        openShareModal={() => setIsShareModalVisible(true)}
        tour={tour}
      />
    </>
  );
}
