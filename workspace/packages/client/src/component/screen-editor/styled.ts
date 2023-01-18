import styled from 'styled-components';
import Slider from 'antd/lib/slider';
import TextArea from 'antd/lib/input/TextArea';

export const Con = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  box-shadow: 0 0 3px 1px #ddd;
  background: #fff;
  border-radius: 20px;
`;

export const EmbedCon = styled.div`
  height: 100%;
  width: 77%;
  background: #fcfcfc;
  border-radius: 20px;
  padding: 1rem;
`;

export const EmbedFrame = styled.iframe`
   {
    height: 100%;
    width: 100%;
    background: #fff;
    border: none;
    box-shadow: none;
    border-radius: 20px;
  }
`;

export const EditPanelCon = styled.div`
  height: 100%;
  width: 23%;
  min-width: 320px;
  display: flex;
  background: #fff;
  border-left: 1px solid #ddd;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
`;

export const EditPanelSec = styled.div`
  display: flex;
  padding: 1rem 0.75rem;
  flex-direction: column;
  width: 100%;
`;

export const EditCtrlCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

export const EditCtrlLabel = styled.div``;

export const EditCtrlLI = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CtrlSlider = styled(Slider)`
  display: block;
  width: 9rem;
`;

export const CtrlTxtEditBox = styled(TextArea)`
  border-radius: 8px;
  border: 2px solid #ddd;
  padding: 0.875rem 1rem;
  font-size: 1rem;
`;

export const EditLICon = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export const EditLIPCon = styled.div`
  background: #d0d0ff;
  padding: 0.25rem 1rem;
  border-radius: 10px;
  margin: 0.25rem 1rem;
  &:hover {
    cursor: pointer;
    box-shadow: 0 0 0 1px #7567ff;
  }
`;

export const ListActionBtn = styled.span`
  color: #16023e;

  &:hover {
    text-decoration: underline;
  }
`;
