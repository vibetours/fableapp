import styled, { keyframes } from 'styled-components';
import Slider from 'antd/lib/slider';
import TextArea from 'antd/lib/input/TextArea';
import Button from 'antd/lib/button';

// export const Con = styled.div`
//   height: 100%;
//   width: 100%;
//   display: flex;
//   box-shadow: 0 0 3px 1px #ddd;
//   background: #fff;
//   border-radius: 20px;
// `;

// export const EmbedCon = styled.div`
//   width: 77%;
//   background: #fcfcfc;
//   border-radius: 20px;
//   padding: 1rem;
// `;

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

export const EditPanelSec = styled.div`
  display: flex;
  padding: 1rem 0.75rem;
  flex-direction: column;
`;

export const EditCtrlCon = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.5rem;
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
  padding: 0.75rem;
  border-radius: 8px;
  flex-direction: column;
`;

export const AnotCrtPanelSec = styled.div`
  display: flex;
  flex-direction: ${(p: AnotPanelSecOri) => (p.row ? 'row' : 'column')};
  align-items: ${(p: AnotPanelSecOri) => (p.row ? 'center' : 'unset')};
  justify-content: ${(p: AnotPanelSecOri) => (p.row ? 'space-between' : 'unset')};
  width: 100%;
  margin-bottom: 0.75rem;
`;

export const AnotCrtPanelSecLabel = styled.div`
  padding: 0.8rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;

  & > div:first-child {
    display: flex;
    align-items: center;
    flex: 1;
    span {
      widht: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: #FF7450;
      margin-right: 0.6rem;
    }
  }
`;

export const AABtnCtrlLine = styled.div`
 display: flex;
 flex-direction: column;
 margin-bottom: 0.15rem;
 margin-top: 0.15rem;
 padding: 0.15rem;
 border-radius: 4px;


 .a-head {
  display: flex;
  align-items: center;
  justify-content: space-between ;
 }

 .n-vis {
   visibility: hidden;
 }

 .n-details {
  padding: 0.15rem;
  margin: 0.15rem;
 }

 &:hover {
  .n-vis {
    visibility: visible;
  }
 }

 &.sel {
  /* background: #f5f5f5; */
 }
`;

export const ActionMenuCon = styled.div`
  padding: 0.85rem 0.35rem;
  margin: 0.25rem;
`;

export const ActionMenuConBar = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.15rem 0.75rem;
  background: #eeeeee;
  border-radius: 8px;
`;

export const AnnotationLI = styled.div`
  margin: 0.25rem;
  background: #F9F9F9;
  border-radius: 10px;
  color: white;
  display: flex;
  flex-direction: column;
  color: #16023E;

  &:hover {
    cursor: pointer;
  }
`;

export const AnnotationHotspotSelector = styled.div`
  max-width: 400px;
  margin: 0.25rem 0rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 8px;

  &:hover {
    cursor: pointer;
    box-shadow:  0 0 0 1px #7666ff;
  }
`;

export const ButtonSecCon = styled.div`
  display: flex;
  & > *:not(:last-child) {
    margin-right: 0.5rem;
  }
`;

interface AnotPanelSecOri {
  row?: boolean;
}
