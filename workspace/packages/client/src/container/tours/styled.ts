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
  border-radius: 2px;
  width: 55%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  color: #16023e;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  text-decoration: none;

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

export const ToursHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const LaneGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

export const Icon = styled.img`
  height: 1rem;
  width: 1rem
`;
