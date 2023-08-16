import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Tick from '../../../../assets/onboarding/tick.svg';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import * as CTags from '../../styled';
import * as Tags from './styled';
import HeartEmoji from '../../../../assets/onboarding/heart.png';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/go-to-app-browser.png';

interface Props {
  title: string,
}

export default function ProductTours(props: Props): JSX.Element {
  useEffect(() => {
    document.title = props.title;
  }, []);

  return (
    <>
      <CTags.ContentWrapper>
        <CTags.FlexColContainer>
          <img
            src={HeartEmoji}
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
            <Tags.CardCon>
              <CTags.FlexColContainer>
                <Tags.CardTitle>
                  Chrome Extention
                </Tags.CardTitle>
                <div style={{ color: '#595959' }}>
                  Get ready to create amazing product or feature tours for your users
                </div>
              </CTags.FlexColContainer>
              <Button
                type="button"
                style={{ cursor: 'default', backgroundColor: '#E6E6E6', color: '#555555', transform: 'none' }}
                icon={<img src={Tick} alt="" />}
                iconPlacement="left"
              >
                Installed
              </Button>
            </Tags.CardCon>

            <Tags.CardCon>
              <CTags.FlexColContainer>
                <Tags.CardTitle>
                  Try out Fable
                </Tags.CardTitle>
                <div style={{ color: '#595959' }}>
                  Get ready to create amazing product or feature tours for your users
                </div>
              </CTags.FlexColContainer>
              <Link
                to="/"
                style={{
                  textDecoration: 'none'
                }}
              >
                <Button
                  icon={<img src={ArrowRight} alt="" height={17} />}
                  iconPlacement="right"
                  style={{ width: 175 }}
                >
                  Try Now
                </Button>
              </Link>
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
