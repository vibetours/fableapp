import React from 'react';
import { RespOrg, ResponseStatus } from '@fable/common/dist/api-contract';
import Plus from '../../../../assets/onboarding/plus.svg';
import * as CTags from '../../styled';
import * as Tags from './styled';
import PlaceholderPicture from '../../../../assets/onboarding/placeholder-picture.svg';
import RocketEmoji from '../../../../assets/onboarding/rocket.png';
import { assignImplicitOrgToUser } from './utils';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/org-assign-browser.png';

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
          <CTags.Header><CTags.SpanBlock>Start creating</CTags.SpanBlock>amazing product tours</CTags.Header>
          <CTags.Subtitle>
            <CTags.SpanBlock>Get ready to create amazing product or feature tours for your users.</CTags.SpanBlock>
            These tours are easy to create
          </CTags.Subtitle>

          <CTags.FlexColContainer>
            <Tags.CardCon key={org.rid}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
              }}
              >
                <img
                  src={PlaceholderPicture}
                  alt="avatar"
                  style={{ width: '3rem', borderRadius: '50%', aspectRatio: 1 }}
                />

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
