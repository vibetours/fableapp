import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const TopPanel = styled.div`
  margin: 1rem;
`;

export const BottomPanel = styled.div`
  flex-grow: 1;
  margin: 1rem;
`;

export const TourCardCon = styled(Link)`
  border: 1px solid #dddddd;
  border-radius: 4px;
  width: 55%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  color: #16023e;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
`;

export const TourCardLane = styled.div`
  min-width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
`;
