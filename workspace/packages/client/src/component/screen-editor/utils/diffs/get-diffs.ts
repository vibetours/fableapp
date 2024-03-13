import { SerNode } from '@fable/common/dist/types';
import { DiffsSerNode, Update } from './types';
import { FABLE_CUSTOM_NODE } from '../deser';
import { DeSerProps } from '../../preview';
import { getFidOfSerNode, isDeepEqual, removeDuplicatesOfStrArr } from '../../../../utils';

type DiffQueueNode = {
  serNode: SerNode,
  props: DeSerProps,
}

export const getDiffsOfImmediateChildren = (node1: DiffQueueNode, node2: DiffQueueNode): DiffsSerNode => {
  const diffs: DiffsSerNode = {
    addedNodes: [],
    deletedNodes: [],
    updatedNodes: [],
    commonNodes: [],
    replaceNodes: [],
    shouldReplaceNode: false,
    nodeProps: {
      partOfSvgEl: 0,
      shadowParent: null,
    }
  };

  if (isSerNodeReordered(node1.serNode, node2.serNode)) {
    diffs.shouldReplaceNode = true;
    return diffs;
  }

  if (isFidRepeated(node1.serNode) || isFidRepeated(node2.serNode)) {
    diffs.shouldReplaceNode = true;
    return diffs;
  }

  if (node1.serNode.name.toLowerCase() === 'svg') diffs.nodeProps.partOfSvgEl = 1;

  const mapOfTree1 = new Map();
  node1.serNode.chldrn.forEach(node => {
    if (node.name.toLowerCase() !== '#text' && (node.type === Node.COMMENT_NODE || node.type === Node.ELEMENT_NODE)) {
      const fid = getFidOfSerNode(node);
      mapOfTree1.set(fid, node);
    }
  });

  for (let i = 0; i <= node2.serNode.chldrn.length - 1; i++) {
    const serNodeInTree2 = node2.serNode.chldrn[i];
    const currFid = getFidOfSerNode(serNodeInTree2);

    if (serNodeInTree2.type === Node.DOCUMENT_FRAGMENT_NODE) {
      const shadowRootInSerNodeTree1 = node1.serNode.chldrn.find(node => node.type === Node.DOCUMENT_FRAGMENT_NODE)!;
      diffs.commonNodes.push({
        serNodeOfTree1: shadowRootInSerNodeTree1,
        serNodeOfTree2: serNodeInTree2,
      });
      continue;
    }

    if (!mapOfTree1.has(currFid)) {
      // ADD diffs
      if (serNodeInTree2.type !== Node.COMMENT_NODE && serNodeInTree2.type !== Node.ELEMENT_NODE) {
        if (
          serNodeInTree2.type !== Node.TEXT_NODE
          && serNodeInTree2.type !== FABLE_CUSTOM_NODE
          && serNodeInTree2.type !== Node.DOCUMENT_TYPE_NODE
          && serNodeInTree2.type !== Node.DOCUMENT_FRAGMENT_NODE
        ) {
          diffs.shouldReplaceNode = true;
          diffs.commonNodes = [];
          return diffs;
        }
        continue;
      }

      let textNode: SerNode | null = null;

      if (serNodeInTree2.type === Node.COMMENT_NODE && serNodeInTree2.props.textContent?.includes('textfid/')) {
        textNode = node2.serNode.chldrn[i + 1];
        i += 1;
      }

      diffs.addedNodes.push({
        addedNode: serNodeInTree2,
        nextFid: getFidOfSerNode(node2.serNode.chldrn[i + 1]),
        textNode,
        props: {
          partOfSvgEl: node2.props.partOfSvgEl || serNodeInTree2.name.toLowerCase() === 'svg' ? 1 : 0,
          shadowParent: null,
        }
      });
    } else {
      const serNodeInTree1 = mapOfTree1.get(currFid);

      // UPDATE diffs
      const updates = getSerNodesAttrUpdates(serNodeInTree1, serNodeInTree2);
      if (updates.length > 0) {
        diffs.updatedNodes.push({
          fid: currFid,
          updates,
        });
      }

      const shouldReplaceChildNode = areSerNodePropsDifferent(serNodeInTree1, serNodeInTree2);
      if (shouldReplaceChildNode) {
        diffs.replaceNodes.push({
          fid: currFid,
          serNode: serNodeInTree2,
          props: {
            partOfSvgEl: node2.props.partOfSvgEl || serNodeInTree2.name.toLowerCase() === 'svg' ? 1 : 0,
            shadowParent: null,
          }
        });
      }

      // COMMON nodes
      if (!shouldReplaceChildNode) {
        diffs.commonNodes.push({
          serNodeOfTree1: serNodeInTree1,
          serNodeOfTree2: serNodeInTree2,
        });
      }

      mapOfTree1.delete(currFid);
    }
  }

  // DELETE diffs
  diffs.deletedNodes = Array.from(mapOfTree1.entries()).map(([fid, serNode]) => {
    let isTextComment = false;
    if (serNode.type === Node.COMMENT_NODE && serNode.props.textContent?.includes('textfid/')) {
      isTextComment = true;
    }
    return {
      fid,
      isTextComment,
    };
  });

  return diffs;
};

