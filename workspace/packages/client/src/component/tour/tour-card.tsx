import {
  BarChartOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { Button, Popover, Tooltip } from 'antd';
import React, { useState } from 'react';
import { ReqTourPropUpdate } from '@fable/common/dist/api-contract';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import * as GTags from '../../common-styled';
import { CtxAction } from '../../container/tours';
import { P_RespTour } from '../../entity-processor';
import { createIframeSrc } from '../../utils';
import { getIframeShareCode } from '../header/utils';
import ShareTourModal from '../publish-preview/share-modal';
import * as Tags from './styled';
import FableLogo from '../../assets/fable-rounded-icon.svg';
import { IFRAME_BASE_URL, PREVIEW_BASE_URL } from '../../constants';
import { SiteData } from '../../types';
import { amplitudeShareModalOpen } from '../../amplitude';
import { FeatureForPlan } from '../../plans';

interface Props {
  tour: P_RespTour;
  handleShowModal: (tour: P_RespTour | null, ctxAction: CtxAction) => void;
  handleDelete: (tour: P_RespTour | null) => void;
  publishTour: (tour: P_RespTour) => Promise<boolean>;
  updateTourProp: <T extends keyof ReqTourPropUpdate>(
    rid: string,
    tourProp: T,
    value: ReqTourPropUpdate[T]
  ) => void;
  disable: boolean;
  showUpgradeModal: ()=>void;
  featureForPlan: FeatureForPlan | null;
}

export default function TourCard({
  tour, handleShowModal, handleDelete, publishTour, updateTourProp, disable, showUpgradeModal, featureForPlan
}: Props): JSX.Element {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState<boolean>(false);

  const onSiteDataChange = (site: SiteData): void => {
    updateTourProp(tour.rid, 'site', site);
  };

  return (
    <>
      <Tags.TourCardCon
        to={disable ? '' : `/demo/${tour.rid}`}
        onClick={() => {
          if (disable) {
            showUpgradeModal();
          }
        }}
      >
        <Tags.TourThumbnail />
        <Tags.CardDataCon>
          <Tags.DisplayName>
            {tour.displayName}
          </Tags.DisplayName>
          {
            tour.onboarding
              ? (
                <Tags.TourMetaDataCon>
                  <Tags.TourCreated>Sample demo created by </Tags.TourCreated>
                  <img style={{ width: '16px' }} src={FableLogo} alt="fable-logo" />
                </Tags.TourMetaDataCon>
              )
              : (
                <Tags.TourMetaDataCon>
                  Edited {tour.displayableUpdatedAt}
                  <Tags.Divider />
                  <Tags.AvatarCon>
                    Created by <GTags.Avatar src={tour.createdBy.avatar} referrerPolicy="no-referrer" />
                  </Tags.AvatarCon>
                </Tags.TourMetaDataCon>
              )
          }
        </Tags.CardDataCon>
        {disable
          ? (
            <Tags.EmbedBtn
              type="submit"
              style={{ height: '26px' }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: 500
              }}
              >
                Upgrade
              </span>
            </Tags.EmbedBtn>
          )
          : (
            <Tags.TourActionBtnCon>
              {tour.lastPublishedDate && (
              <Tooltip title="Copy Embed Link" overlayStyle={{ fontSize: '0.75rem' }}>
                <Tags.EmbedBtn
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsShareModalVisible(true);
                    amplitudeShareModalOpen('tours');
                  }}
                >
                  <ShareAltOutlined />&nbsp;&nbsp;
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 500
                  }}
                  >
                    Share
                  </span>
                </Tags.EmbedBtn>
              </Tooltip>
              )}
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
                    window.open(`/${PREVIEW_BASE_URL}/demo/${tour.rid}`)?.focus();
                  }}
                />
              </Tooltip>
              {!tour.onboarding && (
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
              )}
              {!tour.onboarding && (
              <Popover
                content={
                  <div onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  >
                    <GTags.PopoverMenuItem
                      onMouseDown={e => {
                        setIsShareModalVisible(true);
                        amplitudeShareModalOpen('tours');
                      }}
                    >
                      <ShareAltOutlined />&nbsp;&nbsp;&nbsp;Share / Embed Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleShowModal(tour, CtxAction.Rename)}
                    >
                      <EditOutlined />&nbsp;&nbsp;&nbsp;Rename Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleShowModal(tour, CtxAction.Duplicate)}
                    >
                      <CopyOutlined />&nbsp;&nbsp;&nbsp;Duplicate Demo
                    </GTags.PopoverMenuItem>
                    <GTags.PopoverMenuItemDivider color="#ff735050" />
                    <GTags.PopoverMenuItem
                      onMouseDown={e => handleDelete(tour)}
                      style={{
                        color: '#ff7350'
                      }}
                    >
                      <DeleteOutlined />&nbsp;&nbsp;&nbsp;Delete Demo
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
              )}
            </Tags.TourActionBtnCon>
          )}
      </Tags.TourCardCon>
      <ShareTourModal
        height="100%"
        width="100%"
        isModalVisible={isShareModalVisible}
        relativeUrl={`/demo/${tour?.rid}`}
        closeModal={() => setIsShareModalVisible(false)}
        publishTour={publishTour}
        openShareModal={() => {
          setIsShareModalVisible(true);
          amplitudeShareModalOpen('tours');
        }}
        tour={tour}
        copyUrl={getIframeShareCode('100%', '100%', `/${IFRAME_BASE_URL}/demo/${tour?.rid}`)}
        tourOpts={null}
        onSiteDataChange={onSiteDataChange}
        setIsPublishing={setIsPublishing}
        isPublishing={isPublishing}
        featureForPlan={featureForPlan}
      />
    </>
  );
}
