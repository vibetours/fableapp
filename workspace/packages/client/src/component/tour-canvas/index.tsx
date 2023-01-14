import React, { useEffect, useRef, useState } from 'react';
import * as Tags from './styled';
import { CanvasData } from './types';
import CanvasDottedBg from './canvas-dotted-bg';
import { P_RespScreen } from '../../entity-processor';
import EmptyCanvas from './empty-canvas';
import AddScreen from './add-screen';

type CanvasProps = {
  cellWidth: number;
  screens: P_RespScreen[];
};

enum Mode {
  SelectMode,
  PanMode,
  ConnectMode,
  EmptyMode,
  SelectScreenMode,
}

const initialData: CanvasData = {
  isPanning: false,
  pointerOrigin: { x: 0, y: 0 },
  origViewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  viewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  newViewBox: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
  ratio: 1,
  panLimit: { XMIN: 0, XMAX: window.innerWidth, YMIN: 10, YMAX: window.innerHeight },
};

function Canvas({ cellWidth, screens }: CanvasProps) {
  const canvasData = useRef({
    ...initialData,
  });

  const [viewBoxStr, setViewBoxStr] = useState(
    `0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`
  );
  const [mode, setMode] = useState(Mode.EmptyMode);
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
      canvasData.current.panLimit = {
        ...canvasData.current.panLimit,
        XMAX: parentRect.width,
        YMAX: parentRect.height,
      };
      setViewBoxStr(`0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`);
      const ratio = canvasData.current.viewBox.width / svg.getBoundingClientRect().width;
      canvasData.current.ratio = ratio;

      window.addEventListener('resize', () => {
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
      {mode === Mode.EmptyMode && <EmptyCanvas setMode={setMode} />}
      {mode === Mode.SelectScreenMode && <AddScreen screens={screens} />}
    </>
  );
}

export default Canvas;
