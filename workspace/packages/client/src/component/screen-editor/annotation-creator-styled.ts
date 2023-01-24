import { AnnotationButtonSize, AnnotationButtonStyle } from '@fable/common/dist/types';
import styled from 'styled-components';
import { getColorContrast } from './mics';

export const ABtn = styled.button`
  border-radius: 8px;
  align-self: flex-start;

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
