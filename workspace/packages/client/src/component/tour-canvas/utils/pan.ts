import { CanvasData, Point } from '../types';

function startPan(data: CanvasData, event: React.MouseEvent): CanvasData {
  return {
    ...data,
    isPanning: true,
    pointerOrigin: { ...getPointFromEvent(event) },
  };
}

function updatePan(data: CanvasData, event: React.MouseEvent): CanvasData {
  const {
    isPanning,
    pointerOrigin,
    newViewBox,
    viewBox,
    ratio,
    panLimit: { XMIN, XMAX },
  } = data;

  if (!isPanning) {
    return data;
  }

  if (viewBox.x > XMAX) {
    return {
      ...data,
      isPanning: false,
      viewBox: { ...viewBox, x: XMAX },
      newViewBox: { ...newViewBox, x: XMAX },
    };
  }

  if (viewBox.x < XMIN) {
    return {
      ...data,
      isPanning: false,
      viewBox: { ...viewBox, x: XMIN },
      newViewBox: { ...newViewBox, x: XMIN },
    };
  }

  event.preventDefault();

  const pointerPosition = getPointFromEvent(event);

  const newX = viewBox.x - (pointerPosition.x - pointerOrigin.x) * ratio;
  const newY = viewBox.y - (pointerPosition.y - pointerOrigin.y) * ratio;

  return {
    ...data,
    newViewBox: {
      ...newViewBox,
      x: newX,
      y: newY,
    },
  };
}

function stopPan(data: CanvasData): CanvasData {
  const {
    viewBox,
    newViewBox,
    panLimit: { XMIN, XMAX },
  } = data;

  if (viewBox.x > XMAX) {
    return {
      ...data,
      isPanning: false,
      viewBox: { ...viewBox, x: XMAX },
      newViewBox: { ...newViewBox, x: XMAX },
    };
  }

  if (viewBox.x < XMIN) {
    return {
      ...data,
      isPanning: false,
      viewBox: { ...viewBox, x: XMIN },
      newViewBox: { ...newViewBox, x: XMIN },
    };
  }

  return {
    ...data,
    isPanning: false,
    viewBox: {
      ...viewBox,
      x: newViewBox.x,
      y: 0,
    },
  };
}

function pan(
  data: CanvasData,
  direction: number,
  axis: string,
  offset: number
): CanvasData {
  const {
    viewBox,
    panLimit: { XMIN, XMAX, YMIN, YMAX },
  } = data;

  if (axis === 'X') {
    if (
      (direction === 1 && viewBox.x > XMAX)
      || (direction === -1 && viewBox.x < XMIN)
    ) {
      return data;
    }

    viewBox.x += offset * direction;
  }
  if (axis === 'Y') {
    if (
      (direction === 1 && viewBox.y > YMAX)
      || (direction === -1 && viewBox.y < YMIN)
    ) {
      return data;
    }
    viewBox.y += offset * direction;
  }

  return {
    ...data,
    viewBox: { ...viewBox, y: 0 },
    newViewBox: { ...viewBox, y: 0 },
  };
}

function getPointFromEvent(event: React.MouseEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

export { pan, startPan, updatePan, stopPan };
