import styled, { keyframes, css, SimpleInterpolation } from 'styled-components';
import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationButtonLayoutType,
  AnnotationFontSize
} from '@fable/common/dist/types';
import { Rect } from '../base/hightligher-base';
import { generateShadeColor } from './utils';

export const BubbleCon = styled.div`
  position: absolute;
  background: #FF7450;
  color: #fff;
  height: 10px;
  width: 10px;
  border-radius: 20px;
  padding: 0.5rem;
  justify-items: center;
  align-items: center;
`;

export const AnContent = styled.div`
  font-size: 1.1rem;
  position: absolute;
  background: #fff;
  border-radius: 4px;
  padding: 0;
  margin: 0;
  justify-items: center;
  align-items: center;
`;

const getAnnotationPadding = (annotationPadding: string): string => {
  const formatRegex = /^\s*(\d+)\s*(\d*)\s*$/;
  const formatedPadding = annotationPadding.match(formatRegex);
  if (!formatedPadding) {
    return '14px 14px';
  }

  const verticalPadding = parseInt(formatedPadding[1], 10);
  const horizontalPadding = parseInt(formatedPadding[2], 10);
  if (Number.isNaN(horizontalPadding)) {
    return `${verticalPadding}px ${verticalPadding}px`;
  }

  if (Number.isNaN(verticalPadding)) {
    return '14px 14px';
  }

  return `${verticalPadding}px ${horizontalPadding}px`;
};

const getVerticalPadding = (annotationPadding: string) : string => {
  const formatedPadding = getAnnotationPadding(annotationPadding);
  const verticalPadding = formatedPadding.split(/\s/)[0];
  return verticalPadding;
};

interface AnInnerConProps {
  anPadding: string;
}

export const AnInnerContainer = styled.div`
  display:flex;
  flex-direction:column;
  width: 100%;
  padding: ${(props: AnInnerConProps) => `${getAnnotationPadding(props.anPadding)}`};
`;

interface AnTextContentProps {
  fontFamily: string | null;
  fontColor: string | null;
  borderRadius: number;
}

export const AnTextContent = styled.div`
  font-weight: normal !important;

  p {
    margin: 0;
    font-weight: normal !important;
  }
  p img {
    margin-top: 0.2em;
    border-radius: ${(props: AnTextContentProps) => `${props.borderRadius}px`};
  }

  p {
    font-size: ${AnnotationFontSize.medium}px;
    font-family: ${(p: AnTextContentProps) => p.fontFamily || 'inherit'};
    color: ${(p: AnTextContentProps) => `${p.fontColor}`};
  }
`;

interface ButtonConProps {
  justifyContent: string;
  borderTopColor: string;
  btnLength: number;
  flexDirection: 'row' | 'column';
  anPadding: string;
  bg: string;
}

export const ButtonCon = styled.div`
  position: relative;
  display: flex;
  justify-content: ${(props: ButtonConProps) => props.justifyContent};
  align-items: center;
  margin-top: ${(props: ButtonConProps) => `calc(0.25rem + ${getVerticalPadding(props.anPadding)})`};
  padding-top: 1rem;
  border-top: 1px solid ${(props: ButtonConProps) => props.borderTopColor};
  row-gap: 0.5rem;
  flex-direction: ${(props: ButtonConProps) => props.flexDirection};

  ${(props: ButtonConProps) => (
    props.btnLength !== 2 || props.flexDirection === 'column'
      ? `& > p {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%) translateY(-50%); 
        background-color: ${props.bg};
        padding: 0 10px;
      }`
      : ''
  )}
`;

export const Progress = styled.p`
  color: gray;
  font-size: 1rem;
  margin: 0;
`;

export const ABtn = styled.button`
  border-radius: 2px;
  font-size: 18px;
  font-weight: bold;

  border-radius: ${(props: BtnConf) => `${props.borderRadius}px`};

  order: ${(props: BtnConf) => (props.idx === 0 ? -1 : 0)};

  border: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Outline) return `1px solid ${p.color}`;
    return 'none';
  }};

  background: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Primary) return p.color;
    return '#ffffff00';
  }};
  
  color: ${(p: BtnConf) => {
    if (p.btnStyle === AnnotationButtonStyle.Primary) return getColorContrast(p.color) === 'dark' ? '#fff' : '#000';
    return '#000';
  }};

  padding: ${(p: BtnConf) => {
    if (p.size === AnnotationButtonSize.Large) {
      return '0.8rem 1.1rem';
    } if (p.size === AnnotationButtonSize.Medium) {
      return '0.55rem .85rem';
    }
    return '0.3rem 0.6rem';
  }};
  font-family: ${(p: BtnConf) => p.fontFamily || 'inherit'};
  &:hover {
    cursor: pointer;
    text-decoration: ${(p: BtnConf) => (p.btnStyle === 'link' ? 'underline' : 'none')};
  }
  width:  ${(p: BtnConf) => (p.btnLayout === 'default' ? 'auto' : '100%')};
`;

export interface BtnConf {
  btnStyle: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  color: string;
  fontFamily: string | null;
  btnLayout: AnnotationButtonLayoutType;
  borderRadius: number;
  idx?: number;
}

function getColorContrast(hex: string): 'dark' | 'light' {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 155) ? 'light' : 'dark';
}

interface AnHotspotProps {
  selColor: string;
  box: Rect;
  scrollX: number;
  scrollY: number;
  isGranularHotspot: boolean;
}

const createBoxShadowKF = (selColor: string) : SimpleInterpolation => keyframes`
  50% {box-shadow: 0 0 0 4px ${selColor};}
`;

const BoxShadowKFRule = css`
  ${({ selColor }: AnHotspotProps) => css`
    ${createBoxShadowKF(selColor)} 2s infinite;
  `}
`;

export const AnHotspot = styled.div`
  background: transparent;
  cursor: pointer;
  animation: ${(p: AnHotspotProps) => (p.isGranularHotspot ? BoxShadowKFRule : 'none')};
  border-radius: 4px;
  position: absolute;
  top: ${(p: AnHotspotProps) => `${p.box.top - 4 + p.scrollY}px`};
  left: ${(p: AnHotspotProps) => `${p.box.left - 4 + p.scrollX}px`};
  width: ${(p: AnHotspotProps) => `${p.box.width + 8}px`};
  height: ${(p: AnHotspotProps) => `${p.box.height + 8}px`};
`;

interface AnVideoProps {
  border: string;
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0%);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0%);
    opacity: 1;
  }

  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

export const AnVideoContainer = styled.div<{ out: 'slidein' | 'slideout' }>`
  position: fixed;
  border-radius: 8px;
  animation: ${props => (props.out === 'slidein' ? slideIn : slideOut)} 0.1s linear;
`;

export const AnVideo = styled.video<{ border: string }>`
  width: 100%;
  border-radius: 8px;
  box-shadow: ${p => `${p.border}`};
`;

export const AnVideoControls = styled.div`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  display: flex;
  justify-content: space-evenly;
`;

export const AnVideoCtrlBtn = styled.button<{ pcolor: string }>`
  height: 42px;
  width: 48px;
  border-radius: 6px;
  color: ${p => generateShadeColor(p.pcolor, 200)};
  background: ${p => `${p.pcolor}bf`};
  font-size: 1.2rem;
  border: none;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.45rem;
  > span.anticon {
    display: block;
    height: 1em;
  }
`;