function isFidRepeated(tree: SerNode): boolean {
  const map = new Map();

  for (const child of tree.chldrn) {
    if (child.attrs['f-id']) {
      if (map.has(child.attrs['f-id'])) {
        return true;
      }
      map.set(child.attrs['f-id'], true);
    }
  }

  return false;
}

function isSerNodeReordered(tree1: SerNode, tree2: SerNode): boolean {
  let tree1Fids: string[] = [];
  const tree2Fids: string[] = [];

  tree1.chldrn.forEach(serNode => {
    if (serNode.type === Node.ELEMENT_NODE || serNode.type === Node.COMMENT_NODE) {
      const fid = getFidOfSerNode(serNode);
      tree1Fids.push(fid);
    }
  });

  tree2.chldrn.forEach(serNode => {
    if (serNode.type === Node.ELEMENT_NODE || serNode.type === Node.COMMENT_NODE) {
      const fid = getFidOfSerNode(serNode);
      if (tree1Fids.includes(fid)) {
        tree2Fids.push(fid);
      }
    }
  });

  tree1Fids = tree1Fids.filter(fid => tree2Fids.includes(fid));

  for (let i = 0; i < tree1Fids.length; i++) {
    if (tree1Fids[i] !== tree2Fids[i]) {
      return true;
    }
  }

  return false;
}

export const getSerNodesAttrUpdates = (serNodeOfTree1: SerNode, serNodeOfTree2: SerNode): Update[] => {
  const updates: Update[] = [];
  const keysOfNode1 = Object.keys(serNodeOfTree1.attrs);
  const keysOfNode2 = Object.keys(serNodeOfTree2.attrs);

  let keys = removeDuplicatesOfStrArr([...keysOfNode1, ...keysOfNode2]);

  /**
     * Canvas src should be in props instead of attrs,
     * but instead it is in attrs.
     * We will check this in props & then replace the element with the new canvas
     * with new image data
     */
  if (serNodeOfTree1.name === 'canvas' && serNodeOfTree2.name === 'canvas') {
    keys = keys.filter(key => key !== 'src');
  }
  for (const key of keys) {
    if (serNodeOfTree1.attrs[key] !== serNodeOfTree2.attrs[key]) {
      updates.push({
        attrKey: key,
        attrOldVal: serNodeOfTree1.attrs[key] ?? '',
        attrNewVal: serNodeOfTree2.attrs[key] ?? '',
        shouldRemove: serNodeOfTree2.attrs[key] === undefined,
      });
    }
  }
  return updates;
};

export const areSerNodePropsDifferent = (serNodeOfTree1: SerNode, serNodeOfTree2: SerNode): boolean => {
  const keysOfNode1 = Object.keys(serNodeOfTree1.props);
  const keysOfNode2 = Object.keys(serNodeOfTree2.props);

  const keys = removeDuplicatesOfStrArr([...keysOfNode1, ...keysOfNode2]);

  if (serNodeOfTree1.name === 'canvas' && serNodeOfTree2.name === 'canvas') {
    if (serNodeOfTree1.attrs.src !== serNodeOfTree2.attrs.src) {
      return true;
    }
  }

  return !isDeepEqual(serNodeOfTree1.props, serNodeOfTree2.props);
};
