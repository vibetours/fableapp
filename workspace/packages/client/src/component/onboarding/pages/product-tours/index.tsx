import React from 'react';
import { Link } from 'react-router-dom';
import Tick from '../../../../assets/onboarding/tick.svg';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import * as CTags from '../../styled';
import * as Tags from './styled';
import HeartEmoji from '../../../../assets/onboarding/heart.png';

export default function ProductTours() {
  return (
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
            <Tags.Btn type="button" style={{ cursor: 'default' }}>
              <img
                src={Tick}
                alt=""
                width="17"
                height="17"
              />
              Installed
            </Tags.Btn>
          </Tags.CardCon>
          <Tags.CardCon>
            <CTags.FlexColContainer>
              <Tags.CardTitle>
                Try out Fable
              </Tags.CardTitle>
              <div style={{ color: '#595959' }}>
                Get ready to create amazing product or feature tours for your users
              </div>
              <a
                style={{
                  color: '#7567FF',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
                href="#"
              >
                See features {'>'}
              </a>
            </CTags.FlexColContainer>
            <Link
              to="/onboarding/tnc"
              style={{
                textDecoration: 'none'
              }}
            >
              <Tags.Btn
                style={{
                  backgroundColor: '#7567FF',
                  color: '#FFF',
                }}
              >
                Try Now
                <img
                  src={ArrowRight}
                  alt=""
                />
              </Tags.Btn>
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
  );
}
