import styled from 'styled-components';

export const Con = styled.div`
  display: flex;
  padding: 1rem;
  gap: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;
  margin-bottom: 1rem;

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
  width: 100%;
`;

export const InfoSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const Tag = styled.span`
  color: gray;
  font-size: 0.85rem;
  border: 1px solid lightgray;
  padding: 0.2rem;
  border-radius: 8px;
`;

export const L1 = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header {
    font-size: 1.15rem;
    font-weight: 600;
  }

  .mini {
    font-size: 0.8rem;
    font-weight: 400;
  }
`;

export const L2 = styled.div`
  font-size: 0.9rem;
  font-weight: 400;

  ul {
    padding-inline-start: 1rem;
  }
`;
