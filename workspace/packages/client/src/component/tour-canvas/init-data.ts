import { CanvasData } from './types';

export const initialConnectorData = {
  isDrawing: false,
  isImageConnecting: false,
  pointerOrigin: { x: 0, y: 0 },
  line: { x1: 0, y1: 0, x2: 0, y2: 0 },
  newLine: { x1: 0, y1: 0, x2: 0, y2: 0 },
  start: {
    element: -1,
    relX: -1,
    relY: -1,
  },
  end: {
    element: -1,
    relX: -1,
    relY: -1,
  }
};

export const initialData: CanvasData = {
  isPanning: false,
  pointerOrigin: { x: 0, y: 0 },
  viewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  origViewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  newViewBox: {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  ratio: 1,
  panLimit: { XMIN: -10, XMAX: 300, YMIN: 0, YMAX: window.innerHeight },
};

export const initialViewBoxStr: string = `0 0 ${window.innerWidth} ${window.innerHeight}`;

export const initialLine = {
  show: false,
  coords: {
    x1: 409,
    y1: 210,
    x2: 500,
    y2: 211,
  },
};
