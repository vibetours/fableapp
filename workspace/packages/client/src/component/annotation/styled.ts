import styled from 'styled-components';
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
  border-radius: 8px;
  padding: 0;
  margin: 0;
  justify-items: center;
  align-items: center;
`;

interface AnTextContentProps {
  bodyTextSize: AnnotationBodyTextSize
}

export const AnTextContent = styled.div`
  p {
    margin: 0;
  }
  p img {
    margin-top: 0.2em;
  }

  p {
    font-size: ${(props: AnTextContentProps) => `${props.bodyTextSize}px`};
    line-height: ${(props: AnTextContentProps) => `${parseFloat(props.bodyTextSize) * 1.4}px`};
  }
`;

export const ABtn = styled.button`
  border-radius: 8px;
  align-self: flex-start;
  font-size: 18px;

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
      return '0.4rem 0.7rem';
    }
    return '0.25rem 0.5rem';
  }};

  &:hover {
    cursor: pointer;
    text-decoration: ${(p: BtnConf) => (p.btnStyle === 'link' ? 'underline' : 'none')};
  }
`;

export interface BtnConf {
  btnStyle: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  color: string;
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
}

export const AnHotspot = styled.div`
  background: transparent;
  color: white;
  cursor: pointer;
  position: absolute;
  top: ${(p: AnHotspotProps) => `${p.box.top + p.scrollY}px`};
  left: ${(p: AnHotspotProps) => `${p.box.left + p.scrollX}px`};
  width: ${(p: AnHotspotProps) => `${p.box.width}px`};
  height: ${(p: AnHotspotProps) => `${p.box.height}px`};
`;

interface AnVideoProps {
  border: string
}

export const AnVideo = styled.video`
  position: fixed;
  bottom: 10px;
  right: 10px;
  height: 150px;
  border-radius: 8px;
  box-shadow: ${(p: AnVideoProps) => `${p.border}`};
`;
