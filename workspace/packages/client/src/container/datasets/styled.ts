import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const TopPanel = styled.div`
  margin: 1rem 0;
`;

export const DatasetsHeading = styled.h1`
  color: #16023E;
  font-size: ${(props) => props.theme.typography.size.heading};
  font-weight: bold;
`;

export const Text = styled.h4`
  color: #16023E;
  margin-top: 0px;
  font-style: italic;
`;

export const CardCon = styled(Link)`
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

export const Thumbnail = styled.div`
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

export const MetaDataCon = styled.div`
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

export const ActionBtnCon = styled.div`
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 0.5rem;
`;

export const CardCTA = styled.button`
  background: #fff;
  border: none;
  color: black;
  text-decoration: none;
  padding: 4px 11px;
  border-radius: 6px;
  box-shadow: rgb(22 2 69 / 25%) 0px 1px 1px, rgb(22 2 69 / 13%) 0px 0px 1px 1px;
  cursor: pointer;
  transition: box-shadow 0.3s ease-out;
  display: flex;
  align-items: center;

  &:hover {
    box-shadow: rgb(22 2 69 / 100%) 0px 1px 1px, rgb(22 2 69 / 100%) 0px 0px 1px 1px;
  }
`;

export const ErrorMsg = styled.p`
  font-size: 14px;
  margin: 0px;
  color : red;
`;

export const EmptyDatasetsCon = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.25rem;
  flex-direction: column;
`;
