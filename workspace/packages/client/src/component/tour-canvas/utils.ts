import { AnnotationNode, Box, CanvasGrid, Point } from './types';
import { AnnotationPerScreen } from '../../types';

export function formScreens2(data: AnnotationPerScreen[], grid: CanvasGrid): AnnotationNode<Box>[] {
  const arr: AnnotationNode<Box>[] = [];
  for (const el of data) {
    if (el.annotations.length === 0) {
      arr.push({
        id: `${el.screen.id}`,
        width: grid.gridSize * 6,
        height: grid.gridSize * 4,
        x: 0,
        y: 0,
        imageUrl: el.screen.thumbnailUri.href,
        type: 'screen',
        screenTitle: el.screen.displayName,
      });
    } else {
      for (const annotation of el.annotations) {
        arr.push({
          id: `${el.screen.id}/${annotation.refId}`,
          width: grid.gridSize * 6,
          height: grid.gridSize * 4,
          x: 0,
          y: 0,
          imageUrl: el.screen.thumbnailUri.href,
          text: annotation.displayText,
          type: 'annotation',
          screenTitle: el.screen.displayName,
        });
      }
    }
  }
  return arr;
}

export function getEdges(data: AnnotationPerScreen[]) {
  const edges: [srcId: string, destId: string][] = [];
  for (const el of data) {
    for (const ann of el.annotations) {
      const fromId = `${el.screen.id}/${ann.refId}`;
      for (const btn of ann.buttons) {
        if (btn.type === 'next' && btn.hotspot) {
          const toId = btn.hotspot.actionValue;
          edges.push([fromId, toId]);
        }
      }
    }
  }
  return edges;
}

export function formPathUsingPoints(points: Point[]) {
  let d = 'M ';
  points.forEach((point, index) => {
    if (index === 0) {
      d += Object.values(point).join(',');
    }
    d = `${d} L ${Object.values(point).join(',')}`;
  });
  return d;
}

export function getEndPointsUsingPath(d: string) {
  const commands = d.split(/(?=[LMC])/);
  const pointArrays = commands.map((dStr: string) => {
    const pointsArray = dStr.slice(1, dStr.length).split(',');
    const pairsArray = [];
    for (let i = 0; i < pointsArray.length; i += 2) {
      pairsArray.push([+pointsArray[i], +pointsArray[i + 1]]);
    }
    return pairsArray[0];
  });

  const start = pointArrays[0];
  const end = pointArrays[pointArrays.length - 1];

  return [{ x: start[0], y: start[1] }, { x: end[0], y: end[1] }];
}
