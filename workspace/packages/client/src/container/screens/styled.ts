import styled from "styled-components";

export const Con = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
`;

export const SidePanelCon = styled.div`
  height: 100%;
  width: 30%;
  max-width: 285px;
  min-width: 230px;
`;

export const MainCon = styled.div`
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

export const HeaderCon = styled.div`
  width: 100%;
  height: 75px;
`;

export const BodyCon = styled.div`
  width: 100%;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;

  &.centered {
    justify-content: center;
    align-items: center;
  }
`;

export const NoScreenMsgCon = styled.div``;

export const TxtCon = styled.div`
  display: flex;
  flex-direction: column;
`;

export const Txt = styled.div`
  &.head {
    font-size: ${(props) => props.theme.typography.size.heading};
    font-weight: bold;
  }

  &.subhead {
    opacity: 0.65;
    line-height: 1.05rem;
    margin-top: 0.25rem;
  }

  &.title {
    font-size: ${(props) => props.theme.typography.size.heading3};
    font-weight: 600;
  }

  &.link {
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }

  &.faded {
    opacity: 0.65;
  }
`;

export const ScreenCardsCon = styled.div`
  margin-top: 1rem;
  display: flex;
  background: #fafafa;
  padding: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

export const CardCon = styled.div`
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

  &.multi {
    margin-right: 2rem;
    margin-bottom: 2rem;
    box-shadow: 6px 6px 0px 0px #ffffff, 6px 6px 0px 1px #dddddd, 12px 12px 0px 0px #fff, 12px 12px 0px 1px #dddddd;

    &:hover {
      box-shadow: 4px 4px 0px 0px #ffffff, 4px 4px 0px 1px ${(props) => props.theme.colors.light.selection.background},
        8px 8px 0px 0px #fff, 8px 8px 0px 1px ${(props) => props.theme.colors.light.selection.background};
    }
  }

  &:hover {
    border: 1px solid ${(props) => props.theme.colors.light.selection.background};
    cursor: pointer;
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
