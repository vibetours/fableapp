import styled from "styled-components";

export const CardCon = styled.div`
  display: flex;
  margin: 15px 15px 15px;
  padding: 8px;
  flex-direction: column;
  background: #f5f5f5;
  border-radius: 4px;

  &:hover {
    box-shadow: 0px 0px 0px 2px #7566ff;
    cursor: pointer;
  }
`;

export const CardImageCon = styled.div`
  height: 160px;
  width: 250px;
  border-radius: 4px;
  background-size: cover;
`;

export const CardDescCon = styled.div`
  margin-top: 10px;
`;

export const TextMain = styled.div`
  font-weight: bold;
`;

export const TextLink = styled.a`
  color: #7566ff;
  font-size: 14px;
`;

export const TextSecondary = styled.div`
  color: gray;
  font-size: 12px;
`;

export const ActionBtnsCon = styled.div`
  justify-content: center;
  height: 160px;
  width: 250px;
  border-radius: 4px;
  position: absolute;
  display: flex;
  flex-direction: column;
  filter: blur(0px);
  z-index: 10;
  padding: 20px 10px;
`;
