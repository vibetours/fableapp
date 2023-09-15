import styled from 'styled-components';

export const CardCon = styled.div`
  display: flex;
  justify-content: space-between;
  border-radius: 8px;
  border: 1px solid #E6E6E6;
  padding: 1rem 1.5rem;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
  align-items: center;
`;

export const Btn = styled.button`
  border-radius: 24px;
  background-color: #E6E6E6;
  display: flex;
  align-items: center;
  border: none;
  padding: 0.625rem 1rem;
  font: inherit;
  font-weight: 600;
  color: #555555;
  justify-content: space-between;
  gap: 0.25rem;
  line-height: 24px;
  min-width: 115px;
  cursor: pointer;
`;

export const CardTitle = styled.div`
  font-weight: 600;
  font-size: 1.125rem;
`;
