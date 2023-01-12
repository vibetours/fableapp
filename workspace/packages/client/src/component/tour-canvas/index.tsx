import React, { useState, useRef, useEffect } from "react";
import * as Tags from "./styled";
import { CanvasData } from "./types";
import CanvasDottedBg from "./canvas-dotted-bg";

type CanvasProps = {
  cellWidth: number;
};

enum Mode {
  SelectMode,
  PanMode,
  ConnectMode,
}

const initialData: CanvasData = {
  isPanning: false,
  pointerOrigin: { x: 0, y: 0 },
  origViewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  viewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  newViewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  ratio: 1,
  panLimit: { XMIN: -10, XMAX: 300, YMIN: 0, YMAX: window.innerHeight },
};

const Canvas = ({ cellWidth }: CanvasProps) => {
  const canvasData = useRef({
    ...initialData,
  });

  const [viewBoxStr, setViewBoxStr] = useState(
    `0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`
  );
  const [mode, setMode] = useState(Mode.PanMode);
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current) {
      const svg: SVGAElement = svgRef.current;
      const pEl = svg.parentNode as HTMLElement;
      const parentRect = pEl.getBoundingClientRect();
      canvasData.current.origViewBox = {
        x: 0,
        y: 0,
        width: parentRect.width,
        height: parentRect.height,
      };
      setViewBoxStr(`0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`);
      const ratio = canvasData.current.viewBox.width / svg.getBoundingClientRect().width;
      canvasData.current.ratio = ratio;

      window.addEventListener("resize", function () {
        canvasData.current.ratio = ratio;
        setViewBoxStr(`0 0 ${parentRect.width} ${parentRect.height}`);
      });
    }
  }, [cellWidth]);

  return (
    <>
      <Tags.SVGCanvas viewBox={viewBoxStr} ref={svgRef} mode={mode}>
        <CanvasDottedBg canvasData={canvasData} cellWidth={cellWidth} />
      </Tags.SVGCanvas>
    </>
  );
};

export default Canvas;
