import { IAnnotationConfig } from '@fable/common/dist/types';
import { IAnnoationDisplayConfig } from '.';
import { Rect } from '../base/hightligher-base';
import { AnnotationPerScreen, IAnnotationConfigWithScreen } from '../../types';
import { isVideoAnnotation } from '../../utils';
import { AllDimsForAnnotation } from './types';
import { LeadFormField, OPTION_INPUT_CLASSNAME } from '../annotation-rich-text-editor/nodes/lead-form-node';
import { FABLE_LEAD_FORM_FIELD_NAME, FABLE_LEAD_FORM_VALIDATION_FN } from '../../constants';
import { FIELD_NAME_VARIABLE_REGEX } from '../annotation-rich-text-editor/utils/lead-form-node-utils';

export const FABLE_RT_UMBRL = 'fable-rt-umbrl';

export const getFableRtUmbrlDiv = (doc: Document): HTMLDivElement => {
  const umbrlDiv = doc.getElementsByClassName(FABLE_RT_UMBRL)[0];
  return umbrlDiv as HTMLDivElement;
};

export const DEFAULT_DIMS_FOR_ANN: AllDimsForAnnotation = {
  dimForSmallAnnotation: { w: 10, h: 10 },
  dimForMediumAnnotation: { w: 10, h: 10 },
  dimForLargeAnnotation: { w: 10, h: 10 },
  dimForCustomAnnotation: { w: 10, h: 10 },
};

