import styled from 'styled-components';
import Button from 'antd/lib/button';
import Select from 'antd/lib/select';
import Slider from 'antd/lib/slider';
import TextArea from 'antd/lib/input/TextArea';
import { HoveredSection } from './item';

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
  padding: 1rem 0.75rem 1rem 0.25rem;
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

export const CreateCoverAnnotationBtn = styled.div`
  margin: 0.5rem 1rem;
  background: #f7f7f7;
  border-radius: 2px;
  color: #16023E;
  padding: 0.8rem 1rem;
  text-align: center;
  cursor: pointer;

  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
    transition: none !important;
  }
`;

export const InputContainer = styled.div`
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  width: 100px;
  padding: 0.2rem 0.4rem;

  &:hover {
    box-shadow: 0 0 0 1px #d0d0ff !important;
  }
`;

type ColorCircleProps = {
  color: string;
}

export const InputColorCircle = styled.div`
  height: 18px;
  width: 18px;
  border-radius: 18rem;
  background-color: ${(p: ColorCircleProps) => p.color};
`;

export const InfoText = styled.p`
  padding: 0;
  margin: 0;
  line-height: 1.25rem;
  font-size: 0.875rem;
  font-weight: 400;
  color: #333333;
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
  margin-bottom: 1rem;
`;

interface AnotPanelSecOri {
  row?: boolean;
}

export const ActionPanel = styled.div<{gutter: boolean}>`
  padding: ${props => (props.gutter ? '0.75rem 1.5rem 0.75rem' : '0.75rem 1rem 0.75rem')};
  border-bottom: 1px solid #dddddd;
  cursor: default;
`;

export const ActionPanelTitleCon = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0.65;
  cursor: pointer;

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
    font-weight: 500;
  }
`;

export const ActionPaneBtn = styled(Button)`
  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
    background: transparent !important;
    transition: none !important;
  } 
`;

export const ActionPaneSelect = styled(Select)`
  &:hover {
    box-shadow: 0 0 0 1px #747474 !important;
  } 
`;

interface HorizontalBarProps {
  isAnnotationDragged: boolean;
  hoveredSection: HoveredSection;
}

export const AnnotationItemCon = styled.div<{ isItemExpanded: boolean }>`
  display: flex; 
  align-items: ${props => (props.isItemExpanded ? 'baseline' : 'center')}; 
  gap: 0.25rem;
`;

export const PopoverMenuItemsCon = styled.div`
  border-top: 1px solid #ddd;
  padding: 0.5rem 0rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const AnnotationLI = styled.div`
  position: relative;
  background: #F7F7F7;
  padding: 0.65rem 0 0.25rem;
  border-radius: 2px;
  border: 1px solid #DDDDDD;
  display: flex;
  flex-direction: column;
  width: 90%;
  flex-grow: 1;

  &:hover {
    cursor: pointer;
  }
`;

export const AnotCrtPanelSecLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;

  & > div:first-child {
    display: flex;
    align-items: center;
    flex: 1;
    span {
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: #FF7450;
      margin-right: 0.6rem;
    }
  }
`;

export const AnnDisplayText = styled.div`
  line-height: 1.25rem;
  font-weight: 600;
  color: #212121;
  display: inline-block;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 10px;
`;

export const BottomInvisibleDiv = styled.div`
  position: absolute;
  bottom: 0px;
  left: -10px;
  width: 100%;
  height: 50%;
  opacity: 0.3;
`;

export const TopInvisibleDiv = styled.div`
  position: absolute;
  top: 0px;
  left: -10px;
  width: 100%;
  height: 50%;
  opacity: 0.3;
`;

export const BottomHorizontalBar = styled.div`
  width: 100%;
  height: 1px;
  background-color: #7567FF;
  position: absolute;
  bottom: 0px;
  border: 2px solid #7567FF;
  border-radius: 4px;
  width: 105%;
  transform: translate(-2%, 0.55rem);
  display: ${
  ({
    isAnnotationDragged,
    hoveredSection
  }: HorizontalBarProps) => (isAnnotationDragged && hoveredSection === HoveredSection.Bottom ? 'block' : 'none')
};
`;

export const TopHorizontalBar = styled.div`
  height: 1px;
  background-color: #7567FF;
  position: absolute;
  top: 0px;
  border: 2px solid #7567FF;
  border-radius: 4px;
  width: 106%;
  transform: translate(-2%, -0.55rem);
  display: ${
  ({
    isAnnotationDragged,
    hoveredSection
  }: HorizontalBarProps) => (isAnnotationDragged && hoveredSection === HoveredSection.Top ? 'block' : 'none')
};
`;

interface ScreenThumbnailProps {
  isLastScreen: boolean;
}

export const Con = styled.div`
  display: flex;
  gap: 0.8rem;
  position: relative;
  padding-bottom: 1.1rem;
  padding-top: 1.1rem;
`;

export const ScreenThumbnail = styled.img`
  border:  1px solid #747474;
  border-radius: 2px;
  cursor: pointer;
  height: 48px;
  width: 85px;
  object-fit: contain;
`;

export const TextCon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: baseline;
  gap: 0.5rem;
  justify-content: space-between;
  flex-grow: 1;
  overflow: hidden;
`;

export const DisplayName = styled.div`
  font-size: 1rem;
  line-height: 1rem;
  font-weight: 400;
  color: #16023E;
  margin: 0;
  overflow-x: hidden;
  white-space: nowrap;
  text-overflow: clip;
`;

export const DisplayableTime = styled.h5`
  font-weight: 400;
  font-size: 0.75rem;
  line-height: 1rem;
  color: #16023E;
  margin: 0;
`;

export const ScreenVerticalBar = styled.div`
  height: 1.1rem;  
  border-left: 1px solid #747474;
  position: absolute;
  left: 1rem;
  ${(props: ScreenThumbnailProps) => (props.isLastScreen ? 'top: 0;' : 'bottom: 0;')};
`;

export const FlexColCon = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-grow: 1;
  flex-shrink: 0;
  justify-content: end;
`;

export const DisplayPicture = styled.img`
  border-radius: 50%;
`;
