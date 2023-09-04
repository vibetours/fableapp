import React, { useState } from 'react';
import { ResponseStatus } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import Plus from '../../../../assets/onboarding/plus.svg';
import * as CTags from '../../styled';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import { createOrg } from './utils';
import Button from '../../../button';
import Input from '../../../input';
import Browser from '../../../../assets/onboarding/org-create-browser.png';
import { AMPLITUDE_EVENTS } from '../../../../amplitude/events';

export default function OrgCreate(): JSX.Element {
  const [orgName, setOrgName] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (orgName) {
      traceEvent(AMPLITUDE_EVENTS.USER_ORG_ASSIGN, {
        org_name: orgName,
        type: 'create_new'
      }, [CmnEvtProp.EMAIL, CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME]);
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
    <>
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

          <form onSubmit={handleSubmit} style={{ marginTop: '1.75rem', width: '27rem' }}>
            <Input label="Your org name" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <Button
              style={{ width: '100%', marginTop: '1.5rem' }}
              type="submit"
              icon={<img src={Plus} alt="" />}
              iconPlacement="left"
            >
              Create New
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
      <CTags.BrowserCon
        src={Browser}
        alt="browser illustration"
      />
    </>

  );
}
