import React, { useState } from 'react';
import { ResponseStatus } from '@fable/common/dist/api-contract';
import Plus from '../../../../assets/onboarding/plus.svg';
import * as CTags from '../../styled';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import Input from '../../components/Input';
import { createOrg } from './utils';

export default function OrgCreate() {
  const [orgName, setOrgName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (orgName) {
      const resStatus = await createOrg(orgName);
      const redirect = localStorage.getItem('redirect');
      if (resStatus === ResponseStatus.Success) {
        if (redirect) {
          window.location.replace(`/${redirect}`);
        } else {
          window.location.replace('/');
        }
      }
      localStorage.removeItem('redirect');
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

        <form onSubmit={handleSubmit} style={{ marginTop: '1.75rem' }}>
          <Input label="Your org name" value={orgName} onChange={e => setOrgName(e.target.value)} />
          <CTags.NextBtn
            style={{ width: '27rem', marginTop: '1.5rem' }}
            type="submit"
          >
            <img src={Plus} alt="" />
            Create New
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
