import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const NoScreenMsgCon = styled.div``;

export const TxtCon = styled.div`
  display: flex;
  flex-direction: column;
`;

export const ScreenCardsCon = styled.div`
  margin-top: 1rem;
  display: flex;
  background: #fafafa;
  padding: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

export const CardCon = styled(Link)`
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  width: 255px;
  margin-right: 1rem;
  margin-bottom: 1rem;
  transition: box-shadow 0.3s ease, border-color 0.3s ease;
  color: #16023e;

  &.multi {
    margin-right: 2rem;
    margin-bottom: 2rem;
    box-shadow: 6px 6px 0 0 #ffffff, 6px 6px 0 1px #dddddd, 12px 12px 0 0 #fff, 12px 12px 0 1px #dddddd;

    &:hover {
      box-shadow: 4px 4px 0 0 #ffffff, 4px 4px 0 1px ${(props) => props.theme.colors.light.selection.background},
        8px 8px 0px 0px #fff, 8px 8px 0px 1px ${(props) => props.theme.colors.light.selection.background};
    }
  }

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
    text-decoration: none;
    color: #16023e;
  }
`;

export const CardImg = styled.img`
  box-shadow: 0px 0px 2px 1px #ddd;
  border-radius: 4px;
  height: 144px;
  object-fit: cover;
`;

export const CardFlexColCon = styled.div`
  display: flex;
  flex-direction: column;
`;

export const CardFlexRowCon = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const CardIconLg = styled.img`
  height: 24px;
  width: 24px;
`;

export const CardIconMd = styled.img`
  height: 12px;
  width: 12px;
  margin-right: 0.15rem;
`;

export const CardIconSm = styled.img`
  height: 8px;
  width: 8px;
  margin-right: 0.35rem;
`;
