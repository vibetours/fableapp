import { IAnnotationConfig } from '@fable/common/dist/types';

export const generateCSSSelectorFromText = (text: string): string => text.toLowerCase().trim().replace(/\W+/g, '-');

export const getDefaultAnnCSSStyleText = (config: IAnnotationConfig): string => {
  const cssSelector = `#f-a-i-${config.refId}.f-a-c-${config.refId}`;
  const buttonTexts = config.buttons.map(btn => btn.text);
  return `/* Write css for annotation container here here */
${cssSelector} {

}

/* Inner container */
${cssSelector} .inner-con {

}

/* Text content */
${cssSelector} .text p {

}

/* Button container */
${cssSelector} .button-con {

}

${buttonTexts.map(btnText => ` /* ${btnText} button */
${cssSelector} .${generateCSSSelectorFromText(btnText)}-btn {

}

`).join('')}
/* Progress indicator */
${cssSelector} .progress {

}

`;
};
