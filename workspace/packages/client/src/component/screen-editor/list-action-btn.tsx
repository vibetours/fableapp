import React, { useState, useEffect, useRef } from 'react';
import {
  EditItem,
  IdxEditItem,
  ElEditType,
  IdxEditEncodingText,
  IdxEncodingTypeImage,
  IdxEncodingTypeBlur,
  IdxEncodingTypeDisplay,
  EditValueEncoding
} from '../../types';
import * as Tags from './styled';

interface IProps {
  edit: EditItem;
  element: HTMLElement;
}

export default function ListActionBtn({ edit, element }: IProps) {
  const [isShowOriginalState, setIsShowOriginalState] = useState<boolean>(false);
  const editRef = useRef(edit);
  const elementRef = useRef(element);

  useEffect(() => {
    editRef.current = edit;
    elementRef.current = element;
  }, [element, edit]);

  useEffect(() => () => {
    handleShowOriginal(editRef.current, true, elementRef.current);
  }, []);

  const handleShowOriginal = (e: EditItem, isShowOriginal: boolean, el: HTMLElement) => {
    if (el.dataset.deleted === 'true') return;
    const encoding = e[IdxEditItem.ENCODING];
    const elType = e[IdxEditItem.TYPE];

    switch (elType) {
      case ElEditType.Text: {
        const tEncoding = encoding as EditValueEncoding[ElEditType.Text];
        el.textContent = isShowOriginal
          ? tEncoding[IdxEditEncodingText.NEW_VALUE]
          : tEncoding[IdxEditEncodingText.OLD_VALUE];
        break;
      }

      case ElEditType.Image: {
        const tEncoding = encoding as EditValueEncoding[ElEditType.Image];

        if (isShowOriginal) {
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
        el.style.filter = isShowOriginal
          ? tEncoding[IdxEncodingTypeBlur.NEW_FILTER_VALUE]!
          : tEncoding[IdxEncodingTypeBlur.OLD_FILTER_VALUE]!;
        break;
      }

      case ElEditType.Display: {
        const tEncoding = encoding as EditValueEncoding[ElEditType.Display];
        el.style.display = isShowOriginal
          ? tEncoding[IdxEncodingTypeDisplay.NEW_VALUE]!
          : tEncoding[IdxEncodingTypeDisplay.OLD_VALUE]!;
        break;
      }

      default:
        break;
    }

    setIsShowOriginalState(prevState => !prevState);
  };

  return (
    <Tags.ListActionBtn onClick={() => handleShowOriginal(edit, isShowOriginalState, element)}>
      {isShowOriginalState ? 'Show Edited' : 'Show Original'}
    </Tags.ListActionBtn>
  );
}
