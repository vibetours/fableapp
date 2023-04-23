import styled from 'styled-components';

export const RootLayoutCon = styled.div`
  padding-left: 4.375rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100vh;
`;

export const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 31.75rem;
  gap: 40px;
  align-items: flex-start;
`;

export const StepDotsWrapper = styled.div`
  display: flex;
  padding: 0.5rem 0;
  gap: 0.5rem;
  position: absolute;
  bottom: 2.25rem;
`;

export const NextBtn = styled.button`
  background-color: #7567FF;
  padding: 0.75rem 2.5rem;
  border: none;
  color: #FFF;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  border-radius: 24px;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  justify-content: center;
`;

export const Link = styled.a`
  text-decoration: none;
  color: #7567FF;
  font-weight: 600;
`;

export const Header = styled.h1`
  font-weight: 700;
  font-size: 3rem;
  line-height: 3.8rem;
  margin: 0;
  color: #16023E;
`;

export const Subtitle = styled.p`
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.625;
  margin: 0;
  color: #16023E;
`;

export const FlexColContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const SpanBlock = styled.span`
  display: block;
`;
