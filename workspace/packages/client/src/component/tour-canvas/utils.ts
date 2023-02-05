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
          text: annotation.bodyContent,
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
