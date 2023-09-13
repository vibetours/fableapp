import { getRandomId } from '@fable/common/dist/utils';
import { AnnotationNode, Box, CanvasGrid, Edge, Point } from './types';
import { ConnectedOrderedAnnGroupedByScreen } from '../../types';
import { getAnnotationBtn } from '../annotation/ops';

export function formAnnotationNodes(data: ConnectedOrderedAnnGroupedByScreen, grid: CanvasGrid)
: [AnnotationNode<Box>[], Edge[]] {
  const annotationNodes: AnnotationNode<Box>[] = [];
  const edges: [srcId: string, destId: string][] = [];

  data.forEach((connectedTimelines) => {
    let i = 0;
    const groupId = getRandomId();
    connectedTimelines.forEach((timeline => {
      const screen = timeline[0].screen;

      timeline.forEach((annotation) => {
        const annId = `${screen.id}/${annotation.refId}`;

        const nextBtn = getAnnotationBtn(annotation, 'next');

        if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
          const toId = nextBtn.hotspot.actionValue;
          edges.push([annId, toId]);
        }

        annotationNodes.push({
          id: annId,
          localIdx: i++,
          grp: groupId,
          width: grid.gridSize * 6,
          height: grid.gridSize * 4,
          x: 0,
          y: 0,
          imageUrl: screen.thumbnailUri.href,
          text: annotation.displayText,
          screenTitle: annotation.index,
          annotation
        });
      });
    }));
  });

  return [annotationNodes, edges];
}

export function formPathUsingPoints(points: Point[]): string {
  let d = 'M ';
  points.forEach((point, index) => {
    if (index === 0) {
      d += Object.values(point).join(',');
    }
    d = `${d} L ${Object.values(point).join(',')}`;
  });
  return d;
}

export function getEndPointsUsingPath(d: string): [Point, Point] {
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
