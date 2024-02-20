import React, { useState } from 'react';
import { RespUser, ResponseStatus, UserOrgAssociation } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import * as CTags from '../../styled';
import RightArrow from '../../../../assets/onboarding/arrow-right.svg';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import { updateUser } from './utils';
import Button from '../../../button';
import Input from '../../../input';
import { AMPLITUDE_EVENTS } from '../../../../amplitude/events';
import { setEventCommonState } from '../../../../utils';
import { TALK_TO_US_LINK } from '../../../../constant';

interface Props {
  principal: RespUser | null;
}

export default function IamDetails({ principal }: Props): JSX.Element {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    const resStatus = await updateUser(firstName, lastName);
    setEventCommonState(CmnEvtProp.FIRST_NAME, firstName);
    setEventCommonState(CmnEvtProp.LAST_NAME, lastName);
    traceEvent(
      AMPLITUDE_EVENTS.USER_SIGNUP,
      {},
      [CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME, CmnEvtProp.EMAIL]
    );

    if (resStatus !== ResponseStatus.Success) return;

    if (principal!.orgAssociation !== UserOrgAssociation.Explicit) {
      // If org creation is not yet done then create org first
      if (!document.location.pathname.startsWith('/organization-')) {
        window.location.replace(
          principal!.orgAssociation === UserOrgAssociation.Implicit ? '/organization-join' : '/organization-details'
        );
      }
    } else {
      window.location.replace('/demos');
    }
  };

  return (
    <CTags.ContentWrapper>
      <CTags.FlexColContainer>
        <img
          src={RocketEmoji}
          alt=""
          width={48}
          style={{
            display: 'block'
          }}
        />
        <CTags.Header>
          <CTags.SpanBlock>Welcome to the world</CTags.SpanBlock>of stunning interactive demos!
        </CTags.Header>
        <CTags.Subtitle>
          <CTags.SpanBlock>Before we get started, please tell us a little bit about yourself.</CTags.SpanBlock>
        </CTags.Subtitle>

        <form onSubmit={handleSubmit} style={{ width: '27rem' }}>
          <CTags.FlexColContainer>
            <Input label="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            <Input
              label="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </CTags.FlexColContainer>
          <Button
            icon={<img src={RightArrow} alt="" />}
            iconPlacement="right"
            style={{ marginTop: '1.5rem', width: '100%' }}
          >
            Continue
          </Button>
        </form>

      </CTags.FlexColContainer>

      <CTags.StepDotsWrapper>
        Need help?
        <CTags.Link
          href={TALK_TO_US_LINK}
          target="_blank"
          rel="noopener noreferrer"
        >
          Talk to us
        </CTags.Link>
      </CTags.StepDotsWrapper>
    </CTags.ContentWrapper>
  );
}
