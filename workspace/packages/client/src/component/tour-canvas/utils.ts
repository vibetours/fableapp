export function roundToNearest(numToRound: number, numToRoundTo: number): number {
  return Math.round(numToRound / numToRoundTo) * numToRoundTo;
}

export function formGrid(cellWidth: number, XMIN: number, XMAX: number, YMIN: number, YMAX: number) {
  const lines = [];

  const x1 = roundToNearest(XMIN, cellWidth),
    x2 = roundToNearest(XMAX * 3, cellWidth);

  for (let i = roundToNearest(YMIN, cellWidth); i < roundToNearest(YMAX, 20); i = i + cellWidth) {
    lines.push({ x1, y1: i, x2, y2: i });
  }

  return lines;
}

export function adjustElementsWithGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  cellWidth: number,
  XMIN: number
) {
  const numDotsX = (x - XMIN) / cellWidth;
  const numDotsWidth = width / cellWidth;

  const adjustedX = roundToNearest(x, cellWidth) + Math.round(numDotsX);
  const adjustedWidth = roundToNearest(width, cellWidth) + Math.round(numDotsWidth);
  const adjustedY = roundToNearest(y, cellWidth);
  const adjustedHeight = roundToNearest(height, cellWidth);

  return { adjustedX, adjustedY, adjustedWidth, adjustedHeight };
}
