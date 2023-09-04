import { createIframeSrc } from '../../utils';

export const createIframe = (relativeURL = '') => {
  const iframeSrc = createIframeSrc(relativeURL);
  const iframe = `<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="800" height="450" src="${iframeSrc}" allowfullscreen></iframe>`;
  return iframe;
};

export const copyToClipboard = (text: string): Promise<void> => navigator.clipboard.writeText(text);
