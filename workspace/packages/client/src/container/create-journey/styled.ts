import { Button } from 'antd';
import styled from 'styled-components';
import Select from 'antd/lib/select';

export const CreateJourneyCon = styled.div`
    width: 360px;
    position: fixed;
    top: 0;
    left: 0;
    height: 90vh;
    background-color: white;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-shadow: 6px 0px 24px 0px rgba(0, 0, 0, 0.06);
`;

export const EditorCon = styled.div`
    overflow: scroll;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 2rem;
    padding-top: 0.4rem;
`;

export const FieldOuterCon = styled.div`
    width: 100%;
`;

export const FieldCon = styled.div`
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #DDD;
    background: #FBFBFB;
`;

export const FieldInputCon = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 8px;
`;

export const FieldName = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;

    p {
        color: #212121;
        font-weight: 600;
        font-size: 1.1rem;
        padding: 0;
        margin: 0;
    }
`;

export const JourneyInnerCon = styled.div`
    width: 100%;
`;

export const JourneyInputCon = styled.div`
    display: flex;
    justify-content: space-around;
    gap: 10px;
`;

export const FlowCon = styled.div`
    display: flex;
    align-items: center;
    flex-direction: column;
`;

export interface OutlineButtonProp {
  color?: string
}

export const OutlineButton = styled(Button)`
    padding-block: 0.75rem;
    height: fit-content;
    border-radius: 8px;
    color: ${(props: OutlineButtonProp) => (props.color ? props.color : '#7567FF')};
    border-color: ${(props: OutlineButtonProp) => (props.color ? props.color : '#7567FF')};
    width: 100%;

    &:hover {
      color: ${(props: OutlineButtonProp) => (props.color ? `${props.color} !important` : '#7567FF !important')};
      border-color: ${(props: OutlineButtonProp) => (props.color ? `${props.color} !important` : '#7567FF !important')};  
    }
`;

export const HeaderTitle = styled.p`
    font-size: 1.25rem;
    color: #222;
    font-weight: 700;
    padding-left: 16px;
    text-align: center;
    padding: 0;
    margin: 1rem 0 0 0;
    color: #222;
`;

export const Error = styled.p`
    font-size: 1rem;
    text-align: center;
    color: red;
`;

export const PosRelCon = styled.div`
  position: relative;
`;

export const FileInputCon = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const FlowSelect = styled(Select)`
  .ant-select-selector{
    border: 1px solid #ddd !important;
    border-radius: 8px !important;
  }
`;

export const CTAStyleSelect = styled(Select)`
  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  } 
`;

export const CTAInputCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
`;

export const Header = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export const CloseIcon = styled.img`
  height: 2rem;
  width: 2rem;
  cursor: pointer;
  background: #ffffffc4;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease-out;

  &:hover {
    background: #ffffff;
  }
`;

export const FableLogo = styled.img`
  width: 90px;
`;

export const NoJourneyCon = styled.div`
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
`;

export const JourneyConfigCon = styled.div`
  width: 90%;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--Outline-1, #DDD);
`;

export const CTAText = styled.p`
  color: #16023E;
  font-family: IBM Plex Sans;
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
`;
