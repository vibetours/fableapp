import { SerNode } from '@fable/common/dist/types';
import { deepcopy } from '@fable/common/dist/utils';
import { AddDiff, DelDiff, ReplaceDiff, UpdateDiff } from './types';

export const applyDelDiffsToSerDom = (delDiffs: DelDiff[], tree: SerNode): SerNode => {
  const newTree = deepcopy(tree);

  delDiffs.forEach(diff => {
    const pathIdxes = diff.parentElPath.split('.').map(el => +el).slice(1);
    let node = newTree;

    pathIdxes.forEach(pathIdx => {
      node = node.chldrn[pathIdx];
    });

    diff.toBeDeletedNodes.forEach(toBeDeltedNode => {
      if (toBeDeltedNode.type === 'textcomment') {
        node.chldrn.splice(toBeDeltedNode.idx + 1, 1);
      }
      node.chldrn.splice(toBeDeltedNode.idx, 1);
    });
  });

  return newTree;
};

export const applyAddDiffsToSerDom = (addDiffs: AddDiff[], tree: SerNode): SerNode => {
  const newTree = deepcopy(tree);

  addDiffs.forEach(diff => {
    const pathIdxes = diff.parentElPath.split('.').map(el => +el).slice(1);
    let node = newTree;
    pathIdxes.forEach(pathIdx => {
      node = node.chldrn[pathIdx];
    });

    diff.toBeAddedNodes.forEach(toBeAddedNode => {
      if (toBeAddedNode.type === 'textcomment') {
        node.chldrn.splice(toBeAddedNode.idx, 0, diff.parentSerNode.chldrn[toBeAddedNode.idx + 1]!);
      }
      node.chldrn.splice(toBeAddedNode.idx, 0, diff.parentSerNode.chldrn[toBeAddedNode.idx]);
    });
  });

  return newTree;
};

export const applyUpdateDiffsToSerDom = (updateDiffs: UpdateDiff[], tree: SerNode): SerNode => {
  const newTree = deepcopy(tree);

  updateDiffs.forEach(diff => {
    const pathIdxes = diff.parentElPath.split('.').map(el => +el).slice(1);
    let node = newTree;

    pathIdxes.forEach(pathIdx => {
      node = node.chldrn[pathIdx];
    });

    diff.toBeUpdatedNodes.forEach(toBeUpdatedNode => {
      toBeUpdatedNode.updates.forEach(update => {
        node.chldrn[toBeUpdatedNode.idx].attrs[update.attrKey] = update.attrNewVal;
      });
    });
  });

  return newTree;
};

export const applyReplaceDiffsToSerDom = (replaceDiffs: ReplaceDiff[], tree: SerNode): SerNode => {
  const newTree = deepcopy(tree);

  replaceDiffs.forEach(diff => {
    const pathIdxes = diff.parentElPath.split('.').map(el => +el).slice(1);
    let node = newTree;

    pathIdxes.forEach(pathIdx => {
      node = node.chldrn[pathIdx];
    });

    diff.toBeReplacedNodes.forEach(toBeReplacedNode => {
      node.chldrn[toBeReplacedNode.idx] = diff.parentSerNode.chldrn[toBeReplacedNode.replaceNodeIdx];
    });
  });

  return newTree;
};
