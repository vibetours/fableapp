import styled, { keyframes, css } from 'styled-components';
import { AnnotationButtonSize, AnnotationButtonStyle, AnnotationBodyTextSize } from '@fable/common/dist/types';
import { Link } from 'react-router-dom';
import { Rect } from '../base/hightligher-base';

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

interface AnTextContentProps {
  bodyTextSize: AnnotationBodyTextSize;
  fontFamily: string | null;
  fontColor: string | null;
}

export const AnTextContent = styled.div`
  font-weight: normal !important;

  p {
    margin: 0;
    font-weight: normal !important;
  }
  p img {
    margin-top: 0.2em;
  }

  p {
    font-size: ${(props: AnTextContentProps) => `${props.bodyTextSize}px`};
    line-height: ${(props: AnTextContentProps) => `${parseFloat(props.bodyTextSize) * 1.4}px`};
    font-family: ${(p: AnTextContentProps) => p.fontFamily || 'inherit'};
  color: ${(p: AnTextContentProps) => `${p.fontColor}`};
  }
`;

export const ABtn = styled.button`
  border-radius: 2px;
  align-self: flex-start;
  font-size: 18px;
  font-weight: bold;

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
      return '0.65rem 1rem';
    } if (p.size === AnnotationButtonSize.Medium) {
      return '0.3rem 0.6rem';
    }
    return '0.2rem 0.45rem';
  }};
  font-family: ${(p: BtnConf) => p.fontFamily || 'inherit'};
  &:hover {
    cursor: pointer;
    text-decoration: ${(p: BtnConf) => (p.btnStyle === 'link' ? 'underline' : 'none')};
  }
`;

export interface BtnConf {
  btnStyle: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  color: string;
  fontFamily: string | null;
}

function getColorContrast(hex: string): 'dark' | 'light' {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? 'light' : 'dark';
}

interface AnHotspotProps {
  box: Rect;
  scrollX: number;
  scrollY: number;
  isGranularHotspot: boolean;
}

export const BoxShadowKF = keyframes`
  50% {box-shadow: 0 0 0 4px #1f96f3;}
`;

const BoxShadowKFRule = css`
  ${BoxShadowKF} 2s infinite;
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
  isCover: boolean;
}

export const AnVideo = styled.video`
  position: fixed;
  border-radius: 8px;
  box-shadow: ${(p: AnVideoProps) => `${p.border}`};
`;
