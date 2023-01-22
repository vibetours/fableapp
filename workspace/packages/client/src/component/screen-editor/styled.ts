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
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ddd;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
`;

export const EditPanelSec = styled.div`
  display: flex;
  padding: 1rem 0.75rem;
  flex-direction: column;
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

export const ImgUploadLabel = styled.label`
  border: 1px solid transparent;
  box-shadow: 0 2px #00000004;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  height: 32px;
  padding: 4px 15px;
  border-radius: 2px;
  color: #000000d9;
  border-color: #d9d9d9;
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

export const AnotCrtPanelCon = styled.div`
  display: flex;
  background: lightgray;
  flex-direction: column;
`;

export const AnotCrtPanelSec = styled.div`
  display: flex;
  flex-direction: ${(p: AnotPanelSecOri) => (p.row ? 'row' : 'column')};
  align-items: ${(p: AnotPanelSecOri) => (p.row ? 'center' : 'unset')};
  width: 100%;
  margin-bottom: 0.75rem;
`;

interface AnotPanelSecOri {
  row?: boolean;
}
