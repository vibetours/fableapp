import styled from 'styled-components';

export const Con = styled.div`
  background-image: linear-gradient(315deg, #f6f6f6 0%, #e9e9e9 74%);
  inset: 0;
  position: absolute;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .animated {
    position: absolute;
    width: 100%;
    display: flex;
    justify-content: center;
  }
`;

export const FableLogoImg = styled.img`
  position: absolute;
  left: 2rem;
  top: 2rem;
`;

export const CompanyCarouselWrapper = styled.div`
  position: absolute;
  bottom: 2rem;
  z-index: 1;
`;

export const OnboardingCardCon = styled.div`
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
  border-radius: 26px;
  height: 480px;
  width: 360px;
  background-color: white;
  padding: 2rem;
  transform: scale(0.95);

  span.ant-checkbox {
    align-self: unset !important;
    transform: translateY(4px);
    margin-top: 0.75rem;
  }

  .ant-checkbox.ant-checkbox-checked > .ant-checkbox-inner {
    border-color: #747474;
    background-color: #747474;
  }

  .ant-checkbox > .ant-checkbox-inner {
    border-color: #747474;
    background-color: transparent;
  }
`;
