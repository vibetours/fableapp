import { SerNode } from '@fable/common/dist/types';
import {
  AddDiff,
  DelDiff, Prop, ReorderDiff, ReplaceDiff,
  SerNodeWithElPathAndIsSVGAndIsShadow,
  SerNodeWithElPathAndIsShadow,
  ToBeAddedNode, ToBeDeletedNodes, ToBeReplacedNode, ToBeUpdatedNode,
  Update, UpdateDiff
} from './types';
import {
  compareElPathsAsc,
  compareElPathsDesc, getFidOfSerNode,
  isDeepEqual,
  removeDuplicatesOfStrArr
} from './utils';

export const getDelDiffs = (tree1: SerNode, tree2: SerNode): DelDiff[] => {
  let delDiffs: DelDiff[] = [];

  const queue: [SerNodeWithElPathAndIsShadow, SerNodeWithElPathAndIsShadow][] = [];
  queue.push([
    {
      node: tree1,
      elPath: '1',
      isPartOfShadowHost: tree1.props.isShadowHost || false,
    },
    {
      node: tree2,
      elPath: '1',
      isPartOfShadowHost: tree2.props.isShadowHost || false,
    }]);

  while (queue.length > 0) {
    const currTree = queue.shift()!;

    const {
      node: node1,
      elPath: elPathofNode1,
      isPartOfShadowHost: isNode1PartOfShadow,
    } = currTree[0];
    const {
      node: node2,
      elPath: elPathofNode2,
      isPartOfShadowHost: isNode2PartOfShadow,
    } = currTree[1];

    const node1Chldrn = node1.chldrn;
    const node2Chldrn = node2.chldrn;

    let toBeDeletedNodes: ToBeDeletedNodes[] = [];

    const commonEls: [SerNodeWithElPathAndIsShadow, SerNodeWithElPathAndIsShadow][] = [];

    node1Chldrn.forEach((childOfNode1, childOfNode1Idx) => {
      /**
       * We identify a text node, by the comment tag inserted before it, with the textfid,
       * thus, we won't check the text elements here, instead check with the help of the textfid comment
       */
      if (childOfNode1.type !== Node.TEXT_NODE || childOfNode1.name !== '#text') {
        const fid = getFidOfSerNode(childOfNode1);

        const nodeWithSameFidInOtherTree = node2Chldrn.find((el) => {
          if (el.type === Node.TEXT_NODE) {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        const nodeWithSameFidInOtherTreeIdx = node2Chldrn.findIndex((el) => {
          if (el.type === Node.TEXT_NODE) {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        if (nodeWithSameFidInOtherTree) {
          const newPathOfNode1 = `${elPathofNode1}.${childOfNode1Idx}`;
          const newPathOfNode2 = `${elPathofNode2}.${nodeWithSameFidInOtherTreeIdx}`;
          commonEls.push([
            {
              node: childOfNode1,
              elPath: newPathOfNode1,
              isPartOfShadowHost: node1.props.isShadowHost || childOfNode1.props.isShadowHost || false,
            },
            {
              node: nodeWithSameFidInOtherTree,
              elPath: `${elPathofNode2}.${nodeWithSameFidInOtherTreeIdx}`,
              isPartOfShadowHost: node2.props.isShadowHost || nodeWithSameFidInOtherTree.props.isShadowHost || false,
            },
          ]);
        } else {
          const isChildNodeTextComemnt = childOfNode1.type === Node.COMMENT_NODE
            && childOfNode1.props.textContent?.includes('textfid/');

          toBeDeletedNodes.push({
            fid,
            idx: childOfNode1Idx,
            type: isChildNodeTextComemnt ? 'textcomment' : 'element',
          });
        }
      }
    });

    if (toBeDeletedNodes.length > 0) {
      toBeDeletedNodes = toBeDeletedNodes.sort((a, b) => b.idx - a.idx);
      delDiffs.push({
        parentFid: node1.attrs['f-id'] || '',
        parentElPath: elPathofNode1,
        parentSerNode: node2,
        isPartOfShadowHost: isNode1PartOfShadow || node1.props.isShadowHost || false,
        toBeDeletedNodes,
      });
    }

    for (let i = 0; i < commonEls.length; i++) {
      queue.push([
        commonEls[i][0],
        commonEls[i][1],
      ]);
    }
  }

  delDiffs = delDiffs.sort((a, b) => compareElPathsDesc(a.parentElPath, b.parentElPath));

  return delDiffs;
};

export const getAddDiffs = (tree1: SerNode, tree2: SerNode): AddDiff[] => {
  let addDiffs: AddDiff[] = [];

  const queue: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];
  queue.push([
    {
      node: tree1,
      elPath: '1',
      isPartOfSVG: tree1.name === 'svg',
      isPartOfShadowHost: tree1.props.isShadowHost || false,
    },
    {
      node: tree2,
      elPath: '1',
      isPartOfSVG: tree2.name === 'svg',
      isPartOfShadowHost: tree1.props.isShadowHost || false,
    }
  ]);

  while (queue.length > 0) {
    const currTree = queue.shift()!;

    const {
      node: node1,
      elPath: elPathofNode1,
      isPartOfSVG: isNode1PartOfSvg,
      isPartOfShadowHost: isNode1PartOfShadow,
    } = currTree[0];
    const {
      node: node2,
      elPath: elPathofNode2,
      isPartOfSVG: isNode2PartOfSvg,
      isPartOfShadowHost: isNode2PartOfShadow,
    } = currTree[1];

    const node1Chldrn = node1.chldrn;
    const node2Chldrn = node2.chldrn;

    let toBeAddedNodes: ToBeAddedNode[] = [];

    const commonEls: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];

    node2Chldrn.forEach((childOfNode2, childOfNode2Idx) => {
      /**
       * We identify a text node, by the comment tag inserted before it, with the textfid,
       * thus, we won't check the text elements here, instead check with the help of the textfid comment,
       * while going through any comment, we will check if it is a text fid comment,
       * if it is, then we will also pass the flad to the toBeAddedNode
       * using this flag, the text node, will then be added in addDiffToDOM
       */
      if (childOfNode2.name !== '#text') {
        const fid = getFidOfSerNode(childOfNode2);

        const nodeWithSameFidInFirstTree = node1Chldrn.find((el) => {
          if (el.type === Node.TEXT_NODE || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        const nodeWithSameFidInFirstTreeIdx = node1Chldrn.findIndex((el) => {
          if (el.type === Node.TEXT_NODE || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        if (nodeWithSameFidInFirstTree) {
          const newPathOfNode1 = `${elPathofNode1}.${nodeWithSameFidInFirstTreeIdx}`;
          const newPathOfNode2 = `${elPathofNode2}.${childOfNode2Idx}`;
          commonEls.push([
            {
              node: nodeWithSameFidInFirstTree,
              elPath: newPathOfNode1,
              isPartOfSVG: isNode1PartOfSvg || nodeWithSameFidInFirstTree.name === 'svg',
              isPartOfShadowHost: isNode1PartOfShadow || nodeWithSameFidInFirstTree.props.isShadowHost || false,
            },
            {
              node: childOfNode2,
              elPath: newPathOfNode2,
              isPartOfSVG: isNode2PartOfSvg || childOfNode2.name === 'svg',
              isPartOfShadowHost: isNode2PartOfShadow || childOfNode2.props.isShadowHost || false,
            }
          ]);
        } else {
          const isChildNodeTextComemnt = childOfNode2.type === Node.COMMENT_NODE
            && childOfNode2.props.textContent?.includes('textfid/');

          toBeAddedNodes.push({
            fid,
            idx: childOfNode2Idx,
            type: isChildNodeTextComemnt ? 'textcomment' : 'element',
            isPartOfSVG: isNode2PartOfSvg || childOfNode2.name === 'svg',
          });
        }
      }
    });

    if (toBeAddedNodes.length > 0) {
      toBeAddedNodes = toBeAddedNodes.sort((a, b) => a.idx - b.idx);
      addDiffs.push({
        parentFid: node2.attrs['f-id'] || '',
        parentElPath: elPathofNode2,
        parentSerNode: node2,
        isPartOfShadowHost: isNode2PartOfShadow || node2.props.isShadowHost || false,
        toBeAddedNodes,
      });
    }

    for (let i = 0; i < commonEls.length; i++) {
      queue.push([
        commonEls[i][0],
        commonEls[i][1],
      ]);
    }
  }

  addDiffs = addDiffs.sort((a, b) => compareElPathsAsc(a.parentElPath, b.parentElPath));

  return addDiffs;
};

export const getUpdateDiffs = (tree1: SerNode, tree2: SerNode): UpdateDiff[] => {
  let updateDiffs: UpdateDiff[] = [];

  const queue: [SerNodeWithElPathAndIsShadow, SerNodeWithElPathAndIsShadow][] = [];
  queue.push([
    {
      node: { name: 'root', type: -1, props: {}, attrs: {}, chldrn: [tree1] },
      elPath: '-1',
      isPartOfShadowHost: false,
    },
    {
      node: { name: 'root', type: -1, props: {}, attrs: {}, chldrn: [tree2] },
      elPath: '-1',
      isPartOfShadowHost: false,
    }]);

  while (queue.length > 0) {
    const currTree = queue.shift()!;

    const {
      node: node1,
      elPath: elPathofNode1,
      isPartOfShadowHost: isNode1PartOfShadow,
    } = currTree[0];
    const {
      node: node2,
      elPath: elPathofNode2,
      isPartOfShadowHost:
      isNode2PartOfShadow,
    } = currTree[1];

    const node1Chldrn = node1.chldrn;
    const node2Chldrn = node2.chldrn;

    let toBeUpdatedNodes: ToBeUpdatedNode[] = [];

    const commonEls: [SerNodeWithElPathAndIsShadow, SerNodeWithElPathAndIsShadow][] = [];

    node1Chldrn.forEach((childOfNode1, childOfNode1Idx) => {
      /**
       * We can't set attributes to comment nodes & text nodes,
       * For nodes which are elements, but have node type has 8 coz of the isHidden props,
       * those, will directly get replaced if the isHidden is back to true again,
       * that's why we don't need to check it here nor will be the dom manipulation work here
       * (setAttribute doesn't work for text and comment nodes)
       */
      if ((childOfNode1.type !== Node.TEXT_NODE && childOfNode1.type !== Node.COMMENT_NODE)
      || childOfNode1.name !== '#text') {
        const fid = getFidOfSerNode(childOfNode1);

        const nodeWithSameFidInOtherTree = node2Chldrn.find((el) => {
          if (el.type === Node.TEXT_NODE || el.type === Node.COMMENT_NODE || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        const nodeWithSameFidInOtherTreeIdx = node2Chldrn.findIndex((el) => {
          if (el.type === Node.TEXT_NODE || el.type === Node.COMMENT_NODE || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        if (nodeWithSameFidInOtherTree) {
          const updates: Update[] = [];

          const keysOfNode1 = Object.keys(childOfNode1.attrs);
          const keysOfNode2 = Object.keys(nodeWithSameFidInOtherTree.attrs);

          let keys = removeDuplicatesOfStrArr([...keysOfNode1, ...keysOfNode2]);

          /**
           * Canvas src should be in props instead of attrs,
           * but instead it is in attrs.
           * We will check this in props & then replace the element with the new canvas
           * with new image dats
           */
          if (childOfNode1.name === 'canvas' && nodeWithSameFidInOtherTree.name === 'canvas') {
            keys = keys.filter(key => key !== 'src');
          }

          for (const key of keys) {
            if (childOfNode1.attrs[key] !== nodeWithSameFidInOtherTree.attrs[key]) {
              updates.push({
                attrKey: key,
                attrOldVal: childOfNode1.attrs[key] ?? '',
                attrNewVal: nodeWithSameFidInOtherTree.attrs[key] ?? '',
              });
            }
          }

          if (updates.length > 0) {
            toBeUpdatedNodes.push({
              fid,
              idx: childOfNode1Idx,
              updates,
            });
          }

          const newPathOfNode1 = elPathofNode1 === '-1' ? '1' : `${elPathofNode1}.${childOfNode1Idx}`;
          const newPathOfNode2 = elPathofNode2 === '-1' ? '1' : `${elPathofNode2}.${nodeWithSameFidInOtherTreeIdx}`;
          commonEls.push([
            {
              node: childOfNode1,
              elPath: newPathOfNode1,
              isPartOfShadowHost: isNode1PartOfShadow || childOfNode1.props.isShadowHost || false,
            },
            {
              node: nodeWithSameFidInOtherTree,
              elPath: newPathOfNode2,
              isPartOfShadowHost: isNode2PartOfShadow || nodeWithSameFidInOtherTree.props.isShadowHost || false,
            },
          ]);
        }
      }
    });

    if (toBeUpdatedNodes.length > 0) {
      toBeUpdatedNodes = toBeUpdatedNodes.sort((a, b) => b.idx - a.idx);
      updateDiffs.push({
        parentFid: node1.attrs['f-id'] || '',
        parentElPath: elPathofNode1,
        parentSerNode: node2,
        isPartOfShadowHost: isNode1PartOfShadow || node1.props.isShadowHost || false,
        toBeUpdatedNodes,
      });
    }

    for (let i = 0; i < commonEls.length; i++) {
      queue.push([
        commonEls[i][0],
        commonEls[i][1],
      ]);
    }
  }

  updateDiffs = updateDiffs.sort((a, b) => compareElPathsDesc(a.parentElPath, b.parentElPath));

  return updateDiffs;
};

/**
 * We check the props in here,
 * if props are different, we replace the elements,
 */
export const getReplaceDiffs = (tree1: SerNode, tree2: SerNode): ReplaceDiff[] => {
  let replaceDiffs: ReplaceDiff[] = [];

  const queue: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];

  queue.push([
    {
      node: { name: 'root', type: -1, props: {}, attrs: {}, chldrn: [tree1] },
      elPath: '-1',
      isPartOfShadowHost: false,
      isPartOfSVG: false,
    },
    {
      node: { name: 'root', type: -1, props: {}, attrs: {}, chldrn: [tree2] },
      elPath: '-1',
      isPartOfShadowHost: false,
      isPartOfSVG: false,
    }]);

  while (queue.length > 0) {
    const currTree = queue.shift()!;

    const {
      node: node1,
      elPath: elPathofNode1,
      isPartOfSVG: isNode1PartOfSvg,
      isPartOfShadowHost: isNode1PartOfShadow,
    } = currTree[0];
    const {
      node: node2,
      elPath: elPathofNode2,
      isPartOfSVG: isNode2PartOfSvg,
      isPartOfShadowHost: isNode2PartOfShadow,
    } = currTree[1];

    const node1Chldrn = node1.chldrn;
    const node2Chldrn = node2.chldrn;

    let toBeReplacedNodes: ToBeReplacedNode[] = [];

    const commonEls: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];

    node1Chldrn.forEach((childOfNode1, childOfNode1Idx) => {
      /*
       * Comment nodes which don't have isPropsHidden are true comment nodes, thus identified by name
       * Text nodes and comment nodes in any 2 serdoms won't have the same fids
       * they are first deleted from the dom, and then added again
       * Thus, we don't need to check these elements for replace diffs
       */
      if (childOfNode1.type !== Node.TEXT_NODE || childOfNode1.name !== '#comment') {
        const fid = getFidOfSerNode(childOfNode1);

        const nodeWithSameFidInOtherTree = node2Chldrn.find((el) => {
          if (el.name === '#comment') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        const nodeWithSameFidInOtherTreeIdx = node2Chldrn.findIndex((el) => {
          if (el.name === '#comment') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        if (nodeWithSameFidInOtherTree) {
          const keysOfNode1 = Object.keys(childOfNode1.props) as Array<Prop>;
          const keysOfNode2 = Object.keys(nodeWithSameFidInOtherTree.props) as Array<Prop>;

          const keys: Array<Prop> = removeDuplicatesOfStrArr([...keysOfNode1, ...keysOfNode2]) as Array<Prop>;

          let isPropsDiff = false;
          for (const key of keys) {
            const val1 = childOfNode1.props[key];
            const val2 = nodeWithSameFidInOtherTree.props[key]!;
            if (!isDeepEqual(val1, val2)) {
              isPropsDiff = true;
            }
          }
          /**
           * Canvas src should be in props instead of attrs,
           * but instead it is in attrs.
           * We will check this in props & then replace the element with the new canvas
           * with new image data
           */
          if ((childOfNode1.name === 'canvas' && nodeWithSameFidInOtherTree.name === 'canvas')
            && (childOfNode1.attrs.src !== nodeWithSameFidInOtherTree.attrs.src)) {
            isPropsDiff = true;
          }

          if (isPropsDiff) {
            toBeReplacedNodes.push({
              fid,
              idx: childOfNode1Idx,
              replaceNodeIdx: nodeWithSameFidInOtherTreeIdx,
              isPartOfSVG: isNode2PartOfSvg || nodeWithSameFidInOtherTree.name === 'svg',
            });
          }

          if (nodeWithSameFidInOtherTree.name.toLowerCase() === 'style') {
            toBeReplacedNodes.push({
              fid,
              idx: childOfNode1Idx,
              replaceNodeIdx: nodeWithSameFidInOtherTreeIdx,
              isPartOfSVG: isNode2PartOfSvg || nodeWithSameFidInOtherTree.name === 'svg',
            });
          }

          if (!isPropsDiff) {
            const newPathOfNode1 = elPathofNode1 === '-1' ? '1' : `${elPathofNode1}.${childOfNode1Idx}`;
            const newPathOfNode2 = elPathofNode1 === '-1' ? '1' : `${elPathofNode2}.${nodeWithSameFidInOtherTreeIdx}`;

            commonEls.push([
              {
                node: childOfNode1,
                elPath: newPathOfNode1,
                isPartOfSVG: isNode1PartOfSvg || childOfNode1.name === 'svg',
                isPartOfShadowHost: isNode1PartOfShadow || childOfNode1.props.isShadowHost || false,
              },
              {
                node: nodeWithSameFidInOtherTree,
                elPath: newPathOfNode2,
                isPartOfSVG: isNode2PartOfSvg || nodeWithSameFidInOtherTree.name === 'svg',
                isPartOfShadowHost: isNode2PartOfShadow || nodeWithSameFidInOtherTree.props.isShadowHost || false,
              },
            ]);
          }
        }
      }
    });

    if (toBeReplacedNodes.length > 0) {
      toBeReplacedNodes = toBeReplacedNodes.sort((a, b) => b.idx - a.idx);

      replaceDiffs.push({
        parentFid: node1.attrs['f-id'] || '',
        parentElPath: elPathofNode1,
        parentSerNode: node2,
        isPartOfShadowHost: isNode1PartOfShadow || node1.props.isShadowHost || false,
        toBeReplacedNodes,
      });
    }

    for (let i = 0; i < commonEls.length; i++) {
      queue.push([
        commonEls[i][0],
        commonEls[i][1],
      ]);
    }
  }

  replaceDiffs = replaceDiffs.sort((a, b) => compareElPathsAsc(a.parentElPath, b.parentElPath));

  return replaceDiffs;
};

export const getReorderDiffs = (tree1: SerNode, tree2: SerNode): ReorderDiff[] => {
  let reorderDiffs: ReorderDiff[] = [];

  const queue: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];
  queue.push([
    {
      node: tree1,
      elPath: '1',
      isPartOfShadowHost: tree1.props.isShadowHost || false,
      isPartOfSVG: false,
    },
    {
      node: tree2,
      elPath: '1',
      isPartOfShadowHost:
      tree2.props.isShadowHost || false,
      isPartOfSVG: false,
    }]);

  while (queue.length > 0) {
    const currTree = queue.shift()!;

    const {
      node: node1,
      elPath: elPathofNode1,
      isPartOfShadowHost: isNode1PartOfShadow,
      isPartOfSVG: isNode1PartOfSvg,
    } = currTree[0];
    const {
      node: node2,
      elPath: elPathofNode2,
      isPartOfShadowHost: isNode2PartOfShadow,
      isPartOfSVG: isNode2PartOfSvg,
    } = currTree[1];

    const node1Chldrn = node1.chldrn;
    const node2Chldrn = node2.chldrn;

    let hasDifferentOrder = false;

    if (node1Chldrn.length !== node2Chldrn.length) {
      hasDifferentOrder = true;
    } else {
      for (let i = 0; i < node1Chldrn.length; i++) {
        if (node1Chldrn[i].attrs['f-id'] !== node2Chldrn[i].attrs['f-id']) {
          hasDifferentOrder = true;
        }
      }
    }
    const commonEls: [SerNodeWithElPathAndIsSVGAndIsShadow, SerNodeWithElPathAndIsSVGAndIsShadow][] = [];

    node1Chldrn.forEach((childOfNode1, childOfNode1Idx) => {
      if (childOfNode1.type !== Node.TEXT_NODE || (childOfNode1.name !== '#comment' && childOfNode1.name !== '#text')) {
        const fid = getFidOfSerNode(childOfNode1);

        const nodeWithSameFidInOtherTree = node2Chldrn.find((el) => {
          if (el.type === Node.TEXT_NODE || el.name === '#comment' || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        const nodeWithSameFidInOtherTreeIdx = node2Chldrn.findIndex((el) => {
          if (el.type === Node.TEXT_NODE || el.name === '#comment' || el.name === '#text') {
            return false;
          }
          const elFid = getFidOfSerNode(el);
          return elFid === fid && fid !== '';
        });

        if (nodeWithSameFidInOtherTree) {
          const newPathOfNode1 = `${elPathofNode1}.${childOfNode1Idx}`;
          const newPathOfNode2 = `${elPathofNode2}.${nodeWithSameFidInOtherTreeIdx}`;
          commonEls.push([
            {
              node: childOfNode1,
              elPath: newPathOfNode1,
              isPartOfShadowHost: isNode1PartOfShadow || childOfNode1.props.isShadowHost || false,
              isPartOfSVG: isNode1PartOfSvg || childOfNode1.name === 'svg',
            },
            {
              node: nodeWithSameFidInOtherTree,
              elPath: newPathOfNode2,
              isPartOfShadowHost: isNode2PartOfShadow || nodeWithSameFidInOtherTree.props.isShadowHost || false,
              isPartOfSVG: isNode2PartOfSvg || nodeWithSameFidInOtherTree.name === 'svg',
            },
          ]);
        }
      }
    });

    if (hasDifferentOrder) {
      reorderDiffs.push({
        parentFid: node1.attrs['f-id'] || '',
        parentElPath: elPathofNode1,
        parentSerNode: node1,
        isPartOfShadowHost: isNode1PartOfShadow || node1.props.isShadowHost || false,
        isPartOfSVG: isNode1PartOfSvg || false,
      });
    } else {
      for (let i = 0; i < commonEls.length; i++) {
        queue.push([
          commonEls[i][0],
          commonEls[i][1],
        ]);
      }
    }
  }

  reorderDiffs = reorderDiffs.sort((a, b) => compareElPathsAsc(a.parentElPath, b.parentElPath));

  return reorderDiffs;
};
