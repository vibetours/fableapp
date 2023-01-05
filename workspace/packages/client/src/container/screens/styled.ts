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
  height: 1023px;
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
`;

export const ScreenCardsCon = styled.div`
  margin-top: 1rem;
  display: flex;
  background: #fafafa;
  padding: 1rem;
`;

export const CardCon = styled.div`
  padding: 0.5rem;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  width: 240px;
  margin-right: 1rem;
`;

export const CardImg = styled.img`
  box-shadow: 0px 0px 2px 1px #ddd;
  border-radius: 4px;
`;
