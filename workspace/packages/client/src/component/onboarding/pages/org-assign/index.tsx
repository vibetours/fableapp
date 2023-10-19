import React from 'react';
import { RespOrg, ResponseStatus } from '@fable/common/dist/api-contract';
import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import Plus from '../../../../assets/onboarding/plus.svg';
import * as CTags from '../../styled';
import * as Tags from './styled';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import { assignImplicitOrgToUser } from './utils';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/org-assign-browser.png';
import { AMPLITUDE_EVENTS } from '../../../../amplitude/events';

interface Props {
  org: RespOrg;
}

export default function OrgAssign({ org }: Props): JSX.Element {
  const handleOnOrgJoin = async (): Promise<void> => {
    // Right now there is no option to choose from org, hence we always assign the user to
    // default org
    const resStatus = await assignImplicitOrgToUser();
    const redirect = localStorage.getItem('redirect');

    if (resStatus === ResponseStatus.Success) {
      traceEvent(AMPLITUDE_EVENTS.USER_ORG_ASSIGN, {
        org_name: org.displayName,
        type: 'join'
      }, [CmnEvtProp.EMAIL, CmnEvtProp.FIRST_NAME, CmnEvtProp.LAST_NAME]);
      if (redirect) {
        localStorage.removeItem('redirect');
        window.location.replace(`/${redirect!}`);
      } else {
        window.location.replace('/');
      }
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
            <CTags.SpanBlock>Good news! Your</CTags.SpanBlock>account is already set up.
          </CTags.Header>
          <CTags.Subtitle>
            Please join your organization's account and get started with Fable.
          </CTags.Subtitle>

          <CTags.FlexColContainer>
            <Tags.CardCon key={org.rid}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
              }}
              >
                <Tags.CardIcon shape="circle" size="large">{org.displayName[0].toUpperCase()}</Tags.CardIcon>
                <Tags.CardTitle>
                  {org.displayName}
                </Tags.CardTitle>
              </div>
              <Button
                iconPlacement="left"
                type="button"
                onClick={handleOnOrgJoin}
                icon={
                  <img
                    src={Plus}
                    alt=""
                    width="14"
                    height="14"
                  />
                }
              >
                Join
              </Button>
            </Tags.CardCon>
          </CTags.FlexColContainer>

        </CTags.FlexColContainer>

        <CTags.StepDotsWrapper>
          Need help?
          <CTags.Link
            href="https://www.sharefable.com/get-a-demo"
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
