import styled from 'styled-components';
import { Link } from 'react-router-dom';

// ~~~~~~~~~~~~~~~~~~~~~~ TOUR CARD ~~~~~~~~~~~~~~~~~~~~~~

export const TourCardCon = styled(Link)`
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
`;

export const DisplayName = styled.h3`
  margin: 0;
  padding: 0;
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 1rem;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
`;

export const Divider = styled.div`
  background: #DDD;
  height: 80%;
  width: 0.0625rem;
  height: 0.6875rem;
`;

export const AvatarCon = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3125rem;
`;

export const TourThumbnail = styled.div`
  display: none;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: 0.25rem;
  border: 0.5px solid #DDD;
  background: #D0D0FF;
`;

export const CardDataCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  flex: 1 0 0;
`;

export const TourMetaDataCon = styled.div`
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 11px;
  font-style: normal;
  font-weight: 300;
  line-height: normal;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const TourActionBtnCon = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
`;

// ~~~~~~~~~~~~~~~~~~~~~~ TOUR CARD ~~~~~~~~~~~~~~~~~~~~~~

// ~~~~~~~~~~~~~~~~~~~~~~ EMPTY STATE ~~~~~~~~~~~~~~~~~~~~~~

export const EmptyToursContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 40rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.12rem;
`;

export const HeaderMsgCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  h1 {
    color: #222;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 1.25rem;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
    margin: 0;
    padding: 0;
  }

  p {
    color: #16023E;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.625rem; /* 185.714% */
    margin: 0;
    padding: 0;
  }
`;

export const CardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

export const EmptyStateCardCon = styled.div`
  display: flex;
  padding: 1rem 1.5rem;
  gap: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #E6E6E6;
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.05);
`;

export const CardIdx = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2.125rem;
  height: 2.125rem;
  border-radius: 100%;
  background-color: #F6F5FF;
  font-family: IBM Plex Sans;
  font-size: 1.125rem;
  font-style: normal;
  font-weight: 600;
  line-height: 1.375rem; /* 122.222% */
`;

export const CardMsgCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;

  h2 {
    font-family: IBM Plex Sans;
    font-size: 1.125rem;
    font-style: normal;
    font-weight: 600;
    line-height: 1.375rem; /* 122.222% */
    margin: 0;
    padding: 0;
  }

  p {
    color: #595959;
    font-family: IBM Plex Sans;
    font-size: 0.75rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.125rem; /* 150% */
    margin: 0;
    padding: 0;
  }
`;

export const CardImg = styled.img`
  max-height: 3.9rem;
  max-width: 4.8rem;
  filter: drop-shadow(0px 4.4px 6.6px rgba(0, 0, 0, 0.25));
  align-self: center;
`;
