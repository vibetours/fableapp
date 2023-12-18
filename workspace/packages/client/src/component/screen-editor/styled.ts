import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import styled, { keyframes } from 'styled-components';
import Slider from 'antd/lib/slider';
import TextArea from 'antd/lib/input/TextArea';
import { ColorPicker as AntColorPicker } from 'antd/lib';
import { InputNumber, Input, Switch } from 'antd';

export const EmbedFrame = styled.iframe`
  height: 100%;
  width: 100%;
  background: #fff;
  border: none;
  box-shadow: none;
  border-radius: 4px;
`;

export const EditPanelSec = styled.div`
  display: flex;
  padding: 0;
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
  padding: 0;
  border-radius: 8px;
  flex-direction: column;
`;

export const AnotCrtPanelSec = styled.div`
  display: flex;
  flex-direction: ${(p: AnotPanelSecOri) => (p.row ? 'row' : 'column')};
  align-items: ${(p: AnotPanelSecOri) => (p.row ? 'center' : 'unset')};
  justify-content: ${(p: AnotPanelSecOri) => (p.row ? 'space-between' : 'unset')};
  width: 100%;
  margin-bottom: 0.25rem;
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
  margin-bottom: 1rem;
`;

export const ActionMenuConBar = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 0.15rem 0.75rem;
  background: #f5f5f5;
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

export const CreateNewAnnotationBtn = styled.div`
  color: #9393F0;
  cursor: pointer;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  font-size: 11px;
  font-weight: 400;

  p {
    text-align: center;
  }

  img {
    transition: transform 0.2s ease-out;
    height: 57px !important;
    width: 57px !important;
  }

  &:hover {
    img {
      transform: translate(2px, 2px);
    }
  }
`;

export const AnnotationBtnCtn = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 8px;
`;

export const InputContainer = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const InfoText = styled.p`
  padding: 0 1rem;
  margin: 2px 0 0 1.5rem;
  line-height: 1.25rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: #333333;
  text-align: left;
  font-size: 12px;
`;

export const AnimatedInfoText = styled.p`
  padding: 0 1rem;
  margin: 0 0 0 1.5rem;
  line-height: 1.25rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: #333333;
  text-align: left;
  font-size: 12px;
  display: inline-block;
`;

export const AnnTimelineCon = styled.div`
  padding-top: 1rem;
  border-top: 1px solid #D9D9D9;
  margin-top: 1rem;
`;

export const VerticalBar = styled.div`
  height: 1.1rem;
  border-left: 1px solid #747474;
  position: absolute;
  left: 0.91rem;
  bottom: 0;
  transform: translateY(1.1rem);
`;

export const EditTabCon = styled.div`
  justify-content: center;
  display: flex;
  flex-direction: column;
  margin: 0 1rem 1rem 1rem;
`;

interface AnotPanelSecOri {
  row?: boolean;
}

export const ActionPanel = styled.div<{gutter: boolean}>`
  padding: ${props => (props.gutter ? '0.75rem 1.5rem 0.75rem' : '0.75rem 1rem 0.75rem')};
  border-bottom: 1px solid #dddddd;
  cursor: pointer;
`;

export const ActionPanelTitleCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0.65;
  font-size: 1rem;

  .ht-icn {
    font-size: 0.75rem;
    display: none;
  }

  &.selected {
    opacity: 1;
  }

  &:hover {
    opacity: 1;

    .ht-icn {
      display: unset;
    }
  }

  .title {
    font-weight: 600;
    display: flex;
    align-items: center;
  }
`;

export const ActionPaneBtn = styled(Button)`

  &.fullWidth {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid #E8E8E8;
    background: #FFF;
    width: 100%;
    height: 48px;
  }

  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
    background: transparent !important;
    transition: none !important;
  } 
`;

export const ActionPaneSelect = styled(Select)`
  background-color: white;
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  height: 100%;
  min-width: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  }
  
  .ant-select-clear {
    transform: translate(-100%, -100%);
  }
`;

export const ActionPanelAdditionalActionIconCon = styled.span`
  padding: 2px 4px;
  border-radius: 2px;
  &:hover {
    background: #E0E0E0;
    cursor: pointer;
  }

`;

export const ActionPanelPopOverCon = styled.div`
  .ant-popover-inner {
    padding: 4px !important;
    background: #f6f6f6 !important;
  }
`;

export const ActionBtnCon = styled.div`
  margin: 1rem auto;
  margin-bottom: 0rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

export const CTALinkInputCont = styled.div`
  display: flex;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
