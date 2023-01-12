import React, { useCallback, useEffect, useState } from "react";
import { CanvasData } from "./types";
import { formGrid } from "./utils";

type Props = {
  canvasData: { current: CanvasData };
  cellWidth: number;
};

const CanvasDottedBg = ({ canvasData, cellWidth = 20 }: Props) => {
  const [bgLines, setBgLines] = useState([{ x1: 0, y1: 0, x2: 0, y2: 0 }]);

  const drawBgLines = useCallback(() => {
    const { XMIN, XMAX, YMAX, YMIN } = canvasData.current.panLimit;
    setBgLines(formGrid(cellWidth, XMIN, XMAX, YMIN, YMAX));
  }, [canvasData, cellWidth]);

  useEffect(() => {
    drawBgLines();
  }, [drawBgLines]);

  return (
    <g>
      {bgLines.map((bgLine, i) => (
        <line
          key={i}
          x1={bgLine.x1}
          y1={bgLine.y1}
          x2={bgLine.x2}
          y2={bgLine.y2}
          stroke="lightgray"
          strokeDasharray={`2 ${cellWidth}`}
          strokeWidth="2"
        />
      ))}
    </g>
  );
};

export default CanvasDottedBg;
