import { GraphEdge } from 'dagre';
import { IAnnotationConfigWithScreen } from '../../types';

export interface AnnotationNode<T> extends CanvasNode {
  imageUrl: string;
  screenTitle: string;
  grp: string;
  localIdx: number;
  text?: string;
  id: string;
  storedData?: T;
  annotation: IAnnotationConfigWithScreen;
}

export interface Box extends CanvasNode {
  cx: number;
  cy: number;
}

export interface EdgeWithData extends GraphEdge {
  srcId: string;
  destId: string;
}

export interface CanvasNode {
  x: number;
  y: number;
  height: number;
  width: number;
}

export type Point = {
  x: number;
  y: number;
};

export interface CanvasGrid {
  gridSize: number;
  gridDotSize: number;
  initial: {
    tx: number;
    ty: number;
    scale: number;
  }
}

export type LRPostion = 'l' | 'r';

export type ModalPosition = [number| null, number | null, LRPostion];

export type AnnAddScreenModal = {
  position: ModalPosition,
  annId: string,
  annotationPosition: AnnotationPosition,
  screenAnnotation: IAnnotationConfigWithScreen | null
}

export type AnnotationPosition = 'prev' | 'next';

export type Edge = [srcId: string, destId: string];
