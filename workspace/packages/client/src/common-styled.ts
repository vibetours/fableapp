import styled from 'styled-components';
import Modal from 'antd/lib/modal';
import { AnnotationButtonSize, AnnotationButtonStyle } from '@fable/common/dist/types';
import { getColorContrast } from './utils';

export const ColCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
`;

export const RowCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
`;

export interface TxtProp {
  color?: string
}

export const Txt = styled.div`
  color: ${(props: TxtProp) => (props.color ? props.color : 'unset')};
  &.head {
    font-size: ${(props) => props.theme.typography.size.heading};
    font-weight: bold;
  }

  &.editable {
    cursor: text;
  }

    &.editable:hover {
      box-shadow: 0 0 0 1px blue;
    }

  &.subhead {
    opacity: 0.65;
    line-height: 1.1rem;
    margin-top: 0.25rem;
    white-space: pre-line;
  }

  &.subsubhead {
    opacity: 0.65;
    line-height: 0.85rem;
    font-size: 0.85rem;
  }

  &.title {
    font-size: ${(props) => props.theme.typography.size.heading3};
    font-weight: 600;
  }

  &.title2 {
    font-weight: 600;
  }

  &.subtitle {
    font-weight: 400;
    font-size: 0.75rem;
  }

  &.link {
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }

  &.faded {
    opacity: 0.65;
  }

  &.markeditable {
    cursor: text;
  }

  &.markeditable:hover {
    box-shadow: 0 0 0 1px black;
    background: #D0D0FF;
  }

  &.oneline {
    display: inline-block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.emph {
    font-weight: bold;
  }

  span.kb-key {
    background: lightgray;
    color: #000;
    padding: 0 4px;
    border-radius: 4px;
    font-style: italic;
  }
`;

export const BodyCon = styled.div`
  display: flex;
  flex-direction: column;

  &.centered {
    justify-content: center;
    align-items: center;
  }
`;

export const SidePanelCon = styled.aside`
  height: 100%;
  min-width: 260px;
  max-width: 260px;
  width: 260px;
`;

export const MainCon = styled.div`
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

export const HeaderCon = styled.div`
  width: 100%;
  height: 48px; 
  border-bottom: 1px solid #E0E0E0;
`;

export const PreviewAndActionCon = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  background: #F5F5F5;
`;

export const EmbedCon = styled.div`
  flex-grow: 1;
  background: #F5F5F5;
  margin: 1rem;
`;

export const EditPanelCon = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ddd;
  scrollbar-color: #7567FF #E5E7EB;
  scrollbar-width: thin;
  overflow-y: auto;

  &::-webkit-scrollbar-track {
    padding: 2px 0;
    background-color: #e5e7eb;
    border-radius: 10px;
    border: 1px solid #F3F4F6;
  }

  &::-webkit-scrollbar {
    margin: 4px 0;
    height: 4px;
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #646e82;
  }
`;

export const PopoverMenuItemDivider = styled.div<{ color?: string }>`
  padding: 0.5rem 0rem 0;
  margin: 0.5rem 0.5rem 0;
  border-top: ${props => `1px solid ${props.color || '#eaeaea'}`};
`;

export const PopoverMenuItem = styled.div<{ nonit?: boolean }>`
  cursor: ${props => (props.nonit ? 'default' : 'pointer')};
  padding: 0.25rem 0.75rem;
  border-radius: 2px;
  font-size: 0.85rem;
  &:hover {
    background: ${props => (props.nonit ? 'initial' : '#eaeaea')};
  }

  &.disabled {
    cursor: not-allowed;
    opacity: 0.55;
    pointer-events: none;
    &:hover {
      background: initial;
    }
  }
`;

export const Avatar = styled.img<{ sl?: boolean, glow?: boolean }>`
  width: ${props => (props.sl ? 1.75 : 1)}rem;
  height: ${props => (props.sl ? 1.75 : 1)}rem;
  border-radius: 50%;
  box-shadow: ${props => (props.glow ? '0 0 1px 1px white' : 'none')}
`;

export const BorderedModal = styled(Modal)`
    border-radius: 15px;
    border-top: double 4px transparent;
    background-image: linear-gradient(white, white), linear-gradient(to right,  #FF7450 0%, #FF7450 33.33%, #FEDF64 33.33%, #FEDF64 66.67%, #7567FF 66.67%, #7567FF 100%);
    background-clip: padding-box, border-box;

    .ant-modal-content {
      -webkit-box-shadow: none;
      -moz-box-shadow: none;
      -o-box-shadow: none;
      box-shadow: none;
      border-radius: 15px;
    }

    .modal-title {
      margin:  0 0 0.5rem 0;
      color: rgba(0, 0, 0, 0.88);
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .modal-content-cont {
      margin: 1.5rem 1rem 0 1rem;
    }

    .button-two-col-cont {
      display: flex;
      gap: 1rem;
      margin: 1.5rem 1rem 1.5rem 1rem;
    }

    &.apply-all{
      padding-bottom: 0px;
      
      p {
        font-family: "IBM Plex Sans", sans-serif;
        font-size: 16px;
        font-weight: 500;
      }
    }
`;

export const CTABtn = styled.button`
  font-size: 12px;
  font-weight: 500;
  font-family: "IBM Plex Sans", sans-serif;
  color: ${(p: CTABtnConf) => (getColorContrast(p.color) === 'dark' ? '#fff' : '#000')};
  background: ${(p: CTABtnConf) => (p.color)};
  border-radius: ${(p: CTABtnConf) => (p.borderRadius)}px;
  border: none;
  cursor: pointer;
  padding: ${(p: CTABtnConf) => {
    if (p.size === AnnotationButtonSize.Large) {
      return '12px 22px';
    } if (p.size === AnnotationButtonSize.Medium) {
      return '8px 18px';
    }
    return '4px 12px';
  }};
`;

export interface CTABtnConf {
  size: AnnotationButtonSize;
  color: string;
  borderRadius: number;
}
