import React, { useState } from 'react';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { LoadingOutlined } from '@ant-design/icons';
import Plus from '../../../../assets/onboarding/plus.svg';
import * as CTags from '../../styled';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import Button from '../../../button';
import Input from '../../../input';
import Browser from '../../../../assets/onboarding/org-create-browser.png';
import { AMPLITUDE_EVENTS } from '../../../../amplitude/events';
import { TALK_TO_US_LINK } from '../../../../constant';

interface Props {
  createOrg: (orgName: string)=> void;
}
export default function OrgCreate({ createOrg }: Props): JSX.Element {
  const [orgName, setOrgName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setIsLoading(true);

    if (orgName && !isLoading) {
      traceEvent(AMPLITUDE_EVENTS.USER_ORG_ASSIGN, {
        org_name: orgName,
        type: 'create_new'
      }, [CmnEvtProp.EMAIL, CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME]);
      createOrg(orgName);
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
          <CTags.Header>
            <CTags.SpanBlock>Let&apos;s get your account</CTags.SpanBlock>up and running, shall we?
          </CTags.Header>
          <CTags.Subtitle>
            Create an account with your organization's name and invite your team members to be a part of it.
            You can collaborate with your team on all your interative demos.
          </CTags.Subtitle>

          <form onSubmit={handleSubmit} style={{ width: '27rem' }}>
            <Input label="Your org name" value={orgName} onChange={e => setOrgName(e.target.value)} />
            <Button
              style={{ width: '100%', marginTop: '1.5rem' }}
              type="submit"
              icon={isLoading ? <LoadingOutlined /> : <img src={Plus} alt="" />}
              iconPlacement="left"
            >
              Create New
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
      <CTags.BrowserCon
        src={Browser}
        alt="browser illustration"
      />
    </>

  );
}
