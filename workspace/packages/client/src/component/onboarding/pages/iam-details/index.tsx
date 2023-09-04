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

    if (
      resStatus === ResponseStatus.Success
      && principal
      && principal.orgAssociation !== UserOrgAssociation.Explicit
    ) {
      // If org creation is not yet done then create org first
      if (!document.location.pathname.startsWith('/org/')) {
        window.location.replace(
          principal.orgAssociation === UserOrgAssociation.Implicit ? '/org/assign' : '/org/create'
        );
      }
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
        <CTags.Header><CTags.SpanBlock>Start creating</CTags.SpanBlock>amazing product tours</CTags.Header>
        <CTags.Subtitle>
          <CTags.SpanBlock>Get ready to create amazing product or feature tours for your users.</CTags.SpanBlock>
          These tours are easy to create
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
          href="https://calendly.com/vikaspotta-fable/30min"
          target="_blank"
          rel="noopener noreferrer"
        >
          Talk to us
        </CTags.Link>
      </CTags.StepDotsWrapper>
    </CTags.ContentWrapper>
  );
}
