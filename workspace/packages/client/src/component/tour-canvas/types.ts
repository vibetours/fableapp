import { GraphEdge } from 'dagre';

export interface AnnotationNode<T> extends CanvasNode {
  imageUrl: string;
  screenTitle: string;
  text?: string;
  id: string;
  storedData?: T;
  type: 'screen' | 'annotation';
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
