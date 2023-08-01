import {
  EditItem,
  EditValueEncoding,
  ElEditType,
  IdxEditEncodingText,
  IdxEditItem,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay, IdxEncodingTypeImage, IdxEncodingTypeMask } from '../../../types';
import { hideChildren, unhideChildren } from './creator-actions';

export const showOrHideEditsFromEl = (e: EditItem, isShowEdits: boolean, el: HTMLElement): void => {
  if (el.dataset.deleted === 'true') return;
  const encoding = e[IdxEditItem.ENCODING];
  const elType = e[IdxEditItem.TYPE];

  switch (elType) {
    case ElEditType.Text: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Text];
      el.textContent = isShowEdits
        ? tEncoding[IdxEditEncodingText.NEW_VALUE]
        : tEncoding[IdxEditEncodingText.OLD_VALUE];
      break;
    }

    case ElEditType.Image: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Image];

      if (isShowEdits) {
        (el as HTMLImageElement).setAttribute(
          'style',
          ` height: ${encoding[IdxEncodingTypeImage.HEIGHT]} !important; 
              width: ${encoding[IdxEncodingTypeImage.WIDTH]} !important; 
              object-fit: cover !important;
            `
        );
        (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.NEW_VALUE]!;
        (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.NEW_VALUE]!;
      } else {
        (el as HTMLImageElement).setAttribute(
          'style',
          ` height: ${encoding[IdxEncodingTypeImage.HEIGHT]} !important; 
              width: ${encoding[IdxEncodingTypeImage.WIDTH]} !important; 
            `
        );
        (el as HTMLImageElement).src = tEncoding[IdxEncodingTypeImage.OLD_VALUE]!;
        (el as HTMLImageElement).srcset = tEncoding[IdxEncodingTypeImage.OLD_VALUE]!;
      }

      break;
    }

    case ElEditType.Blur: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Blur];
      el.style.filter = isShowEdits
        ? tEncoding[IdxEncodingTypeBlur.NEW_FILTER_VALUE]!
        : tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!;
      break;
    }

    case ElEditType.Display: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Display];
      el.style.display = isShowEdits
        ? tEncoding[IdxEncodingTypeDisplay.NEW_VALUE]!
        : tEncoding[IdxEncodingTypeDisplay.OLD_VALUE]!;
      break;
    }

    case ElEditType.Mask: {
      const tEncoding = encoding as EditValueEncoding[ElEditType.Mask];

      if (isShowEdits) {
        el.setAttribute(
          'style',
          `${tEncoding[IdxEncodingTypeMask.NEW_STYLE]}`
        );

        hideChildren(el);
      } else {
        el.setAttribute(
          'style',
          `${tEncoding[IdxEncodingTypeMask.OLD_STYLE]}`
        );

        unhideChildren(el);
      }

      break;
    }

    default:
      break;
  }
};
