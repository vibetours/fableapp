import { ApiOutlined, CreditCardOutlined, NodeIndexOutlined, SettingOutlined, UsergroupAddOutlined, WalletFilled } from '@ant-design/icons';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plan, Status } from '@fable/common/dist/api-contract';
import { CmnEvtProp } from '@fable/common/dist/types';
import packageJSON from '../../../package.json';
import * as Tags from './styled';
import { P_RespSubscription } from '../../entity-processor';
import UserGuideProgress from './user-guide-progess';
import UserGuideDetails from './user-guide-details';
import PlanBadge from './plan-badge';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';

interface Props {
  selected: 'tours' | 'user-management' | 'billing' | 'settings' | 'integrations' | '';
  subs: P_RespSubscription | null;
  tourAvailable?: boolean;
  firstTourRid?: string;
}

function sendEvntToAmplitude(tab: 'interactive_demos' | 'user_management' | 'billing' | 'user_guides'): void {
  import('@fable/common/dist/amplitude').then((amp) => {
    amp.traceEvent(AMPLITUDE_EVENTS.SIDE_PANEL_TAB_CLICKED, { tab }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  }).catch((err) => {
    console.log('error in amplitude event', err);
  });
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
        <Tags.ConNavBtn className={props.selected === 'integrations' ? 'selected' : ''} to="/integrations">
          <ApiOutlined />
          <p>Integrations</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'user-management' ? 'selected' : ''} to="/users">
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
        <Tags.ConNavBtn
          className={props.selected === 'settings' ? 'selected' : ''}
          to="/settings"
          onClick={() => sendEvntToAmplitude('billing')}
        >
          <SettingOutlined />
          <p>Settings</p>
        </Tags.ConNavBtn>

        <div style={{ margin: 'auto 8px 0' }}>
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
      <UserGuideDetails
        tourAvailable={props.tourAvailable as boolean}
        show={isUserGuideDetailsOpen}
        close={() => setIsUserGuideDetailsOpen(false)}
        firstTourRid={props.firstTourRid as string}
      />
    </Tags.Con>
  );
}
