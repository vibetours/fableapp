import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Con = styled.div`
  height: 100%;
  background-color: #f5f5f5;
  color: #000;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
`;

export const ConLogo = styled.div`
  padding-left: 2rem;
`;

export const ConNav = styled.div`
  flex: 1;
  margin-top: 2rem;

  & > *:not(:last-child) {
    margin-bottom: 0.2rem;
  }
`;

export const ConNavBtn = styled(Link)`
  padding: 0.6rem 2rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease-out;
  position: relative;
  color: #000;
  font-weight: 500;
  text-decoration: none;

  &:hover,
  &.selected {
    background-color: ${(props) => props.theme.colors.dark.selection.background};
    color: ${(props) => props.theme.colors.dark.selection.color};
    text-decoration: none;
  }

  p {
    margin: 0 0.8rem;
  }

  svg {
    font-size: 1.2rem;
  }
`;

export const Footer = styled.div`
  border-top: 0.2px solid #dddddd;
  padding: 1.6rem 0 0 2rem;
  color: white;

  & > *:not(:last-child) {
    margin-bottom: 0.6rem;
  }
`;

export const FooterItem = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;

  p {
    margin: 0 0.8rem;
  }
`;

export const FooterItemProfileIcon = styled.img`
  width: 1.1rem;
  border-radius: 50%;
`;
