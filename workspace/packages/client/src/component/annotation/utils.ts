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
