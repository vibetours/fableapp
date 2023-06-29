import { IAnnoationDisplayConfig } from '.';
import { Rect } from '../base/hightligher-base';

export const scrollToAnn = (win: Window, boxRect: Rect, annDisplayConfig: IAnnoationDisplayConfig) => {
  const doc = win.document;

  const pageHeight = doc.body.offsetHeight;
  const windowHeight = win.innerHeight;

  // ann can be placed at the top of the element or the bottom of the element
  // for calculation, we will consider the ann window such that the ann can be placed at the top or at the bottom
  const annWindowStartingY = boxRect.y - annDisplayConfig.dimForLargeAnnotation.h;
  const annWindowEndingY = boxRect.y + boxRect.height + annDisplayConfig.dimForLargeAnnotation.h;

  // if the box with ann is in the view port don't scroll
  if (annWindowStartingY >= win.scrollY && annWindowEndingY <= win.scrollY + windowHeight) {
    return;
  }

  // if ann is at top, scroll to extreme top
  if (annWindowStartingY < 0) {
    win.scrollTo(0, 0);
    return;
  }

  // if ann at lower end -> scroll to extreme bottom
  if (annWindowEndingY > pageHeight) {
    win.scrollTo(0, pageHeight);
    return;
  }

  // case -> scroll such that the ann window is in center
  const winHalfSection = win.innerHeight / 2;
  const annWindowHeight = annWindowEndingY - annWindowStartingY;
  const annWindowMid = annWindowHeight / 2;

  const scrollStart = annWindowStartingY + annWindowMid - winHalfSection;

  win.scrollTo(0, scrollStart);
};

const extractRGBValues = (color: string) : number[] => color.match(/\d+/g)!.map(Number);

const expandHexValues = (hexValue: string) : string => {
  const expandedHexValue = hexValue
    .split('')
    .map(char => char + char)
    .join('');

  return expandedHexValue;
};
const extractHexValuesToRGB = (color: string) : number[] => {
  let hexValue = color.replace(/#/g, '');

  if (hexValue.length === 3) {
    hexValue = expandHexValues(hexValue);
  }

  let r = parseInt(hexValue.substring(0, 2), 16);
  let g = parseInt(hexValue.substring(2, 4), 16);
  let b = parseInt(hexValue.substring(4, 6), 16);

  if (r === 0) r = 32;
  if (g === 0) g = 32;
  if (b === 0) b = 32;
  return [r, g, b];
};

const extractColorValuesInRgb = (color: string): number[] => {
  if (color.startsWith('rgb')) {
    return extractRGBValues(color);
  } if (color.startsWith('#')) {
    return extractHexValuesToRGB(color);
  }

  return [];
};

const getShadedRGBColor = (color: string, percent: number): string => {
  const rgbValues = extractColorValuesInRgb(color);
  const shadedRgb = rgbValues.map(value => {
    let newValue = value + percent;
    newValue = Math.max(0, Math.min(255, newValue));
    return newValue;
  });
  return `rgb(${shadedRgb.join(', ')})`;
};

const calculateLuminance = (color: string): number => {
  const rgbValues = extractColorValuesInRgb(color);

  const [r, g, b] = rgbValues;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance;
};

export const generateShadeColor = (color: string): string => {
  const luminance = calculateLuminance(color);
  const percent = luminance > 0.5 ? -50 : 50;
  return getShadedRGBColor(color, percent);
};
