import { AnnotationPerScreen } from '@fable/common/dist/types';
import { Screen } from '../types';

export function formScreens(data: AnnotationPerScreen[]) {
  const arr = [];
  let i = 0;
  for (const el of data) {
    for (const annotation of el.annotations) {
      arr.push({
        id: `${el.screen.id}/${annotation.refId}`,
        screenId: el.screen.id,
        screenHref: `https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/root/cmn/${el.screen.thumbnail}`,
        annotationText: annotation.bodyContent,
        annotationId: annotation.refId,
        width: 300,
        height: 180,
        x: 100 + i * 400,
        y: 100,
      });
      i++;
    }
  }
  return arr;
}

export function formConnectors(
  data: AnnotationPerScreen[],
  screenElements: Screen[]
) {
  const conns = [];
  for (const el of data) {
    for (const annotation of el.annotations) {
      const fromId = `${el.screen.id}/${annotation.refId}`;

      for (const button of annotation.buttons) {
        if (button.type === 'next' && button.hotspot) {
          const toId = button.hotspot.actionValue;
          const points = formPoints(fromId, toId, screenElements);
          if (points) {
            conns.push({
              from: fromId,
              to: toId,
              points,
            });
          }
        }
      }
    }
  }

  return conns;
}

export function formPoints(
  fromId: string,
  toId: string,
  screenElements: Screen[]
) {
  const fromScreen = screenElements?.filter(
    (screen) => screen.id === fromId
  )[0];
  const toScreen = screenElements?.filter((screen) => screen.id === toId)[0];

  if (fromScreen && toScreen) {
    if (fromScreen.x < toScreen.x) {
      const fromPoints = {
        x: fromScreen.x + fromScreen.width,
        y: fromScreen.y + fromScreen.height / 2,
      };
      const toPoints = {
        x: toScreen.x,
        y: toScreen.y + toScreen.height / 2,
      };
      return [fromPoints, toPoints];
    }
    const fromPoints = {
      x: fromScreen.x,
      y: fromScreen.y + fromScreen.height / 2,
    };
    const toPoints = {
      x: toScreen.x + toScreen.width,
      y: toScreen.y + toScreen.height / 2,
    };
    return [fromPoints, toPoints];
  }

  return [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
}
