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
import { Tooltip, Popover, Button, notification, Modal } from 'antd';
import { CmnEvtProp, ITourDataOpts } from '@fable/common/dist/types';
import { traceEvent } from '@fable/common/dist/amplitude';
import { P_RespTour } from '../../entity-processor';
import * as Tags from './styled';
import { CtxAction } from '../../container/tours';
import * as GTags from '../../common-styled';
import ShareTourModal from './share-tour-modal';
import { createIframe, copyToClipboard } from '../header/utils';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { createIframeSrc } from '../../utils';

const MainNotSetInfoModal = (): void => {
  Modal.info({
    title: 'Entry point for the tour is not set',
    content: (
      <div>
        <p>
          The enry point has not been set for the tour that you
          are trying to preview
        </p>
        <p>
          To set an entry point, go into the tour, select a screen, and set "main" from
          "Advance" options
        </p>
      </div>
    ),
    onOk() {},
  });
};

interface Props {
  tour: P_RespTour;
  handleShowModal: (tour: P_RespTour | null, ctxAction: CtxAction) => void;
  handleDelete: (tour: P_RespTour | null) => void;
  opts: ITourDataOpts | null;
  loadTourData: (rid: string) => void;
}

export default function TourCard({ tour, handleShowModal, handleDelete, ...props }: Props): JSX.Element {
  const [isShareModalVisible, setIsShareModalVisible] = useState<boolean>(false);
  const [notificationApi, notificationContextHolder] = notification.useNotification();

  const copyHandler = async (): Promise<void> => {
    const text = createIframe(`/p/tour/${tour?.rid}`);
    await copyToClipboard(text);
    setIsShareModalVisible(false);
    notificationApi.success({
      message: 'Copied to clipboard',
      duration: 1.5,
    });
  };
  return (
    <>
      {notificationContextHolder}
      <Tags.TourCardCon to={`/tour/${tour.rid}`}>
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
                props.loadTourData(tour.rid);
                if (props.opts?.main) {
                  traceEvent(AMPLITUDE_EVENTS.TOUR_PREVIEW_CLICKED, {
                    preview_clicked_from: 'tours',
                    tour_url: createIframeSrc(`/tour/${tour.rid}`)
                  }, [CmnEvtProp.EMAIL]);
                  window.open(`/p/tour/${tour.rid}`)?.focus();
                } else {
                  MainNotSetInfoModal();
                }
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
                window.open(`/a/tour/${tour.rid}`, '_blank')?.focus();
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
        isModalVisible={isShareModalVisible}
        relativeUrl={`/p/tour/${tour?.rid}`}
        closeModal={() => setIsShareModalVisible(false)}
        copyHandler={copyHandler}
        embedClickedFrom="tours"
      />
    </>
  );
}
