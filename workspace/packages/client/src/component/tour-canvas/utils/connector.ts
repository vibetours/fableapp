import {
  ElementCoords,
  ConnectorData,
  Point,
} from '../types';

function startConnecting(
  data: ConnectorData,
  elementData: ElementCoords,
  event: React.MouseEvent,
  svg: SVGGraphicsElement | null
): ConnectorData {
  const point = getSVGPoint(event.clientX, event.clientY, svg);

  return {
    ...data,
    isDrawing: true,
    pointerOrigin: {
      x: parseInt(`${point.x}`),
      y: parseInt(`${point.y - 10}`),
    },
    start: {
      ...data.start,
      relX: Math.abs(point.x - elementData.x),
      relY: Math.abs(point.y - elementData.y)
    }
  };
}

function updateConnecting(
  data: ConnectorData,
  event: React.MouseEvent,
  svg: SVGGraphicsElement | null
): ConnectorData {
  const { isDrawing, pointerOrigin } = data;

  if (!isDrawing) {
    return data;
  }

  event.preventDefault();

  const point = getSVGPoint(event.clientX, event.clientY, svg);

  return {
    ...data,
    newLine: {
      x1: pointerOrigin.x,
      y1: pointerOrigin.y,
      x2: parseInt(`${point.x}`),
      y2: parseInt(`${point.y - 10}`),
    },
  };
}

function stopConnecting(
  data: ConnectorData,
  elementData: ElementCoords,
  event: React.MouseEvent,
  svg: SVGGraphicsElement | null
): ConnectorData {
  const { pointerOrigin } = data;

  const point = getSVGPoint(event.clientX, event.clientY, svg);

  const line = {
    x1: pointerOrigin.x,
    y1: pointerOrigin.y,
    x2: parseInt(`${point.x}`),
    y2: parseInt(`${point.y - 10}`),
  };

  return {
    ...data,
    isDrawing: false,
    line: {
      ...line,
    },
    newLine: {
      ...line,
    },
    end: {
      ...data.end,
      relX: Math.abs(point.x - elementData.x),
      relY: Math.abs(point.y - elementData.y)
    }
  };
}

function getSVGPoint(x: number, y: number, svg: SVGGraphicsElement | null) {
  if (x && y && svg) {
    const pt = new DOMPoint(x, y);
    const cursorpt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    return { x: cursorpt.x, y: cursorpt.y };
  }

  return { x, y };
}

function formPathUsingPoints(points: Point[]) {
  let d = 'M ';
  points.forEach((point, index) => {
    if (index === 0) {
      d += Object.values(point).join(',');
    }
    d = `${d} L ${Object.values(point).join(',')}`;
  });
  return d;
}

function getStartingPoint(points: Point[]) {
  return points[0];
}

function getEndingPoint(points: Point[]) {
  return points[points.length - 1];
}

export {
  startConnecting,
  updateConnecting,
  stopConnecting,
  getSVGPoint,
  formPathUsingPoints,
  getStartingPoint,
  getEndingPoint,
};
