import React, { useEffect, useRef, useState } from 'react';
import {
  AnnotationPerScreen,
} from '@fable/common/dist/types';
import { ArrowsAltOutlined, DragOutlined } from '@ant-design/icons';
import * as Tags from './styled';
import { CanvasData, CanvasMode, Conn, Connector, ConnectorData, ElementCoords, Mode, Screen } from './types';
import CanvasDottedBg from './canvas-dotted-bg';
import { P_RespScreen } from '../../entity-processor';
import EmptyCanvas from './empty-canvas';
import AddScreen from './add-screen';
import { formPathUsingPoints } from './utils';
import { formConnectors, formScreens } from './utils/arrangeEls';
import { startPan, stopPan, updatePan } from './utils/pan';
import { zoom } from './utils/zoom';
import { initialConnectorData, initialLine } from './init-data';
import { startConnecting, stopConnecting, updateConnecting } from './utils/connector';

type CanvasProps = {
  cellWidth: number;
  screens: P_RespScreen[];
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: Function;
};

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
  const [temporaryConnector, setTemporaryConnector] = useState(initialLine);
  const connectorData = useRef<ConnectorData>(initialConnectorData);

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

  function startConnector(event: React.MouseEvent) {
    const { isDrawing } = connectorData.current;
    const node = event.target as HTMLElement;

    if (!isDrawing && node.dataset.type === 'canvasElementArea') {
      const node = event.target as SVGSVGElement;

      if (node.dataset.index) {
        connectorData.current.start.element = +node.dataset.index;

        if (screenElements) {
          const el = screenElements[+node.dataset.index];

          connectorData.current = startConnecting(
          connectorData.current as ConnectorData,
          {
            x: el.x,
            y: el.y,
            width: el.width,
          } as ElementCoords,
          event,
          svgRef.current
          );
          connectorData.current.isDrawing = true;
        }
      }
    }
  }

  function updateConnector(event: React.MouseEvent) {
    const { isDrawing } = connectorData.current;

    if (isDrawing) {
      connectorData.current = updateConnecting(
        connectorData.current as ConnectorData,
        event,
        svgRef.current
      );
      setTemporaryConnector((prev) => ({
        ...prev,
        show: true,
        coords: { ...connectorData.current.newLine },
      }));
    }
  }

  function stopConnector(event: React.MouseEvent) {
    const { isDrawing } = connectorData.current;

    if (!isDrawing) {
      return;
    }

    const node = event.target as SVGSVGElement;

    if (node.dataset.type !== 'canvasElementArea' || !node.dataset.index) {
      connectorData.current.isDrawing = false;
      setTemporaryConnector((prev) => ({ ...prev, show: false }));
      return;
    }

    connectorData.current.end.element = +node.dataset.index!;

    if (screenElements) {
      const el = screenElements[+node.dataset.index!];

      connectorData.current = stopConnecting(
        connectorData.current as ConnectorData,
          { x: el.x, y: el.y } as ElementCoords,
          event,
          svgRef.current
      );
      setTemporaryConnector((prev) => ({
        ...prev,
        show: false,
        coords: { ...connectorData.current.newLine },
      }));

      const isConnectorPresent = connectors?.filter(
        (connector) => connector.from.element === connectorData.current.start.element
          && connector.to.element === connectorData.current.end.element
      );

      if (isConnectorPresent && isConnectorPresent.length > 0) {
        connectorData.current.isDrawing = false;
        setTemporaryConnector((prev) => ({ ...prev, show: false }));
        return;
      }

      const { x1, y1, x2, y2 } = connectorData.current.newLine;

      const newConnector = {
        from: {
          element: connectorData.current.start.element,
          relY: connectorData.current.start.relY,
          relX: connectorData.current.start.relX,
        },
        to: {
          element: connectorData.current.end.element,
          relY: connectorData.current.end.relY,
          relX: connectorData.current.end.relX,
        },
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ],
      } as Conn;

      setConnectors((prev) => {
        if (prev) {
          return [
            ...prev, newConnector,
          ];
        }
        return undefined;
      });

      connectorData.current.isDrawing = false;
    }
  }

  const handleMouseStart = (event: React.MouseEvent) => {
    if (canvasMode === CanvasMode.PanMode) {
      startPanning(event);
    }

    if (canvasMode === CanvasMode.ConnectMode) {
      startConnector(event);
    }
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (canvasMode === CanvasMode.PanMode) {
      updatePanning(event);
    }

    if (canvasMode === CanvasMode.ConnectMode) {
      updateConnector(event);
    }
  };

  const handleMouseEnd = (event: React.MouseEvent) => {
    if (canvasMode === CanvasMode.PanMode) {
      stopPanning();
    }

    if (canvasMode === CanvasMode.ConnectMode) {
      stopConnector(event);
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
            screenElements?.map((screenEl, idx) => <g key={screenEl.id}>
              <rect
                className="canvasElArea"
                data-type="canvasElementArea"
                data-index={idx}
                x={screenEl.x - 30}
                y={screenEl.y - 30}
                width={screenEl.width + 60}
                height={screenEl.height + 60}
              />
              <image
                data-id={screenEl.screenId}
                href={screenEl.screenHref}
                data-type="canvasElement"
                data-index={idx}
                x={screenEl.x}
                y={screenEl.y}
                width={screenEl.width}
                height={screenEl.height}
                preserveAspectRatio="none"
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
          {temporaryConnector.show && (
          <line
            markerEnd="url(#arrow)"
            key={Math.random()}
            x1={temporaryConnector.coords.x1}
            y1={temporaryConnector.coords.y1}
            x2={temporaryConnector.coords.x2}
            y2={temporaryConnector.coords.y2}
            data-idx="normal"
            data-hello="hello"
            stroke="black"
            strokeWidth="2px"
          />
          )}
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
