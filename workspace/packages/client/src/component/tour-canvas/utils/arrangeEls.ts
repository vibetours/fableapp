import { AnnotationPerScreen } from '@fable/common/dist/types';
import { Conn, Screen } from '../types';

export function formScreens(data: AnnotationPerScreen[]) {
  const arr = [];
  let i = 0;
  for (const el of data) {
    for (const annotation of el.annotations) {
      arr.push({
        id: `${el.screen.id}/${annotation.refId}`,
        screenId: el.screen.id,
        screenRid: el.screen.rid,
        screenHref: `https://fable-tour-app-gamma.s3.ap-south-1.amazonaws.com/root/cmn/${el.screen.thumbnail}`,
        annotationText: annotation.bodyContent,
        annotationId: annotation.refId,
        width: 300,
        height: 180,
        x: 100 + i * 400,
        y: 100,
        annotation,
      });
      i++;
    }
  }
  return arr;
}

export function formConnectors(
  data: AnnotationPerScreen[],
  screenElements: Screen[]
): Conn[] | undefined {
  const conns = [];
  for (const el of data) {
    for (const annotation of el.annotations) {
      const fromId = `${el.screen.id}/${annotation.refId}`;

      for (const button of annotation.buttons) {
        if (button.type === 'next' && button.hotspot) {
          const toId = button.hotspot.actionValue;
          const points = formPoints(fromId, toId, screenElements);
          if (points) {
            conns.push(points);
          }
        }
      }
    }
  }
  if (conns.length > 0) {
    // @ts-ignore
    return conns as Conn[];
  }

  return undefined;
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
        y: fromScreen.y + fromScreen.height / 2 - 20,
      };
      const toPoints = {
        x: toScreen.x,
        y: toScreen.y + toScreen.height / 2 - 20,
      };
      return {
        from: {
          element: fromId,
          relX: fromScreen.width,
          relY: fromScreen.height / 2
        },
        to: {
          element: toId,
          relX: 0,
          relY: fromScreen.height / 2,
        },
        points: [fromPoints, toPoints]
      };
    }
    const fromPoints = {
      x: fromScreen.x,
      y: fromScreen.y + fromScreen.height / 2 + 20,
    };
    const toPoints = {
      x: toScreen.x + toScreen.width,
      y: toScreen.y + toScreen.height / 2 + 20,
    };
    return {
      from: {
        element: fromId,
        relX: 0,
        relY: fromScreen.height / 2
      },
      to: {
        element: toId,
        relX: fromScreen.width,
        relY: fromScreen.height / 2,
      },
      points: [fromPoints, toPoints]
    };
  }

  return undefined;
}
