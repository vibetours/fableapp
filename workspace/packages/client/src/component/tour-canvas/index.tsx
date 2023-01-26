import React, { useEffect, useRef, useState } from 'react';
import {
  AnnotationPerScreen,
} from '@fable/common/dist/types';
import { ArrowsAltOutlined, DragOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { CanvasData, CanvasMode, Conn, Connector, Screen } from './types';
import CanvasDottedBg from './canvas-dotted-bg';
import { P_RespScreen } from '../../entity-processor';
import EmptyCanvas from './empty-canvas';
import AddScreen from './add-screen';
import { formPathUsingPoints } from './utils';
import { formConnectors, formScreens } from './utils/arrangeEls';
import { startPan, stopPan, updatePan } from './utils/pan';
import { zoom } from './utils/zoom';

type CanvasProps = {
  cellWidth: number;
  screens: P_RespScreen[];
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: Function;
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

function Canvas({ cellWidth, screens, allAnnotationsForTour, navigate }: CanvasProps) {
  const canvasData = useRef({
    ...initialData,
  });

  const [viewBoxStr, setViewBoxStr] = useState(
    `0 0 ${canvasData.current.origViewBox.width} ${canvasData.current.origViewBox.height}`
  );
  const [mode, setMode] = useState(Mode.EmptyMode);
  const [screenElements, setScreenElements] = useState<Screen[]>();
  const [connectors, setConnectors] = useState<Conn[]>();
  const svgRef = useRef(null);
  const [canvasMode, setCanvasMode] = useState(CanvasMode.PanMode);

  const startPanning = (event: React.MouseEvent) => {
    canvasData.current = startPan(canvasData.current, event);
  };

  const updatePanning = (event: React.MouseEvent) => {
    if (canvasData.current.isPanning) {
      canvasData.current = updatePan(canvasData.current, event);
      const viewBoxString = Object.values(canvasData.current.newViewBox).join(
        ' '
      );
      setViewBoxStr(viewBoxString);
    }
  };

  const stopPanning = () => {
    canvasData.current = stopPan(canvasData.current);
  };

  const handleMouseStart = (event: React.MouseEvent) => {
    if (canvasMode === CanvasMode.PanMode) {
      startPanning(event);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (canvasMode === CanvasMode.PanMode) {
      updatePanning(event);
    }
  };

  const handleMouseEnd = () => {
    if (canvasMode === CanvasMode.PanMode) {
      stopPanning();
    }
  };

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

  useEffect(() => {
    const svgElementVal = svgRef.current;

    if (svgElementVal) {
      const svgElement = svgElementVal as SVGSVGElement;

      const zoomSVG = (event: WheelEvent) => {
        event.preventDefault();
        const { x, y, width, height } = zoom(svgElement, event);

        if (width < 500 && event.deltaY > 0) {
          const el = event.target as HTMLElement;
          const elId = el.dataset.id;
          if (elId) {
            const selectedScreen = screenElements?.filter((screen) => {
              console.log(screen.id);
              return screen.id === elId;
            })[0];
            if (selectedScreen) {
              console.log('here');
              navigate(`${selectedScreen.screenRid}/${selectedScreen.annotationId}`);
            }
          }
        } else {
          canvasData.current.viewBox = { x, y, width, height };
          canvasData.current.newViewBox = { x, y, width, height };
          setViewBoxStr(`${x} ${y} ${width} ${height}`);
        }
      };
      svgElement.addEventListener('wheel', zoomSVG);

      return () => {
        svgElement.removeEventListener('wheel', zoomSVG);
      };
    }
  }, [svgRef]);

  return (
    <>
      <Tags.SVGCanvas
        viewBox={viewBoxStr}
        ref={svgRef}
        mode={canvasMode}
        onMouseDown={handleMouseStart}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
        onMouseMove={handleMouseMove}
      >
        <CanvasDottedBg canvasData={canvasData} cellWidth={cellWidth} />
        {
        mode === Mode.CanvasMode && <>
          {
            screenElements?.map(screenEl => <g key={screenEl.id}>
              <image
                data-id={screenEl.id}
                href={screenEl.screenHref}
                x={screenEl.x}
                y={screenEl.y}
                width={screenEl.width}
                height={screenEl.height}
                onClick={() => navigate(`${screenEl.screenRid}/${screenEl.annotationId}`)}
              />
              <text
                x={screenEl.x}
                y={screenEl.y + screenEl.height}
              >
                {screenEl.annotationText.substring(0, 45)} ...
              </text>
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
      {mode === Mode.CanvasMode && <Tags.ModeOptions>
        <button
          type="button"
          onClick={() => setCanvasMode(CanvasMode.PanMode)}
          className={canvasMode === CanvasMode.PanMode ? 'active' : ''}
        >
          <DragOutlined />
        </button>
        <button
          type="button"
          onClick={() => setCanvasMode(CanvasMode.ConnectMode)}
          className={
                    canvasMode === CanvasMode.ConnectMode ? 'active' : ''
                  }
        >
          <ArrowsAltOutlined />
        </button>
                                   </Tags.ModeOptions>}
    </>
  );
}

export default Canvas;
