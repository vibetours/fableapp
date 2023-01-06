import styled from "styled-components";

export const Con = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  height: 100%;
`;

export const TopCon = styled.div`
  width: 100%;
`;

export const BodyCon = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
`;

export const LeftCon = styled.div`
  min-width: 180px;
  height: 100%;
`;

export const MainCon = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const Title1 = styled.div`
  font-weight: bold;
  font-size: 18px;
  box-shadow: 0px 1px 0px 0px #d5d5ff;
`;

export const ProjectCardCon = styled.div`
  display: flex;
  flex-direction: row;
`;

export const EditingStatus = styled.div`
  background: #ffe26e;
  justify-content: center;
  display: flex;
`;

export const ClickableTxt = styled.div`
  &:hover {
    cursor: pointer;
  }
`;

// ****************************************************
// PROJECT SCREENS
// ****************************************************
export const ProjectTitle = styled.div`
  font-weight: bold;
  font-size: 16px;
  height: 20px;
  color: #222222;
  margin-bottom: 1rem;
`;

export const ProjectScreensContainer = styled.div`
  padding: 1.2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
`;