`;

export const ColorPicker = styled(AntColorPicker)`
  border: 1px solid #E8E8E8;
  background: white;
  min-width: 140px;
  border-radius: 8px;
  display: flex;
  justify-content: flex-start;
  height: 100%;
  font-weight: 400;
  .ant-color-picker-color-block{ 
    border-radius: 50% !important;
    position: absolute;
    right: 28px;
  }
  .ant-color-picker-color-block-inner,
  .ant-color-picker-color-block {
    width: 20px !important;
    height: 20px !important;
  }

  &:hover {
    border: 1px solid #747474 ;
  }
`;

export const InputText = styled(Input)`
  border-radius: 8px;
  border: 1px solid #E8E8E8;
  height: 100%;
  width: 140px;
  background: white;

  &:hover {
    background: white;
    border: 1px solid #747474 ;
  }
`;

export const InputNumberBorderRadius = styled(InputNumber)`
  width: 140px;
  height: 100%;
  border-radius: 8px;
  border: 1px solid #E8E8E8;

  .ant-input-number,
  .ant-input-number-wrapper, 
  .ant-input-number-input-wrap,
  .ant-input-number-group-addon,
  input {
    height: 100%;
    border: none;
  }

  .ant-input-number:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  }
`;

export const StyledSwitch = styled(Switch)`
  height: 20px;
  width: 32px;
 
  .ant-switch-handle {
    height: 16px ;
    width: 16px;
  }
 
  &:where(.css-dev-only-do-not-override-byeoj0).ant-switch.ant-switch-checked .ant-switch-handle {
    inset-inline-start: calc(100% - 18px);
  }
`;

export const ScreenResponsiveIpCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 1rem 0 1rem;
`;

export const AnnPositioningInput = styled.div<{
  fullWidth: number,
  panelWidth: number,
  panelHeight: number,
}>`
  position: relative;
  width: ${(props) => `${props.fullWidth}px`};
  height: ${(props) => `${props.fullWidth}px`};
  background-color: #fff;
  border: 1px solid #bdbdbd;
  border-radius: 4px;

  cursor: default;

  .ann-pos-panel {
    position: absolute;
    display: flex;
    justify-content: space-between;
  }

  .ann-pos-panel-left {
    flex-direction: column;
    top: ${props => `${props.panelWidth}px`};
    left: 0;
    width: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-right {
    flex-direction: column;
    top: ${props => `${props.panelWidth}px`};
    right: 0;
    width: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-top {
    top: 0;
    left: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-panel-bottom {
    bottom: 0;
    left: ${props => `${props.panelWidth}px`};
    height: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
  }

  .ann-pos-center {
    position: absolute;
    left: ${props => `${props.panelWidth}px`};
    top: ${props => `${props.panelWidth}px`};
    width: ${props => `${props.panelHeight}px`};
    height: ${props => `${props.panelHeight}px`};
    background-color: #6d6d6d;
    background: #fff;
    border: 1px solid #bdbdbd;
    border-radius: 4px;
  }
`;

export const AnnPositionInputBox = styled.div<{isSelected: boolean}>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  background-color: transparent;
  cursor: pointer;

  div {
    width: 50%;
    height: 50%;
    background-color: ${props => (props.isSelected ? '#160245' : '#bbb4fa')};
    border-radius: 2px;
  }

  &:hover {
    background-color: ${props => `${props.isSelected ? '#7567ff' : '#9f96fa'}`};

    div {
      background-color: ${props => `${props.isSelected ? '#160245' : 'black'}`};
    }
  }
`;

export const AnnotationLI = styled.div`
  position: relative;
  background: #F7F7F7;
  padding: 0.65rem 0 0.25rem;
  border-radius: 2px;
  display: flex;
  flex-direction: column;
  width: 90%;
  border-top: 1px solid #DDD;
  border-bottom: 1px solid #DDD;

  &:hover {
    cursor: pointer;
  }
`;

export const AnotCrtPanelSecLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;

`;

export const AnnDisplayText = styled.div`
  line-height: 1.25rem;
  color: #212121;
  display: flex;
  flex-direction: column;
  width: calc(100% - 2rem);
  margin-right: 10px;

  .steps {
    font-weight: 600;
    display: inline-block;
    font-size: 1.1rem;
  }

  .head {
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    text-overflow: ellipsis;
    font-size: 0.95rem;
  }
`;
