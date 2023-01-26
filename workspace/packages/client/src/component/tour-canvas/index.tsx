import React, { useEffect, useRef, useState } from 'react';
import {
  AnnotationPerScreen,
} from '@fable/common/dist/types';
import * as Tags from './styled';
import { CanvasData, Connector, Screen } from './types';
import CanvasDottedBg from './canvas-dotted-bg';
import { P_RespScreen } from '../../entity-processor';
import EmptyCanvas from './empty-canvas';
import AddScreen from './add-screen';
import { formPathUsingPoints } from './utils';
import { formConnectors, formScreens } from './utils/arrangeEls';

type CanvasProps = {
  cellWidth: number;
  screens: P_RespScreen[];
  allAnnotationsForTour: AnnotationPerScreen[];
};

enum Mode {
  SelectMode,
  PanMode,
  ConnectMode,
  EmptyMode,
  SelectScreenMode,
  CanvasMode,
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

function Canvas({ cellWidth, screens, allAnnotationsForTour }: CanvasProps) {
  const canvasData = useRef({
    ...initialData,
  });

  const [viewBoxStr, setViewBoxStr] = useState(
    `0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`
  );
  const [mode, setMode] = useState(Mode.EmptyMode);
  const [screenElements, setScreenElements] = useState<Screen[]>();
  const [connectors, setConnectors] = useState<Connector[]>();
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

  useEffect(() => {
    const screenEls = formScreens(allAnnotationsForTour);
    if (screenEls.length > 0) {
      setScreenElements(screenEls);
      setMode(Mode.CanvasMode);
    } else {
      setMode(Mode.EmptyMode);
    }

    const conns = formConnectors(allAnnotationsForTour, screenEls);
    if (conns) {
      setConnectors(conns);
    }
  }, [allAnnotationsForTour]);

  return (
    <>
      <Tags.SVGCanvas viewBox={viewBoxStr} ref={svgRef} mode={mode}>
        <CanvasDottedBg canvasData={canvasData} cellWidth={cellWidth} />
        {
          mode === Mode.CanvasMode && <>
            {
              screenElements?.map(screenEl => <g key={screenEl.id}>
                <image
                  href={screenEl.screenHref}
                  x={screenEl.x}
                  y={screenEl.y}
                  width={screenEl.width}
                  height={screenEl.height}
                />
                <text x={screenEl.x} y={screenEl.y + screenEl.height}>{screenEl.annotationText}</text>
                                              </g>)
            }
            {
              connectors?.map(connector => {
                const d = formPathUsingPoints(connector.points);

                return (
                  <path
                    key={Math.random()}
                    fill="none"
                    strokeWidth="2px"
                    stroke="black"
                    markerEnd="url(#arrow)"
                    style={{ cursor: 'pointer' }}
                    d={d}
                  />
                );
              })
            }
                                      </>
        }
        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="10"
            refX="8"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="#000" />
          </marker>
        </defs>
      </Tags.SVGCanvas>
      {mode === Mode.EmptyMode && <EmptyCanvas setMode={setMode} />}
      {mode === Mode.SelectScreenMode && <AddScreen screens={screens} />}
    </>
  );
}

export default Canvas;
