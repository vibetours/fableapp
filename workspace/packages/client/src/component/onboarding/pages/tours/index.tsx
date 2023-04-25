import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import StepDot from '../../step-dot';
import * as CTags from '../../styled';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import HeartEmoji from '../../../../assets/onboarding/heart.png';

interface Props {
  title: string,
}

export default function Tours(props: Props) {
  useEffect(() => {
    document.title = props.title;
  }, []);

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
        <CTags.Header><CTags.SpanBlock>Create amazing</CTags.SpanBlock>product tours</CTags.Header>
        <CTags.Subtitle>
          <CTags.SpanBlock>Get ready to create amazing product or feature tours for your users.</CTags.SpanBlock>
          These tours are easy to create
        </CTags.Subtitle>
      </CTags.FlexColContainer>
      <Link to="/login?redirect=onboarding/product-tours" style={{ textDecoration: 'none' }}>
        <CTags.NextBtn>
          Next
          <img src={ArrowRight} alt="" />
        </CTags.NextBtn>
      </Link>

      <CTags.StepDotsWrapper>
        {[...Array(3)].map((item, idx) => <StepDot key={idx} selected={idx === 1} />)}
      </CTags.StepDotsWrapper>
    </CTags.ContentWrapper>
  );
}
