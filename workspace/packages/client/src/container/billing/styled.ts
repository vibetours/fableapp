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
  margin-bottom: 1rem;
  cursor: pointer;
  box-shadow: 2px 2px 1px 2px #918ac9;
  border-radius: 2px;

  .tab-item {
    padding: 0.5rem 2rem;
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

export const PriceCon = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4rem;
`;

export const PlanPrice = styled.div`
  font-weight: 600;
  font-size: 4rem;
  display: flex;
  align-items: flex-end;
  gap: 1rem;
`;

export const FeatTitle = styled.div`
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

export const FeatList = styled.ul`
  list-style-type: none;
  padding: 0;

  & > li:not(:last-child) {
    margin-bottom: 0.4rem;
  }
`;

export const FeatCon = styled.div`
  margin-top: 1rem;
  filter: saturate(0.5);
  opacity: 0.8;
`;
