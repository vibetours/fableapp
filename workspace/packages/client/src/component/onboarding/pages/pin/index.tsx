import React from 'react-dom';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import StepDot from '../../step-dot';
import * as CTags from '../../styled';
import LoveEyesEmoji from '../../../../assets/onboarding/love-eyes.png';
import CurvedArrow from '../../../../assets/onboarding/curved-arrow.svg';

interface Props {
  title: string,
}

export default function Pin(props: Props) {
  useEffect(() => {
    document.title = props.title;
  }, []);

  return (
    <CTags.ContentWrapper>
      <CTags.FlexColContainer>
        <img
          src={LoveEyesEmoji}
          alt=""
          width={48}
          style={{
            display: 'block'
          }}
        />
        <CTags.Header
          style={{ position: 'relative' }}
        >
          <CTags.SpanBlock>Extension Installed!</CTags.SpanBlock>Pin it for easy access

          <img
            src={CurvedArrow}
            alt=""
            style={{
              position: 'absolute',
              bottom: '-70%',
              right: '-30%',
              width: '187px'
            }}
          />

        </CTags.Header>
        <CTags.Subtitle>
          <CTags.SpanBlock>Make sure to pin it for easy access.</CTags.SpanBlock>
          Click the pinned icon to start a recording from anywhere
        </CTags.Subtitle>
      </CTags.FlexColContainer>
      <Link to="/onboarding/tours" style={{ textDecoration: 'none' }}>
        <CTags.NextBtn>
          Next
          <img src={ArrowRight} alt="" />
        </CTags.NextBtn>
      </Link>

      <CTags.StepDotsWrapper>
        {[...Array(3)].map((item, idx) => <StepDot key={idx} selected={idx === 0} />)}
      </CTags.StepDotsWrapper>
    </CTags.ContentWrapper>
  );
}
