import { AnnotationNode, Box, Point, MultiAnnotationNode, GroupedAnns, GroupEdge } from './types';
import { IAnnotationConfigWithScreen, Timeline } from '../../types';
import { getAnnotationBtn } from '../annotation/ops';
import { getAnnotationWithScreenAndIdx } from '../../utils';

function getGroupedAnnNodesFromAnnNodeBoxArr(timeline: Timeline): GroupedAnns[] {
  const groups: Record<string, IAnnotationConfigWithScreen[]> = {};

  timeline.forEach(singleTimeline => {
    singleTimeline.forEach((annotation) => {
      if (groups[annotation.zId]) {
        groups[annotation.zId].push(annotation);
      } else {
        groups[annotation.zId] = [annotation];
      }
    });
  });

  return Object.entries(groups).map((el) => ({
    zId: el[0],
    anns: el[1]
  }));
}

export function getMultiAnnNodesAndEdges(
  data: Timeline,
  dim: {width: number, height: number, gap: number}
): [MultiAnnotationNode<Box>[], GroupEdge[]] {
  const groupedAnnNodes = getGroupedAnnNodesFromAnnNodeBoxArr(data);
  const multiAnnNodes: MultiAnnotationNode<Box>[] = [];
  const edges: GroupEdge[] = [];

  groupedAnnNodes.forEach((group, groupIdx) => {
    const annsWithNewDims: AnnotationNode<Box>[] = group.anns.map((annotation, annIdx) => {
      const annId = `${annotation.screen.id}/${annotation.refId}`;
      const newX = annIdx * dim.gap;
      const newY = annIdx * dim.gap;
      const width = dim.width;
      const height = dim.height;
      const dimData: Box = { x: newX, y: newY, width, height, cx: 0, cy: 0 };

      const nextBtn = getAnnotationBtn(annotation, 'next');

      if (nextBtn.hotspot && nextBtn.hotspot.actionType === 'navigate') {
        const toId = nextBtn.hotspot.actionValue;
        const toAnnId = toId.split('/')[1];
        const toAnn = getAnnotationWithScreenAndIdx(toAnnId, data)!;
        edges.push({
          fromAnnId: annId,
          toAnnId: toId,
          fromZId: annotation.zId,
          toZId: toAnn.zId,
        });
      }

      return {
        ...annotation,
        id: annId,
        localIdx: groupIdx,
        grp: annotation.grpId,
        width: dim.width,
        height: dim.height,
        imageUrl: annotation.screen.thumbnailUri.href,
        text: annotation.displayText,
        stepNumber: annotation.stepNumber,
        annotation,
        x: newX,
        y: newY,
        storedData: dimData,
        origStoredData: dimData,
        sameMultiAnnGroupAnnRids: group
          .anns
          .filter(ann => ann.refId !== annotation.refId)
          .map(ann => ann.refId)
      };
    });

    const groupWidth = dim.width + (annsWithNewDims.length - 1) * dim.gap;
    const groupHeight = dim.height + (annsWithNewDims.length - 1) * dim.gap;

    multiAnnNodes.push({
      id: group.zId,
      x: 0,
      y: 0,
      width: groupWidth,
      height: groupHeight,
      data: {
        zId: group.zId,
        anns: annsWithNewDims,
      }
    });
  });

  return [multiAnnNodes, edges];
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
