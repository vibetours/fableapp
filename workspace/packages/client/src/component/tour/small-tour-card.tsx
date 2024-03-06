import {
  CaretRightOutlined,
} from '@ant-design/icons';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespTour } from '../../entity-processor';
import { createIframeSrc } from '../../utils';
import * as Tags from './styled';
import FableLogo from '../../assets/fable-rounded-icon.svg';

  interface Props {
    tour: P_RespTour;
  }

export default function SmallTourCard({ tour }: Props): JSX.Element {
  return (
    <>
      <Tags.SmallTourCardCon to={`/demo/${tour.rid}`}>
        <div style={{ display: 'flex' }}>
          <Tags.CardDataCon>
            <Tags.DisplayName>
              {tour.displayName}
            </Tags.DisplayName>
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
          </Tags.TourActionBtnCon>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Tags.TourCreated>Sample demo created by </Tags.TourCreated>
          <img style={{ width: '16px' }} src={FableLogo} alt="fable-logo" />
        </div>
      </Tags.SmallTourCardCon>
    </>
  );
}
