import { getSVGPoint } from '../utils';

export function zoom(svgElement: SVGSVGElement, event: WheelEvent) {
  const viewBox = svgElement.viewBox.baseVal;

  const { x, y } = getSVGPoint(event.clientX, event.clientY, svgElement);

  const cursorPos = {
    x,
    y,
  };

  const zoomLevel = event.deltaY > 0 ? 0.9 : 1.1;

  const newViewBox = {
    x: viewBox.x + (cursorPos.x - viewBox.x) * (1 - zoomLevel),
    y: viewBox.y + (cursorPos.y - viewBox.y) * (1 - zoomLevel),
    width: viewBox.width * zoomLevel,
    height: viewBox.height * zoomLevel,
  };

  svgElement.style.transitionDuration = `${1000}ms`;

  return newViewBox;
}
