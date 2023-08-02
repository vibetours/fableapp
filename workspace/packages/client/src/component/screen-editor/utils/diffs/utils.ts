/** *
 *
 * UTILS for diffs
 *
 */

import { SerNode } from '@fable/common/dist/types';

export const sortNumbersArr = (numbers: number[], order: 'asc' | 'desc'): number[] => {
  if (order === 'asc') {
    return numbers.sort((a, b) => a - b);
  }
  return numbers.sort((a, b) => b - a);
};

export function compareElPathsDesc(elPath1: string, elPath2: string): number {
  const parts1 = elPath1.split('.').map(Number);
  const parts2 = elPath2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = i < parts1.length ? parts1[i] : 0;
    const part2 = i < parts2.length ? parts2[i] : 0;

    if (part1 > part2) return -1;
    if (part1 < part2) return 1;
  }

  return 0;
}

export function compareElPathsAsc(elPath1: string, elPath2: string): number {
  const parts1 = elPath1.split('.').map(Number);
  const parts2 = elPath2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = i < parts1.length ? parts1[i] : 0;
    const part2 = i < parts2.length ? parts2[i] : 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

export function removeDuplicatesOfStrArr(arr: string[]): string[] {
  const obj: Record<string, boolean> = {};

  for (const el of arr) {
    obj[el] = true;
  }

  return Object.keys(obj);
}

export function getFidOfSerNode(node: SerNode): string {
  let fid: string;
  if (node.type === 8 && node.name === '#comment') {
    fid = node.props.textContent!.split('/')[1];
  } else {
    fid = node.attrs['f-id']!;
  }
  return fid;
}

export const isDeepEqual = (val1: any, val2: any): boolean => JSON.stringify(val1) === JSON.stringify(val2);

export const applyFadeInTransitionToNode = (node: Node): void => {
  if (node.nodeType === 1) {
    const element = node as HTMLElement;
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease-out';
    setTimeout(() => {
      element.style.opacity = '1';
    }, 300);
  }
};
