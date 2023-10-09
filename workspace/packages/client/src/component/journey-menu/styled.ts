import { CreateJourneyPositioning } from '@fable/common/dist/types';
import { Button } from 'antd/lib';
import styled from 'styled-components';
import { getColorContrast } from '../../utils';

export interface DropdownConf {
    positioning: CreateJourneyPositioning;
  }

export const DropdownCon = styled.div`
    position: absolute; 
    bottom: 40px;
    right: ${(p: DropdownConf) => ((p.positioning === CreateJourneyPositioning.Right_Bottom) ? '20px' : '')};
    left: ${(p: DropdownConf) => ((p.positioning === CreateJourneyPositioning.Left_Bottom) ? '20px' : '')};
  `;

export const JourneyCon = styled.div`
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.20);
  padding: 24px 0;
  margin-bottom: 5px;
  width: 418px;
`;

interface FLowItemConf {
  isCurrentFlow: boolean
}

export const FLowItemCon = styled.div`
  cursor: pointer;
  display: flex;
  gap: 5px;
  align-items: center;
  margin: 0px;
  padding: 15px;
  position: relative;
  background-color:${(p: FLowItemConf) => (p.isCurrentFlow ? '#dfdee8' : 'inherit')};

  &:hover {
    background-color: #F6F5FF;
    border-radius: 5px;
  }
`;

export const FLowTitle = styled.p`
  margin: 0;
  margin-bottom: 24px;
  font-size: 18px;
  padding: 0px 16px;
`;

export const FlowHeader1 = styled.p`
  margin: 0;
  font-weight: 500;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
  margin-bottom: 4px;
`;

export const FlowHeader2 = styled.p`
  margin: 0;
  font-weight: 400;
  font-size: 14px;
  font-family: "IBM Plex Sans", sans-serif;
`;

export const IndexButton = styled(Button)`
  height: 36px;
  width:${(p: IndexBtnConf) => (p.applywidth === 'true' ? '36px !important' : 'auto')};
  background: ${(p: IndexBtnConf) => (`${p.color} !important`)};
  color: ${(p: IndexBtnConf) => (getColorContrast(p.color) === 'dark' ? '#fff' : '#000')};
  font-family: "IBM Plex Sans", sans-serif;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 2px 2px 0 rgba(72, 5, 255, 0.06);
  &:hover{
    color: ${(p: IndexBtnConf) => (getColorContrast(p.color) === 'dark' ? '#fff' : '#000')} !important;
  }
`;

interface IndexBtnConf {
  color: string;
  applywidth: 'true' | 'false';
}
