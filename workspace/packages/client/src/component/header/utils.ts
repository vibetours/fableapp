import { createIframeSrc } from '../../utils';

export const getIframeShareCode = (height: string, width: string, relativeURL = ''): string => {
  const iframeSrc = createIframeSrc(relativeURL);
  const iframe = `<iframe style="border: 1px solid rgba(0, 0, 0, 0.1);" width="${width}" height="${height}" src="${iframeSrc}" allowfullscreen></iframe>`;
  return iframe;
};
