import { CreateJourneyPositioning } from '@fable/common/dist/types';
import { Button } from 'antd';
import styled from 'styled-components';
import { getColorContrast } from '../../utils';

export interface DropdownConf {
    positioning: CreateJourneyPositioning;
    top?: number;
    left?: number;
    transformTranslateX?: number;
  }

export const DropdownCon = styled.div`
  z-index: 9999;
  position: absolute; 
  left: ${(p: DropdownConf) => (`${p.left}px` || '20px')};
  transform: ${(p: DropdownConf) => (`translate(${p.transformTranslateX}%, 0%)`)};
  ${(p: DropdownConf) => ((p.top ? `top: ${p.top}px;` : 'bottom: 40px;'))};
`;

export const JourneyCon = styled.div<{maxW: string}>`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0) 0px 0px 0px 2px, rgba(0, 0, 0, 0.3) 0px 0px 0px 1000vw;
  padding: 24px 0;
  width: 340px;
  max-width: ${props => `${props.maxW}`};

  .superscript {
    font-size: 11px;
    opacity: 0.7;
    transform: translate(-2px, -4px);
    display: inline-block;
  }
`;

interface FLowItemConf {
  isCurrentFlow: boolean;
  disabled: boolean;
}

export const FLowItemCon = styled.div<FLowItemConf>`
  cursor: pointer;
  display: flex;
  gap: 5px;
  align-items: center;
  margin: 0px;
  padding: 15px;
  position: relative;
  opacity: ${props => (props.disabled ? 0.5 : 1)};
  background-color:${(p: FLowItemConf) => (p.isCurrentFlow ? '#dfdee8' : 'inherit')};
  
  &:hover {
    background-color: #F6F5FF;
    border-radius: 5px;
  }
`;

export const FLowTitle = styled.p`
  margin: 0;
  margin-bottom: 0.5rem;
  padding: 0px 16px;
  font-size: 1.25rem;
  font-weight: bold;
`;

export const FlowHeader1 = styled.div`
  margin: 0;
  font-weight: 600;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  word-break: break-all;
  line-height: 1rem;
  margin-bottom: 4px;
`;

export const FlowHeader2 = styled.p`
  margin: 0;
  font-weight: 400;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
  line-height: 1.2rem;
`;

export const IndexButton = styled(Button)<IndexBtnConf>`
  height: 46px;
  padding: 5px 10px;
  width: ${props => (props.applywidth === 'true' ? '46px !important' : 'auto')}; 
  background: ${props => `${props.color} !important`};
  color:  ${props => `${getColorContrast(props.color)} === 'dark' ? '#fff' : '#000'`};
  font-family: "IBM Plex Sans", sans-serif;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 2px 2px 0 rgba(72, 5, 255, 0.06);
  transition: all 0.3s;
  &:hover{
    color:  ${props => `${getColorContrast(props.color) === 'dark' ? '#fff' : '#000'} !important`};
  }
  transform: ${props => `scale(${props.scalefactor})`};
  transform-origin: ${props => (props.positioning === CreateJourneyPositioning.Left_Bottom
    ? 'bottom left' : 'bottom right')};
`;

interface IndexBtnConf {
  color: string;
  applywidth: 'true' | 'false';
  scalefactor: number;
  positioning: CreateJourneyPositioning;
}

export const IndexButtonContent = styled.div`
  display: flex;
  flex-direction: column;
  text-align: start;
  margin-left: 9px;
`;
