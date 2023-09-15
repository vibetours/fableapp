import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import StepDot from '../../step-dot';
import * as CTags from '../../styled';
import ArrowRight from '../../../../assets/onboarding/arrow-right.svg';
import HeartEmoji from '../../../../assets/onboarding/heart.png';
import { ONBOARDING_PAGE_ROUTES } from '../../../../container/onboarding';
import Button from '../../../button';
import Browser from '../../../../assets/onboarding/amazing-product-tours-browser.png';

interface Props {
  title: string,
}

export default function Tours(props: Props): JSX.Element {
  useEffect(() => {
    document.title = props.title;
  }, []);

  return (
    <>
      <CTags.ContentWrapper>
        <CTags.MotionDivWrapper
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
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
              We make sure your prospect / customers experience best possible version of your product by creating a controlled but interactive version of your product. You build the narrative, we take care of product experience.
            </CTags.Subtitle>
          </CTags.FlexColContainer>
          <Link to="/login?redirect=onboarding/go-to-app" style={{ textDecoration: 'none' }}>
            <Button icon={<img src={ArrowRight} alt="" />} iconPlacement="right">Next</Button>
          </Link>
        </CTags.MotionDivWrapper>
        <CTags.StepDotsWrapper>
          {[...Array(2)].map((item, idx) => <StepDot key={idx} selected={idx === 1} to={ONBOARDING_PAGE_ROUTES[idx]} />)}
        </CTags.StepDotsWrapper>
      </CTags.ContentWrapper>
      <CTags.BrowserCon
        src={Browser}
        alt="browser illustration"
      />
    </>

  );
}
