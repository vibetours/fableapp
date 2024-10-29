import {
  ApiOutlined,
  CalendarOutlined,
  CreditCardOutlined,
  DatabaseOutlined,
  HeatMapOutlined,
  MoreOutlined,
  NodeIndexOutlined,
  RiseOutlined,
  SettingOutlined,
  UsergroupAddOutlined
} from '@ant-design/icons';
import { Status } from '@fable/common/dist/api-contract';
import { CmnEvtProp } from '@fable/common/dist/types';
import { Popover, Tooltip } from 'antd';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import { P_RespSubscription, getNumberOfDaysFromNow } from '../../entity-processor';
import { isActiveBusinessPlan } from '../../utils';
import PlanBadge from './plan-badge';
import * as Tags from './styled';

interface Props {
  selected: 'tours' | 'demo-hub' |'user-management' | 'billing' | 'settings' | 'integrations' | 'leads'
  | 'datasets' | '';
  subs: P_RespSubscription | null;
  compact?: boolean;
}

function sendEvntToAmplitude(tab: 'interactive_demos' | 'user_management' | 'billing' | 'user_guides'): void {
  import('@fable/common/dist/amplitude').then((amp) => {
    amp.traceEvent(AMPLITUDE_EVENTS.SIDE_PANEL_TAB_CLICKED, { tab }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
  }).catch((err) => {
    console.log('error in amplitude event', err);
  });
}

export default function SidePanel(props: Props): JSX.Element {
  const navigate = useNavigate();
  const isBuisnessPlan = isActiveBusinessPlan(props.subs);

  const isTrialAndEndGreaterThanOneYear = (): boolean => {
    if (!props.subs) return false;
    const [_, days] = getNumberOfDaysFromNow(new Date(props.subs.trialEndsOn));
    return days > 365 && props.subs.status === Status.IN_TRIAL;
  };

  if (props.compact) {
    return (
      <Tags.Con>
        <Tags.ConNav>
          <Tooltip placement="right" title="Interactive demos">
            <Tags.ConNavBtn
              className={props.selected === 'tours' ? 'selected' : ''}
              to="/demos?c=1"
              onClick={() => sendEvntToAmplitude('interactive_demos')}
            >
              <NodeIndexOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="User management">
            <Tags.ConNavBtn className={props.selected === 'user-management' ? 'selected' : ''} to="/users?c=1">
              <UsergroupAddOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="Billing">
            <Tags.ConNavBtn
              className={props.selected === 'billing' ? 'selected' : ''}
              to="/billing?c=1"
              onClick={() => sendEvntToAmplitude('billing')}
            >
              <CreditCardOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Tooltip placement="right" title="Free demo consultation">
            <Tags.ConNavBtn
              to="https://www.sharefable.com/get-a-demo?ref=app_dashboard"
              target="_blank"
            >
              <CalendarOutlined />
            </Tags.ConNavBtn>
          </Tooltip>
          <Popover
            content={
              <Tags.ConNav>
                <Tags.ConNavBtn className={props.selected === 'demo-hub' ? 'selected' : ''} to="/demo-hubs?c=1">
                  <HeatMapOutlined />
                  <p>Demo hub</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn className={props.selected === 'leads' ? 'selected' : ''} to="/leads?c=1">
                  <RiseOutlined />
                  <p>Leads</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn className={props.selected === 'integrations' ? 'selected' : ''} to="/integrations?c=1">
                  <ApiOutlined />
                  <p>Integrations</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn
                  className={props.selected === 'settings' ? 'selected' : ''}
                  to="/settings?c=1"
                  onClick={() => sendEvntToAmplitude('billing')}
                >
                  <SettingOutlined />
                  <p>Settings</p>
                </Tags.ConNavBtn>
                <Tags.ConNavBtn className={props.selected === 'datasets' ? 'selected' : ''} to="/datasets?c=1">
                  <DatabaseOutlined />
                  <p>Datasets</p>
                </Tags.ConNavBtn>
              </Tags.ConNav>
            }
            placement="right"
            trigger="hover"
          >
            { /* eslint-disable-next-line no-script-url */}
            <Tags.ConNavBtn to="javascript:void(0)">
              <MoreOutlined />
            </Tags.ConNavBtn>
          </Popover>
        </Tags.ConNav>
      </Tags.Con>
    );
  }

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
        <Tags.ConNavBtn className={props.selected === 'demo-hub' ? 'selected' : ''} to="/demo-hubs">
          <HeatMapOutlined />
          <p>Demo hub</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn className={props.selected === 'leads' ? 'selected' : ''} to="/leads">
          <RiseOutlined />
          <p>Leads</p>
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
        <Tags.ConNavBtn className={props.selected === 'datasets' ? 'selected' : ''} to="/datasets">
          <DatabaseOutlined />
          <p>Datasets</p>
        </Tags.ConNavBtn>
        <Tags.ConNavBtn
          to="https://www.sharefable.com/get-a-demo?ref=app_dashboard"
          target="_blank"
        >
          <CalendarOutlined />
          <p>Free demo consultation</p>
        </Tags.ConNavBtn>
        <div style={{ margin: 'auto 8px 16px' }}>
          {props.subs && !isBuisnessPlan && !isTrialAndEndGreaterThanOneYear() && <PlanBadge
            subs={props.subs}
            onClick={() => {
              sendEvntToAmplitude('billing');
              navigate('/billing');
            }}
          />}
        </div>
      </Tags.ConNav>
    </Tags.Con>
  );
}
