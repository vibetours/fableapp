import styled from 'styled-components';
import { CheckOutlined } from '@ant-design/icons';

export const Con = styled.div`
  width: fit-content;
  max-width: 22.25rem;
  height: fit-content;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: sticky;
  top: 5.4rem;
  z-index: -1;
`;

export const TitleCon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const Title = styled.h2`
  font-size: 1rem;
  font-weight: 600;
  color: #16023e;
`;

export const FableLogo = styled.img`
  aspect-ratio: 1/1;
  width: 2.75rem;
`;

export const Features = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style-type: none;
  font-size: 0.875rem;
  font-weight: 400;
  padding-left: 0;

  li {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
  }
`;

export const CheckOutlinedIcon = styled(CheckOutlined)`
  width: 1rem;
  height: 1rem;
  margin-top: 4px;
`;
