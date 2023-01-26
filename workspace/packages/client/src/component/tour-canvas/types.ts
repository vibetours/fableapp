export enum Mode {
  EmptyMode,
  SelectScreenMode,
  CanvasMode,
}

export enum CanvasMode {
  SelectMode,
  PanMode,
  ConnectMode,
  EmptyMode,
  SelectScreenMode,
  DragMode,
}

export type CanvasData = {
  isPanning: boolean;
  pointerOrigin: PointerOrigin;
  origViewBox: ViewBox;
  viewBox: ViewBox;
  newViewBox: ViewBox;
  ratio: number;
  panLimit: PanLimit;
};

export type PointerOrigin = {
  x: number;
  y: number;
};

export type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PanLimit = {
  XMIN: number;
  XMAX: number;
  YMIN: number;
  YMAX: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Line = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Screen = {
  id: string;
  screenId: number;
  screenRid: string;
  screenHref: string;
  annotationText: string;
  annotationId: string;
  x: number;
  y: number;
  height: number;
  width: number;
};

export type Connector = {
  from: string;
  to: string;
  points: Point[];
};

export type ElementCoords = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ConnectorData = {
  isDrawing: boolean;
  pointerOrigin: Point;
  line: Line;
  newLine: Line;
  isImageConnecting: boolean;
  start: EndPoint;
  end: EndPoint;
};

export type Conn = {
  from: EndPoint;
  to: EndPoint;
  points: Point[];
};

export type EndPoint = {
  element: number;
  relY: number;
  relX: number;
};