export const scrollToAnn = (win: Window, boxRect: Rect, annDisplayConfig: IAnnoationDisplayConfig): void => {
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

const extractRGBValues = (color: string): number[] => color.match(/\d+/g)!.map(Number);

const expandHexValues = (hexValue: string): string => {
  const expandedHexValue = hexValue
    .split('')
    .map(char => char + char)
    .join('');

  return expandedHexValue;
};

const extractHexValuesToRGB = (color: string): number[] => {
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

export const getShadedRGBColor = (color: string, percent: number): string => {
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

export const generateShadeColor = (color: string, d = 50): string => {
  const luminance = calculateLuminance(color);
  const percent = luminance > 0.5 ? d * -1 : d;
  return getShadedRGBColor(color, percent);
};

export const generatePointFiveLightShate = (color: string): string => {
  const rgbValues = extractColorValuesInRgb(color);
  const [r, g, b] = rgbValues;
  const lightColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
  return lightColor;
};

export const playVideoAnn = (screenId: string, annId: string): void => {
  const iframe = getIframeByScreenId(screenId)!;
  const videoEl = iframe.contentDocument!.querySelector(`#fable-ann-video-${annId}`) as HTMLVideoElement;
  const timer = setInterval(() => {
    if (videoEl.getAttribute('data-playable')) {
      clearInterval(timer);
      videoEl.play();
    } else {
      console.log('waiting for video feed...');
    }
  }, 16 * 3);
};

export const getIframeByScreenId = (screenId: string): HTMLIFrameElement | null => {
  const iframe = document.querySelector(`.fable-iframe-${screenId}`) as HTMLIFrameElement;
  return iframe;
};

export const getAnnotationByRefId = (
  refId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfig | null => {
  for (const screenGroup of allAnnotationsForTour) {
    for (const annotation of screenGroup.annotations) {
      if (annotation.refId === refId) {
        return annotation;
      }
    }
  }
  return null;
};

export const getAnnsOfSameMultiAnnGrp = (
  zId: string,
  allAnnotationsForTour: AnnotationPerScreen[]
): IAnnotationConfig[] => {
  const anns: IAnnotationConfig[] = [];

  for (const screenGroup of allAnnotationsForTour) {
    for (const annotation of screenGroup.annotations) {
      if (annotation.zId === zId) {
        anns.push(annotation);
      }
    }
  }

  return anns;
};

export function isPrevNextBtnLinksToVideoAnn(
  config: IAnnotationConfig,
  allAnnotationsForTour: AnnotationPerScreen[]
): { isNextAnnVideo: boolean, isPrevAnnVideo: boolean } {
  const isNextAnnVideo = isBtnLinksToVideoAnn(config, allAnnotationsForTour, 'next');
  const isPrevAnnVideo = isBtnLinksToVideoAnn(config, allAnnotationsForTour, 'prev');

  return { isNextAnnVideo, isPrevAnnVideo };
}

export function isBtnLinksToVideoAnn(
  config: IAnnotationConfig,
  allAnnotationsForTour: AnnotationPerScreen[],
  type: 'prev' | 'next'
): boolean {
  let isLinkToVideoAnn = false;

  const btn = config.buttons.find(button => button.type === type)!;
  const btnHotspot = btn.hotspot && btn.hotspot.actionType === 'navigate';

  if (btnHotspot) {
    const ann = getAnnotationByRefId(btn.hotspot!.actionValue.split('/')[1], allAnnotationsForTour);
    if (ann && isVideoAnnotation(ann)) {
      isLinkToVideoAnn = true;
    }
  }

  return isLinkToVideoAnn;
}

export const isLeadFormPresent = (annConDiv: HTMLDivElement): boolean => {
  const res = Boolean(annConDiv.getElementsByClassName('LeadForm__container').item(0));
  return res;
};

function validateEmail(email: string): boolean {
  const regex = /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

function validateText(text: string): boolean {
  return Boolean(text.trim());
}

const validationFnMap: Record<LeadFormField, (value: string) => boolean> = {
  email: validateEmail,
  text: validateText
};

const EMPTY_FIELD_VALIDATION_ERROR = 'Field can\'t be empty';
const INVALID_EMAIL_VALIDATION_ERROR = 'Email format is not valid';

const getValidationErrorMsg = (value: string, validationType: LeadFormField): string => {
  if (!value.trim()) return EMPTY_FIELD_VALIDATION_ERROR;
  if (validationType === 'email') return INVALID_EMAIL_VALIDATION_ERROR;
  return '';
};

export const validateInput = (field: HTMLDivElement): {
  isValid: boolean,
  fieldName: string,
  fieldValue: string
} => {
  const inpulEl = field.getElementsByClassName(OPTION_INPUT_CLASSNAME).item(0);

  const validationType = (field.getAttribute(FABLE_LEAD_FORM_VALIDATION_FN) || 'text') as LeadFormField;
  const validationFn = validationFnMap[validationType];
  const fieldValue = (inpulEl as HTMLInputElement).value.trim();
  const fieldName = inpulEl?.getAttribute(FABLE_LEAD_FORM_FIELD_NAME) || '';
  const isValid = validationFn(fieldValue);

  const uid = field.getAttribute('fable-input-field-uid');
  const errorMsgEl = field.querySelector(`[fable-validation-uid="${uid}"]`) as HTMLDivElement;

  if (isValid) hideValidationError(errorMsgEl as HTMLDivElement);
  else showValidationError(errorMsgEl as HTMLDivElement, getValidationErrorMsg(fieldValue, validationType));

  return { isValid, fieldName, fieldValue };
};

export const parseFieldName = (placeholderString: string): string => {
  let nVarName = '';
  const match = placeholderString.match(FIELD_NAME_VARIABLE_REGEX);

  if (match && match[1]) {
    const varName = match[1];
    nVarName = varName.trim().replace(/[\s\W]/g, '_').toLowerCase();
  }

  if (!nVarName) {
    nVarName = placeholderString.trim().replace(/[\s\W]/g, '_').toLowerCase();
  }

  return nVarName;
};

export const showValidationError = (errorMsgEl: HTMLDivElement, message: string): void => {
  if (errorMsgEl) {
    (errorMsgEl as HTMLDivElement).innerText = message;
    (errorMsgEl as HTMLDivElement).style.visibility = 'visible';
  }
};

export const hideValidationError = (errorMsgEl: HTMLDivElement): void => {
  if (errorMsgEl) (errorMsgEl as HTMLDivElement).style.visibility = 'hidden';
};
