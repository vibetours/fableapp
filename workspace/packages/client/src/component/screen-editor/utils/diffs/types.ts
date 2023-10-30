import { SerNode } from '@fable/common/dist/types';

type Diff = {
    parentFid: string,
    parentElPath: string,
    parentSerNode: SerNode,
    isPartOfShadowHost: boolean,
}

export type DelDiff = Diff & {
    toBeDeletedNodes: ToBeDeletedNodes[];
}

export type ToBeDeletedNodes = {
    fid: string,
    idx: number,
    type: 'textcomment' | 'element',
}

export type SerNodeWithElPath = {
    node: SerNode,
    elPath: string,
}

export type SerNodeWithElPathAndIsSVG = {
    node: SerNode,
    elPath: string,
    isPartOfSVG: boolean,
}

export type SerNodeWithElPathAndIsShadow = {
    node: SerNode,
    elPath: string,
    isPartOfShadowHost: boolean,
}

export type SerNodeWithElPathAndIsSVGAndIsShadow = {
    node: SerNode,
    elPath: string,
    isPartOfSVG: boolean,
    isPartOfShadowHost: boolean,
}

export type AddDiff = Diff & {
    toBeAddedNodes: ToBeAddedNode[],
}

export type ToBeAddedNode = {
    fid: string,
    idx: number,
    type: 'textcomment' | 'element',
    isPartOfSVG: boolean,
}

export type UpdateDiff = Diff & {
    toBeUpdatedNodes: ToBeUpdatedNode[];
}

export type ToBeUpdatedNode = {
    fid: string,
    idx: number,
    updates: Update[]
}

export type Update = {
    attrKey: string,
    attrOldVal: string,
    attrNewVal: string,
}

export type ReplaceDiff = Diff & {
    toBeReplacedNodes: ToBeReplacedNode[];
}

export type ToBeReplacedNode = {
    fid: string,
    idx: number,
    replaceNodeIdx: number,
    isPartOfSVG: boolean,
}

export type ReorderDiff = Diff & {
    isPartOfSVG: boolean,
}

export type Prop = keyof SerNode['props']
