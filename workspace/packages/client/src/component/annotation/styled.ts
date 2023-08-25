import styled, { keyframes, css, SimpleInterpolation } from 'styled-components';
import {
  AnnotationButtonSize,
  AnnotationButtonStyle,
  AnnotationButtonLayoutType,
  AnnotationFontSize
} from '@fable/common/dist/types';
import { Rect } from '../base/hightligher-base';
import { generateShadeColor } from './utils';
import { getColorContrast } from '../../utils';

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
  font-weight: 500;

  p {
    margin: 0;
    font-weight: 500;
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
        padding: 0 10px;
      }`
      : ''
  )}
`;

export const Progress = styled.p<{bg: string; fg: string}>`
  font-size: 1rem;
  margin: 0;
  background-color: ${props => props.bg};
  color: ${props => props.fg}a8;
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
    return getColorContrast(p.bg) === 'dark' ? '#fff' : '#000';
  }};

  padding: ${(p: BtnConf) => {
    if (p.size === AnnotationButtonSize.Large) {
      return '12px 22px';
    } if (p.size === AnnotationButtonSize.Medium) {
      return '8px 18px';
    }
    return '4px 12px';
  }};
  font-family: ${(p: BtnConf) => p.fontFamily || 'inherit'};
  &:hover {
    cursor: pointer;
    text-decoration: ${(p: BtnConf) => (p.btnStyle === 'link' ? 'underline' : 'none')};
  }
  width:  ${(p: BtnConf) => (p.btnLayout === 'default' ? 'auto' : '100%')};
  opacity: 0.85;
  transition: opacity 0.2s ease-out;

  &:hover {
    opacity: 1;
  }
`;

export interface BtnConf {
  btnStyle: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  color: string;
  fontFamily: string | null;
  btnLayout: AnnotationButtonLayoutType;
  borderRadius: number;
  idx?: number;
  bg: string;
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
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
`;

export const AnVideoContainer = styled.div<{ out: 'slidein' | 'slideout' }>`
  position: fixed;
  border-radius: 8px;
  animation: ${props => (props.out === 'slidein' ? slideIn : slideOut)} 0.2s ease-out;
`;

export const AnVideo = styled.video<{ border: string }>`
  width: 100%;
  border-radius: 8px;
  box-shadow: ${p => `${p.border}`};
`;

export const AnVideoControls = styled.div<{showOverlay: boolean}>`
  transition: all 0.2s ease-in-out;
  background-color: ${(p) => (p.showOverlay ? 'rgba(0, 0, 0, 0.4)' : 'transparent')};
  height: 100%;
  border-radius: 8px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
`;

export const AnVideoCtrlBtn = styled.button<{ pcolor: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  color: white;
  background-color: transparent;
  font-size: 2rem;
  border: none;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;

  > span.anticon {
    display: block;
    height: 1em;
  }

  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
    background-color: rgba(255, 255, 255, 0.25);
    border-radius: 50%;
  }
`;

export const ReplayButton = styled.button<{ pcolor: string }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  height: 56px;
  width: 56px;
  border-radius: 50%;
  background: ${p => generateShadeColor(p.pcolor, 200)};
  color: ${p => `${p.pcolor}`};
  font-size: 1.6rem;
  border: none;
  display: flex;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease-in-out;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  > span.anticon {
    display: block;
    height: 1em;
  }
`;

const bottomToTop = keyframes`
  from {
    bottom: -1rem;
    opacity: 0;
  }

  to {
    bottom: 0.5rem;
    opacity: 1;
  }
`;

export const NavButtonCon = styled.div<{ pcolor: string }>`
  position: absolute;
  display: flex;
  justify-content: space-between;
  align-items: center;
  bottom: 0.75rem;
  left: 0.75rem;
  right: 0.75rem;

  animation: ${bottomToTop} 0.2s ease-in-out;

  .serial-num {
    color: ${p => generateShadeColor(p.pcolor, -200)};
  }

  .next-btn {
    color: ${p => generateShadeColor(p.pcolor, 200)};
    background: ${p => `${p.pcolor}bf`};

    &:hover {
      background: ${p => `${p.pcolor}`};
    }
  }

  .back-btn {
    background: ${p => generateShadeColor(p.pcolor, 200)};
    opacity: 0.8;
    color: ${p => `${p.pcolor}`};

    &:hover {
      opacity: 1;
    }
  }
`;
