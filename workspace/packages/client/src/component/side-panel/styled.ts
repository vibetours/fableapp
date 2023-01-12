import styled from "styled-components";
import { Link } from "react-router-dom";

export const Con = styled.div`
  height: 100%;
  background-color: ${(props) => props.theme.colors.dark.idle.background};
  color: ${(props) => props.theme.colors.dark.idle.color};
  border-radius: 0 24px 24px 0;
  padding: 1.8rem 0;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
`;

export const ConLogo = styled.div`
  width: 100%;
  padding-left: 2rem;
`;

export const ConLogoImg = styled.img`
  height: 2.5rem;
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
  border-radius: 0 18px 18px 0;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease-out;
  position: relative;
  color: #fff;

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
  border-top: 0.2px solid rgba(255, 255, 255, 0.4);
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
