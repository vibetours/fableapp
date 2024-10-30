import { createIframeSrc } from '../../utils';

export const getIframeShareCode = (height: string, width: string, relativeURL = ''): string => {
  const iframeSrc = createIframeSrc(relativeURL);
  const iframe = `<iframe style="border: none;" width="${width}" height="${height}" src="${iframeSrc}" allowfullscreen></iframe>`;
  return iframe;
};
