import React, { useState } from 'react';
import { RespUser, ResponseStatus, UserOrgAssociation } from '@fable/common/dist/api-contract';
import * as CTags from '../../styled';
import RightArrow from '../../../../assets/onboarding/arrow-right.svg';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import Input from '../../components/Input';
import { updateUser } from './utils';

interface Props {
  principal: RespUser | null;
}

export default function IamDetails({ principal }: Props) {
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const resStatus = await updateUser(firstName, lastName);
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

        <form onSubmit={handleSubmit}>
          <CTags.FlexColContainer>
            <Input label="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required />
            <Input
              label="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </CTags.FlexColContainer>

          <CTags.NextBtn
            style={{ width: '27rem', marginTop: '1.5rem' }}
            type="submit"
          >
            Continue
            <img src={RightArrow} alt="" />
          </CTags.NextBtn>
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
