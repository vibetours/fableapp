import { Status } from '@fable/common/dist/api-contract';
import React, { ReactElement } from 'react';
import { P_RespSubscription } from '../../entity-processor';
import { TrialBadgeCon } from './styled';

interface IOwnProps {
  subs: P_RespSubscription;
}

type IProps = IOwnProps;

export function PlanBadge(props: IOwnProps): JSX.Element {
  return (
    <TrialBadgeCon>
      {props.subs.status === Status.IN_TRIAL ? (
        <a href="/billing">
          <span>Trial :&nbsp;</span>
          <span style={{ fontSize: '0.7rem' }}>{props.subs.displayableTrialEndsOn}</span>
        </a>
      ) : (
        <span>{props.subs.paymentPlan}</span>
      )}
    </TrialBadgeCon>
  );
}
