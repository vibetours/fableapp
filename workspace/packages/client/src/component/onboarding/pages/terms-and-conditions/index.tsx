import React, { useEffect } from 'react';
import * as CTags from '../../styled';
import * as Tags from './styled';
import TechnologistEmoji from '../../../../assets/onboarding/technologist.png';

interface Props {
  title: string,
}

export default function TermsAndConditions(props: Props) {
  useEffect(() => {
    document.title = props.title;
  }, []);

  const handleClick = () => {
    window.location.replace('/');
  };

  return (
    <CTags.ContentWrapper>
      <CTags.FlexColContainer
        style={{
          // width: '38.625rem'
        }}
      >
        <img
          src={TechnologistEmoji}
          alt=""
          width={48}
          style={{
            display: 'block'
          }}
        />
        <CTags.Header>Terms and Conditions</CTags.Header>
        <CTags.Subtitle style={{ width: '34rem' }}>
          <Tags.Iframe src="/terms-and-conditions.html" title="terms and conditions" />
        </CTags.Subtitle>
        <CTags.NextBtn style={{ width: '85%' }} onClick={handleClick}>Accept & Continue</CTags.NextBtn>
      </CTags.FlexColContainer>
    </CTags.ContentWrapper>
  );
}
