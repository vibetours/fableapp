import React from 'react';
import { ThunderboltOutlined } from '@ant-design/icons';
import { Plan, Status } from '@fable/common/dist/api-contract';
import * as Tags from './styled';
import { P_RespSubscription } from '../../entity-processor';

interface Props {
  onClick: ()=> void;
  subs: P_RespSubscription;
}

interface badgeText {
  title: string,
  subTitle: string
}

const getPlanBadgeText = (subs: P_RespSubscription) : badgeText => {
  const badgeText: badgeText = {
    title: '',
    subTitle: ''
  };

  if (subs.status === Status.ACTIVE && subs.paymentPlan === Plan.STARTUP) {
    badgeText.title = 'Startup';
    badgeText.subTitle = 'Upgrade now';
    return badgeText;
  }

  if (subs.status === Status.NON_RENEWING) {
    badgeText.title = 'Non Renewing Plan';
    badgeText.subTitle = 'Renew now';
    return badgeText;
  }

  if (subs.displayableTrialEndsOn === 'Expired') {
    badgeText.title = 'Expired';
    badgeText.subTitle = 'Renew your subscription by clicking here';
    return badgeText;
  }

  badgeText.title = 'On Trial';
  badgeText.subTitle = subs.displayableTrialEndsOn as string;

  return badgeText;
};

export default function PlanBadge(props: Props): JSX.Element {
  const badgeText: badgeText = getPlanBadgeText(props.subs);

  return (
    <Tags.PlanBadgeCon onClick={props.onClick}>
      <ThunderboltOutlined style={{ fontSize: 20 }} />
      <div style={{ width: '75%' }}>
        <div style={{ color: '#212121' }}>
          {badgeText.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6a6a6a' }}>
          {badgeText.subTitle}
        </div>
      </div>
    </Tags.PlanBadgeCon>
  );
}
