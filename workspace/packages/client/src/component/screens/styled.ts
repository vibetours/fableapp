import styled from "styled-components";
import { MoreOutlined } from "@ant-design/icons";
import { Collapse } from "antd";

interface Alignment {
  alignSelf?: 'start' | 'center' | "end";
}

export const FlexContainer = styled.div`
  display: flex;
  gap: 0.75rem;
`
export const CardContainer = styled.div`
  width: 70%;
  margin-bottom: 0.75rem;
`

export const ScreenContainer = styled.div`
  z-index: 10;
  display: flex;
  border: 0.5px solid #DDDDDD;
  border-radius: 10px;
  padding: 0.5rem;
  // width: 70%;
  background-color: white;
  // margin-bottom: 0.75rem;
`;

export const InfoContainer = styled.div`
  margin-left: 1rem;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
`;

export const Thumbnail = styled.div`
  border: 0.5px solid #DDDDDD;
  min-width: 76px;
  height: 76px; 
  border-radius: 4px;
`;

export const ScreenTitle = styled.div`
  font-weight: 600;
  font-size: 0.875rem;
  color: #16023E;
  line-height: 1.125rem;
`;

export const ScreensNumber = styled.div`
  font-weight: 500;
  font-size: 0.625rem;
  color: #16023E;
  line-height: 14px;
  justify-self: end;
  align-self: start;
  background-color: #FBF6FF;
  padding: 0.062rem 0.5rem 0.187rem 0.5rem;
  border-radius: 9999px;
  margin-right: 0.5rem;
`;

export const MenuIcon = styled(MoreOutlined)`
  cursor: pointer;
`

export const ScreenInfo = styled.div<Alignment>`
  font-weight: 400;
  font-size: 0.625rem;
  line-height: 0.812rem;
  color: #16023E;
  align-self: ${props => props.alignSelf}
`;

export const RightAlignContainer = styled.div`
  display: flex;
  align-items: center;
  justify-self: end;
  align-self: center;
`
export const CreatedByAvatar = styled.img`
  height: 1rem;
  width: 1rem;
  margin-left: 0.5rem;
`
// =====================================
// VERSION HISTORY CARD

export const CollapseContainer = styled(Collapse)`
  // display: "none",
  border: 0.5px solid #DDDDDD;
  border-radius: 0 0 10px 10px;
  padding-top: 10px;
  // margin-top: -10px;
  // transform: translateY(-10px);
  // width: 70%;
  background-color: #FBF6FF;
`

export const VHScreenContainer = styled.div`
  display: flex;
  &:not(:last-child){
    border-bottom: 1px solid white;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
`;

export const VHThumbnail = styled.div`
  border: 0.5px solid #DDDDDD;
  background-color: white;
  min-width: 74px;
  height: 58px; 
  border-radius: 4px;
`;

// =====================================
// OPTIONS MENU

export const OptionsMenuContainer = styled.div`
  border: 0.5px solid #DDDDDD;
  border-radius: 10px;
  align-self: start;
  padding: 0.75rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`

export const MenuItem = styled.div`
  font-weight: 500;
  font-size: 0.75rem;
  display: flex;
  gap: 0.8rem;
  align-items: center;
  line-height: 1.5rem;
`