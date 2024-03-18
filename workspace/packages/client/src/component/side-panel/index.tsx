import { CreditCardOutlined, NodeIndexOutlined, UsergroupAddOutlined, WalletFilled } from '@ant-design/icons';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plan, Status } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import packageJSON from '../../../package.json';
import * as Tags from './styled';
import { P_RespSubscription } from '../../entity-processor';
import UserGuideProgress from './user-guide-progess';
import UserGuideDetails from './user-guide-details';
import PlanBadge from './plan-badge';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  selected: 'tours' | 'user-management' | 'billing' | 'settings';
  subs: P_RespSubscription | null;
  tourAvailable?: boolean;
  firstTourRid?: string;
}

function sendEvntToAmplitude(tab: 'interactive_demos' | 'user_management' | 'billing' | 'user_guides'): void {
  traceEvent(AMPLITUDE_EVENTS.SIDE_PANEL_TAB_CLICKED, { tab }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
}

export default function SidePanel(props: Props): JSX.Element {
  const [isUserGuideDetailsOpen, setIsUserGuideDetailsOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const isBuisnessPlan = props.subs && props.subs.status === Status.ACTIVE && props.subs.paymentPlan === Plan.BUSINESS;

  return (
    <Tags.Con>
      <Tags.ConNav>

        <Tags.ConNavBtn
          className={props.selected === 'tours' ? 'selected' : ''}
          to="/demos"
          onClick={() => sendEvntToAmplitude('interactive_demos')}
        >
          <NodeIndexOutlined />
          <p>Interactive demos</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'user-management' ? 'selected' : ''}
          to="/users"
          onClick={() => sendEvntToAmplitude('user_management')}
        >
          <UsergroupAddOutlined />
          <p>User management</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          className={props.selected === 'billing' ? 'selected' : ''}
          to="/billing"
          onClick={() => sendEvntToAmplitude('billing')}
        >
          <CreditCardOutlined />
          <p>Billing</p>
        </Tags.ConNavBtn>

        <div style={{ marginTop: 'auto' }}>
          {props.subs && !isBuisnessPlan && <PlanBadge
            subs={props.subs}
            onClick={() => {
              sendEvntToAmplitude('billing');
              navigate('/billing');
            }}
          />}
          <UserGuideProgress
            selected={isUserGuideDetailsOpen}
            onClick={() => {
              sendEvntToAmplitude('user_guides');
              setIsUserGuideDetailsOpen(prevState => !prevState);
            }}
          />
        </div>
      </Tags.ConNav>
      <Tags.Footer style={{ marginBottom: '1.8rem' }}>
        <Tags.FooterItem className={`footerItem ${props.selected === 'settings' ? 'selected' : ''}`}>
          <p style={{ fontSize: '0.85rem', color: '#747474', opacity: '0.6' }}>
            {props.subs && (
              <>
                <WalletFilled />&nbsp;
                {props.subs.paymentPlan[0] + props.subs.paymentPlan.substring(1).toLowerCase()}
              </>
            )}
            <span style={{ fontSize: '0.85rem', color: '#BDBDBD', opacity: '1' }}> - v{packageJSON.version}</span>
          </p>
        </Tags.FooterItem>
      </Tags.Footer>
      <UserGuideDetails
        tourAvailable={props.tourAvailable as boolean}
        show={isUserGuideDetailsOpen}
        close={() => setIsUserGuideDetailsOpen(false)}
        firstTourRid={props.firstTourRid as string}
      />
    </Tags.Con>
  );
}
