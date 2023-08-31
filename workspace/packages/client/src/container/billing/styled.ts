import styled from 'styled-components';

export const Heading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const TabCon = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
  box-shadow: 2px 2px 1px 2px #918ac9;
  border-radius: 2px;

  .tab-item {
    padding: 8px 12px;
    border-radius: 4px;
    opacity: 0.8;
    transition: all 0.3s ease-out;

    :hover {
      opacity: 1;
    }
  }

  .active {
    background: #D0D0FF
  }
`;
