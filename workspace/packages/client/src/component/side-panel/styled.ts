import styled, { keyframes } from 'styled-components';
import { Link } from 'react-router-dom';
import { CloseOutlined } from '@ant-design/icons';

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
  display: flex;
  flex-direction: column;

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

  p {
    margin: 0 0.8rem;
  }
`;

export const FooterItemProfileIcon = styled.img`
  width: 1.1rem;
  border-radius: 50%;
`;

// ~~~~~~~~~~~~~~~~~~~~~ USER GUIDE PROGRESS ~~~~~~~~~~~~~~~~~~~~~

export const UserGuideProgressCon = styled.div<{selected: boolean}>`
  margin-top: auto;
  display: flex;
  padding: 1rem;
  gap: 1rem;
  justify-content: center;
  background-color: ${(props) => (props.selected ? 'lightgray' : '')};
  transition: background-color 0.2s ease-in;
  cursor: pointer;

  &:hover {
    background-color: lightgray;
  }

`;

// ~~~~~~~~~~~~~~~~~~~~~ USER GUIDE DETAILS ~~~~~~~~~~~~~~~~~~~~~

const slideIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

export const UserGuideDetailsCon = styled.div`  
  position: absolute;
  height: calc(100% - 50px - 2rem);
  left: 260px;
  background-color: #fff;
  z-index: 1;
  padding: 1rem 2rem;
  overflow-y: auto;
  border: 1px solid lightgray;
  flex-direction: column;
  box-shadow: rgba(0, 0, 0, 0.06) 1px 0px 2px;
  border-right: 1px solid rgb(224, 220, 229);

  animation: ${slideIn} 0.2s ease-out;
`;

export const UserGuideCard = styled.div`
  border: 1px solid lightgray;
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  min-width: 320px;
`;

export const StyledCloseOutlined = styled(CloseOutlined)`
  cursor: pointer;
  position: absolute;
  right: 20px;
  top: 20px;
`;

export const SectionHeading = styled.div`
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: 24px;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
`;

// ~~~~~~~~~~~~~~~~~~~~~ INTRO FABLE GUIDES ~~~~~~~~~~~~~~~~~~~~~

export const IntroFableGuidesCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: auto;
`;

export const FlexRow = styled.div`
  display: flex;
  gap: 1rem;
`;

export const GridCard = styled.div`
  padding: 1rem;
  border: 1px solid gray;
  flex: 1;
  border-radius: 4px;
`;
