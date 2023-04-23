import React from 'react-dom';
import * as CTags from '../../styled';
import * as Tags from './styled';
import TechnologistEmoji from '../../../../assets/onboarding/technologist.png';

export default function TermsAndConditions() {
  const handleClick = () => {
    window.location.replace('/screens');
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
