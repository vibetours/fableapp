import styled from 'styled-components';
import { Avatar } from 'antd';

export const CardCon = styled.div`
  display: flex;
  max-width: 400px;
  border-radius: 8px;
  border: 1px solid #E6E6E6;
  padding: 1rem 1.5rem;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
  align-items: center;  
  gap: 1rem;
  justify-content: space-between;
`;

export const CardTitle = styled.div`
  font-weight: 600;
  font-size: 1.125rem;
`;

export const CardIcon = styled(Avatar)`
  background-color: #FBECB2;
  color: black;
  font-size: 1.125rem;
  font-weight: 600;
`;
