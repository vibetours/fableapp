import { ITourEntityHotspot } from '@fable/common/dist/types';
import { pointer as fromPointer, selectAll, select, Selection as D3Selection } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { D3ZoomEvent, zoom, zoomIdentity } from 'd3-zoom';
import dagre from 'dagre';
import React, { useEffect, useRef, useState } from 'react';
import { drag, D3DragEvent } from 'd3-drag';
import { DeleteOutlined, DisconnectOutlined, FileImageOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { ScreenType } from '@fable/common/dist/api-contract';
import * as GTags from '../../common-styled';
import { AnnotationPerScreen, NavFn, TourDataChangeFn } from '../../types';
import { updateButtonProp, deleteAnnotation, IAnnotationConfigWithScreenId } from '../annotation/annotation-config-utils';
import Btn from '../btn';
import * as Tags from './styled';
import { AnnotationNode, Box, CanvasGrid, EdgeWithData, LRPostion } from './types';
import { formPathUsingPoints, formScreens2, getEdges, getEndPointsUsingPath } from './utils';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import AddImageScreen from './add-image-screen';
import { dSaveZoomPanState } from './deferred-tasks';

type CanvasProps = {
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: NavFn;
  onTourDataChange: TourDataChangeFn;
  rootScreens: P_RespScreen[];
  addScreenToTour: (screenType: ScreenType, screenId: number, screenRid: string) => void;
  tour: P_RespTour;
};

interface ConnectionErrMsg {
  msg: string;
  position: 'l' | 'r';
  x: number;
  y: number;
  h: number;
  w: number;
  renderingW: number;
}

type AnnoationLookupMap = Record<string, [number, number]>;

const CONNECTION_ERR_MSG = 'You can\'t connect an annotation to a screen. Click on the screen to create an annotation first.';

const canvasGrid: CanvasGrid = {
  gridSize: 36,
  gridDotSize: 2,
  initial: {
    tx: 260,
    ty: 180,
    scale: 1
  }
};
const connectionErrInitData: ConnectionErrMsg = {
  msg: '',
  position: 'l',
  x: 0,
  y: 0,
  h: 0,
  w: 0,
  renderingW: 0
};

const CONNECTOR_COLOR_NON_HOVERED = '#9e9e9e';
const CONNECTOR_COLOR_HOVERED = '#000000';
const CONNECTOR_HOTSPOT_COLOR_NON_HOVERED = 'transparent';
const CONNECTOR_HOTSPOT_COLOR_HOVERED = '#1503450a';
const TILE_STROKE_WIDTH_ON_HOVER = '6px';
const TILE_STROKE_WIDTH_DEFAULT = '4px';

function isMenuModalVisible(xy: [number | null, number | null, LRPostion]) {
  return !(xy[0] === null || xy[1] === null);
}

function getLRPosition(xy: [number, number], wrt: HTMLElement): [number, number, LRPostion] {
  const box = wrt.getBoundingClientRect();
  if (xy[0] > ((box.width / 2) | 0)) {
    return [box.width - xy[0], xy[1], 'r'];
  }
  return [...xy, 'l' as LRPostion];
}

interface CtxSelectionData {
  annotation: IAnnotationConfigWithScreenId;
}

export default function TourCanvas(props: CanvasProps) {
  const isGuideArrowDrawing = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const [showScreenSelector, setShowScreenSelector] = useState(false);
  const [screensNotPartOfTour, setScreensNotPartOfTour] = useState<P_RespScreen[]>([]);
  const [screensPartOfTour, setScreensPartOfTour] = useState<P_RespScreen[]>([]);
  // const ctxData = useRef<CtxSelectionData | null>(null);
  // const [connectorMenuModalXY, setConnectorMenuModalXY] = useState<[number| null, number | null, LRPostion]>([null, null, 'r']);
  // const [nodeMenuModalXY, setNodeMenuModalXY] = useState<[number| null, number | null, LRPostion]>([null, null, 'r']);
  const [connectionErr, setConnectionErr] = useState<ConnectionErrMsg>(connectionErrInitData);
  const [showUploadScreenImgModal, setShowUploadScreenImgModal] = useState<boolean>(false);

  const [init] = useState(1);
  const zoomPanState = dSaveZoomPanState(props.tour.rid);

  const drawGrid = () => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select('svg#fab-tour-canvas');
    svg
      .selectAll('pattern')
      .data([1])
      .enter()
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', canvasGrid.gridSize)
      .attr('height', canvasGrid.gridSize)
      .append('rect')
      .attr('width', canvasGrid.gridDotSize)
      .attr('height', canvasGrid.gridDotSize)
      .attr('fill', '#a4a4a4')
      .attr('x', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2))
      .attr('y', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2));

    // Append a "backdrop" rect to your svg, and fill it with your pattern.
    // You shouldn't need to touch this again after adding it.
    svg.select('#pattern-fill')
      .attr('fill', 'url(#grid-pattern)');
  };

  const updateGrid = (ze: D3ZoomEvent<SVGGElement, unknown>) => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select(svgEl);
    svg.select('#grid-pattern')
      .attr('x', ze.transform.x)
      .attr('y', ze.transform.y)
      .attr('width', canvasGrid.gridSize * ze.transform.k)
      .attr('height', canvasGrid.gridSize * ze.transform.k)
      .selectAll('rect')
      .attr('x', (canvasGrid.gridSize * (ze.transform.k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('y', (canvasGrid.gridSize * (ze.transform.k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('opacity', Math.min(ze.transform.k, 1));
  };

  const nodeDraggable = () => {
    let relX = 0;
    let relY = 0;
    let newX = 0;
    let newY = 0;
    let id = '';

    return drag<SVGForeignObjectElement, AnnotationNode<dagre.Node>>()
      .on('start', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
        d
      ) {
        const [eventX, eventY] = fromPointer(event, rootGRef.current);

        const selectedScreen = select<SVGForeignObjectElement, AnnotationNode<dagre.Node>>(this);
        const data = selectedScreen.datum();
        // Find out where in the box the mousedown for drag is fired relative to the current box.
        relX = eventX - (data.storedData!.x - data.storedData!.width / 2);
        relY = eventY - (data.storedData!.y - data.storedData!.height / 2);
        id = data.id;
      })
      .on('drag', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
        d: any
      ) {
        prevent(event.sourceEvent);

        const [x, y] = fromPointer(event, rootGRef.current);
        newX = x - relX;
        newY = y - relY;

        // eslint-disable-next-line react/no-this-in-sfc
        const el = select<SVGGElement, AnnotationNode<dagre.Node>>(this.parentNode as SVGGElement);
        el.attr('transform', `translate(${newX}, ${newY})`);

        const fromEl = selectAll<SVGGElement, EdgeWithData>('g.edgegrp').filter((data) => data.srcId === d.id);
        const toEl = selectAll<SVGGElement, EdgeWithData>('g.edgegrp').filter((data) => data.destId === d.id);

        const data = el.datum();

        const fromElNodes = [fromEl.select('path.edgeconn'), fromEl.select('path.edgehotspot')] as
            D3Selection<SVGPathElement, EdgeWithData, HTMLElement, any>[];
        fromElNodes.forEach(sel => {
          const n = sel.node();
          if (!n) return;
          const pathD = n.getAttribute('d') ?? '';
          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX + data.width, y: newY + data.height / 2 };
          sel.attr('d', formPathUsingPoints([newPoints, endPoints[1]]));
        });

        const toElNodes = [toEl.select('path.edgeconn'), toEl.select('path.edgehotspot')] as
            D3Selection<SVGPathElement, EdgeWithData, HTMLElement, any>[];
        toElNodes.forEach(sel => {
          const n = sel.node()!;
          if (!n) return;
          const pathD = n.getAttribute('d') ?? '';
          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX, y: newY + data.height / 2 };
          sel.attr('d', formPathUsingPoints([endPoints[0], newPoints]));
        });
      })
      .on('end', () => {
        const nodeG = select<SVGGElement, AnnotationNode<dagre.Node>>(rootGRef.current!)
          .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
        const existingData = nodeG.data();
        const updatedNodeData = existingData.map(node => {
          if (node.id === id) {
            node.storedData!.x = newX + node.storedData!.width / 2;
            node.storedData!.y = newY + node.storedData!.height / 2;
          }
          return node;
        });
        const nodeGDataBound = nodeG.data<AnnotationNode<dagre.Node>>(updatedNodeData, d => d.id);
        nodeGDataBound.merge(nodeGDataBound).call(updateNodePos);

        relX = 0;
        relY = 0;
        id = '';
        newX = 0;
        newY = 0;
      });
  };

  const getAnnotationLookupMap = (allAnns: AnnotationPerScreen[]) => {
    const lookupMap: AnnoationLookupMap = {};
    for (let i = 0, l = allAnns.length; i < l; i++) {
      const sId = allAnns[i].screen.id;
      for (let k = 0, s = allAnns[i].annotations.length; k < s; k++) {
        const qId = `${sId}/${allAnns[i].annotations[k].refId}`;
        lookupMap[qId] = [i, k];
      }
    }
    return lookupMap;
  };

  const updateConnection = (
    allAnns: AnnotationPerScreen[],
    lookupMap: AnnoationLookupMap,
    from: string,
    to: string,
    updateFn: TourDataChangeFn
  ) => {
    const [fromScreenIdx, fromAnIdx] = lookupMap[from];
    const [toScreenIdx, toAnIdx] = lookupMap[to];
    const fromAn = allAnns[fromScreenIdx].annotations[fromAnIdx];
    const toAn = allAnns[toScreenIdx].annotations[toAnIdx];

    const prevBtnOfToAn = toAn.buttons.find(btn => btn.type === 'prev')!;
    let update;
    if (prevBtnOfToAn.hotspot !== null) {
      // if former connection does exists;
      // B -> A and a connection is getting established with C
      //  C.next => A
      //  A.prev.next = null (A.prev === B) // true
      //  A.prev = C
      const fromOldAnnId = prevBtnOfToAn.hotspot.actionValue;
      const [fromOldScrnIdx, fromOldAnnIdx] = lookupMap[fromOldAnnId];
      const fromOldAn = allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx];
      const nextBtn = fromOldAn.buttons.find(btn => btn.type === 'next')!;
      update = updateButtonProp(fromOldAn, nextBtn.id, 'hotspot', null);
      allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx] = update; // Updated config push it back to list
      updateFn('annotation-and-theme', allAnns[fromOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert'
      });
    }

    const nextBtnOfFromAn = fromAn.buttons.find(btn => btn.type === 'next')!;
    if (nextBtnOfFromAn.hotspot !== null) {
      const toOldAnnId = nextBtnOfFromAn.hotspot.actionValue;
      const [toOldScrnIdx, toOldAnnIdx] = lookupMap[toOldAnnId];
      const toOldAn = allAnns[toOldScrnIdx].annotations[toOldAnnIdx];
      const prevBtn = toOldAn.buttons.find(btn => btn.type === 'prev')!;
      update = updateButtonProp(toOldAn, prevBtn.id, 'hotspot', null);
      allAnns[toOldScrnIdx].annotations[toOldAnnIdx] = update; // updated value push it back to the list
      updateFn('annotation-and-theme', allAnns[toOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert'
      });
    }

    // if former connection does not exist
    //  update next btn of from annotation
    //  update prev btn of to annoatation
    update = updateButtonProp(toAn, prevBtnOfToAn.id, 'hotspot', {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue: `${allAnns[fromScreenIdx].screen.id}/${allAnns[fromScreenIdx].annotations[fromAnIdx].refId}`,
    } as ITourEntityHotspot);
    allAnns[toScreenIdx].annotations[toAnIdx] = update; // updated value push it back to the list
    updateFn('annotation-and-theme', allAnns[toScreenIdx].screen.id, {
      config: update,
      actionType: 'upsert'
    });

    update = updateButtonProp(fromAn, nextBtnOfFromAn.id, 'hotspot', {
      type: 'an-btn',
      on: 'click',
      target: '$this',
      actionType: 'navigate',
      actionValue: `${allAnns[toScreenIdx].screen.id}/${allAnns[toScreenIdx].annotations[toAnIdx].refId}`,
    } as ITourEntityHotspot);
    allAnns[fromScreenIdx].annotations[fromAnIdx] = update; // updated value push it back to the list
    updateFn('annotation-and-theme', allAnns[fromScreenIdx].screen.id, {
      config: update,
      actionType: 'upsert'
    });
  };

  const hideGuideConnector = (sel: D3Selection<SVGPathElement, {}, SVGGElement, AnnotationPerScreen[]>) => {
    sel.remove();
  };

  const prevent = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const resetState = () => {
    setShowScreenSelector(false);
    setConnectionErr(connectionErrInitData);
  };

  const updateNodePos = (node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, SVGGElement, {}>) => {
    node.attr(
      'transform',
      d => {
        const pos = d.storedData!;
        const x = pos.x - pos.width / 2;
        const y = pos.y - pos.height / 2;
        return `translate(${x}, ${y})`;
      }
    );
  };

  useEffect(() => {
    const svg = svgRef.current;
    const rootG = rootGRef.current;
    if (svg && rootG) {
      drawGrid();

      const [sk, sx, sy] = zoomPanState.get();
      const initialZoom = sk !== null ? sk : canvasGrid.initial.scale;
      const initialPan = sx !== null && sy !== null ? [sx, sy] : [canvasGrid.initial.tx, canvasGrid.initial.ty];

      const z = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 2])
        .on('zoom', null)
        .on('zoom', (e: D3ZoomEvent<SVGGElement, unknown>) => {
          zoomPanState.set(e.transform.k, e.transform.x, e.transform.y);
          updateGrid(e);
          select(rootG).attr('transform', e.transform.toString());
        });

      const initialTransform = zoomIdentity.translate(initialPan[0], initialPan[1]).scale(initialZoom);
      select(svg)
        .call(z)
        .call(z.transform, initialTransform);
      select(rootG).attr(
        'transform',
        initialTransform
          .toString()
      );

      const svgSel = select(svg);
      svgSel
        .on('mousemove', null)
        .on('mousemove', (e: MouseEvent) => {
          if (isGuideArrowDrawing.current !== 0) {
            const relativeCoord = fromPointer(e, rootG);
            svgSel.select<SVGGElement>('g.connectors')
              .selectAll<SVGPathElement, SVGGElement>('path.guide-arr')
              .attr('d', pEl => {
                const d = select<SVGGElement, AnnotationNode<dagre.Node>>(pEl).datum();
                return formPathUsingPoints([{
                  x: d.storedData!.x,
                  y: d.storedData!.y,
                }, {
                  x: relativeCoord[0],
                  y: relativeCoord[1]
                }]);
              });
          }
        })
        .on('mousedown', null)
        .on('mousedown', () => {
          resetState();
        })
        .on('click', null)
        .on('click', resetState)
        .on('mouseup', null)
        .on('mouseup', () => {
          const guidePath = svgSel.select<SVGGElement>('g.connectors').selectAll<SVGPathElement, {}>('path.guide-arr');
          hideGuideConnector(guidePath);
          isGuideArrowDrawing.current = 0;
        });
    }
  }, [init]);

  useEffect(() => {
    const rootScreensMap = props.rootScreens.reduce((store, srn) => {
      store[srn.id] = srn;
      return store;
    }, {} as Record<string, P_RespScreen>);
    for (const screenAnnPair of props.allAnnotationsForTour) {
      delete rootScreensMap[screenAnnPair.screen.parentScreenId];
    }
    const srnNotPartOfTour = Object.values(rootScreensMap).sort((m, n) => +n.updatedAt - +m.updatedAt);
    setScreensNotPartOfTour(srnNotPartOfTour);

    const rootG = rootGRef.current;
    const svgEl = svgRef.current;
    if (!rootG || !svgEl) {
      return;
    }
    const g = select(rootG);

    const gBoundData = g
      .selectAll<SVGGElement, number>('g.connectors')
      .data([props.allAnnotationsForTour], () => 1);

    const connectorG = gBoundData
      .enter()
      .append('g')
      .attr('class', 'connectors')
      .merge(gBoundData);

    const {
      annotationNodes: nodeWithDim,
      screens: srnPartOfTour,
    } = formScreens2(props.allAnnotationsForTour, canvasGrid);

    setScreensPartOfTour(srnPartOfTour);

    if (nodeWithDim.length === 0) {
      setShowScreenSelector(true);
    }

    const edges = getEdges(props.allAnnotationsForTour);
    const nodeLookup = nodeWithDim.reduce((hm, n) => {
      hm[n.id] = n;
      return hm;
    }, {} as Record<string, AnnotationNode<dagre.Node>>);

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: 'LR', ranksep: canvasGrid.gridSize * 3, nodesep: canvasGrid.gridSize * 3 });
    graph.setDefaultEdgeLabel(() => ({}));
    nodeWithDim.forEach(node => graph.setNode(node.id, { label: node.id, width: node.width, height: node.height }));
    edges.forEach(edge => graph.setEdge(edge[0], edge[1]));
    dagre.layout(graph);

    const newNodesWithPositions: AnnotationNode<dagre.Node>[] = graph.nodes().map(v => {
      const graphNode = graph.node(v);
      const logicalNode = nodeLookup[graphNode.label!];
      logicalNode.storedData = graphNode;
      return logicalNode;
    });
    const newEdgesWithPositions: EdgeWithData[] = graph.edges().map(ed => {
      const e = graph.edge(ed);
      return {
        ...e,
        srcId: ed.v,
        destId: ed.w,
      };
    });

    const lines = line<EdgeWithData>()
      .curve(curveBasis)
      .x(d => d.x)
      .y(d => d.y);

    // Connectors or edges are drawn like this
    // <g>
    //   <path> <- transparent thick path that detects interaction
    //   <path> <- original edge drawing
    //   <circle> <- when interaction is detected and shows menu
    // </g>
    const connectorGDataBound = connectorG
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .data(newEdgesWithPositions, d => `${d.srcId}:${d.destId}`);
    connectorGDataBound
      .enter()
      .append('g')
      .attr('class', 'edgegrp')
      .call(grp => {
        grp
          .append('path')
          .style('marker-end', 'url(#triangle-arrowhead)')
          .attr('fill', 'none')
          .attr('class', 'edgeconn')
          .attr('stroke-width', 1)
          .attr('stroke', CONNECTOR_COLOR_NON_HOVERED)
          .attr('d', attr => lines(attr.points as any));

        grp
          .append('path')
          .attr('fill', 'none')
          .attr('stroke-width', 20)
          .attr('stroke', CONNECTOR_HOTSPOT_COLOR_NON_HOVERED)
          .attr('fill', 'transparent')
          .attr('class', 'edgehotspot')
          .attr('cursor', 'pointer')
          .attr('d', attr => lines(attr.points as any))
          .on('mouseover', function () {
            // eslint-disable-next-line react/no-this-in-sfc
            const gEl = select<SVGGElement, EdgeWithData>(this.parentElement as unknown as SVGGElement);
            gEl.select('path.edgeconn').attr('stroke', CONNECTOR_COLOR_HOVERED);
            gEl.select('path.edgehotspot').attr('stroke', CONNECTOR_HOTSPOT_COLOR_HOVERED);
          })
          .on('mouseout', function () {
            // eslint-disable-next-line react/no-this-in-sfc
            const gEl = select<SVGGElement, EdgeWithData>(this.parentElement as unknown as SVGGElement);
            gEl.select('path.edgeconn').attr('stroke', CONNECTOR_COLOR_NON_HOVERED);
            gEl.select('path.edgehotspot').attr('stroke', CONNECTOR_HOTSPOT_COLOR_NON_HOVERED);
          })
          .on('click', (e: MouseEvent) => {
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            // setConnectorMenuModalXY(getLRPosition(relCoord, con));
          });
      })
      .merge(connectorGDataBound)
      .call(p => {
        ['path.edgeconn', 'path.edgehotspot'].forEach(sel => {
          p.selectAll<SVGPathElement, EdgeWithData>(sel)
            .data(p.data(), d => `${d.srcId}:${d.destId}`)
            .attr('d', attr => lines(attr.points as any));
        });
      });

    connectorGDataBound.exit().remove();

    const nodeG = g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .data<AnnotationNode<dagre.Node>>(newNodesWithPositions, d => d.id);
    nodeG
      .enter()
      .append('g')
      .attr('class', 'node')
      .on('mouseover', null)
      .on('mouseover', function () {
        const gEl = select(this);
        gEl.select('rect.interaction-marker')
          .style('stroke-width', TILE_STROKE_WIDTH_ON_HOVER)
          .style('stroke', Tags.TILE_STROKE_COLOR_ON_HOVER);
      })
      .on('mousedown', null)
      .on('mousedown', function (e: MouseEvent, d) {
        prevent(e);
        connectorG
          .selectAll('path.guide-arr')
          .data([this])
          .enter()
          .append('path')
          .attr('class', 'guide-arr')
          .style('fill', 'none')
          .style('stroke', 'black')
          .style('stroke-width', '2px')
          .style('marker-end', 'url(#triangle-arrowhead)')
          .attr('d', '');
        isGuideArrowDrawing.current = 1;
      })
      .on('mouseup', null)
      .on('mouseup', function (e: MouseEvent) {
        prevent(e);
        const toEl = this;
        const fromEl = connectorG.selectAll<SVGPathElement, SVGGElement>('path.guide-arr').datum();
        const fromElSel = select<SVGGElement, AnnotationNode<dagre.Node>>(fromEl);
        const fromElData = fromElSel.datum();
        const toElData = select<SVGGElement, AnnotationNode<dagre.Node>>(toEl).datum();

        isGuideArrowDrawing.current = 0;
        if (fromElData.id === toElData.id) {
          // self loop, treat this as click
          props.navigate(toElData.id, 'annotation-hotspot');
          return;
        }

        const allAnns = g.selectAll<SVGGElement, AnnotationPerScreen[]>('g.connectors').datum();
        const lookupMap = getAnnotationLookupMap(allAnns);
        updateConnection(allAnns, lookupMap, fromElData.id, toElData.id, props.onTourDataChange);

        hideGuideConnector(connectorG.selectAll('path.guide-arr'));
      })
      .on('mouseout', null)
      .on('mouseout', function () {
        const gEl = select(this);
        gEl.select('rect.interaction-marker')
          .style('stroke', Tags.TILE_STROKE_COLOR_DEFAULT)
          .style('stroke-width', TILE_STROKE_WIDTH_DEFAULT);
      })
      .call(p => {
        p.append('rect')
          .attr('x', '0')
          .attr('y', '0')
          .attr('class', 'poh')
          .attr('width', '20')
          .attr('height', '20');

        p
          .append('image')
          .attr('x', 0)
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .attr('clip-path', 'url(#fit-rect)')
          .attr('y', 20);

        p.append('foreignObject')
          .attr('class', 'screen-info')
          .call(fo => {
            fo.append('xhtml:p');
          });

        p.append('foreignObject')
          .attr('class', 'ann-info')
          .call(fo => {
            fo.append('xhtml:p');
          });
        p.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('rx', 4)
          .attr('ry', 4)
          .attr('class', 'interaction-marker')
          .style('fill', 'none')
          .style('stroke', Tags.TILE_STROKE_COLOR_DEFAULT)
          .style('stroke-width', TILE_STROKE_WIDTH_DEFAULT);

        const menug = p
          .append('g')
          .attr('transform', 'translate(4, 4) scale(0.04)')
          .on('mousedown', prevent)
          .on('mouseup', prevent)
          .on('click', (e) => {
            prevent(e);
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            // setNodeMenuModalXY(getLRPosition(relCoord, con));
            // const sel = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
            // console.log('datum', sel);
          });
        menug
          .append('path')
          .attr('class', 'menuicn')
          .attr('stroke', Tags.TILE_STROKE_COLOR_DEFAULT)
          .attr('fill', Tags.TILE_STROKE_COLOR_DEFAULT)
          .attr('d', 'M165,0C74.019,0,0,74.019,0,165s74.019,165,165,165s165-74.019,165-165S255.981,0,165,0z M85,190c-13.785,0-25-11.215-25-25s11.215-25,25-25s25,11.215,25,25S98.785,190,85,190z M165,190c-13.785,0-25-11.215-25-25s11.215-25,25-25s25,11.215,25,25S178.785,190,165,190z M245,190c-13.785,0-25-11.215-25-25s11.215-25,25-25c13.785,0,25,11.215,25,25S258.785,190,245,190z');

        menug
          .append('rect')
          .attr('x', -50)
          .attr('y', -50)
          .attr('height', 400)
          .attr('width', 550)
          .attr('class', 'menuicnovrly')
          .attr('fill', 'transparent');
      })
      .merge(nodeG)
      .call(updateNodePos)
      .call(p => {
        p.selectAll<SVGImageElement, AnnotationNode<dagre.Node>>('image')
          .data(p.data(), d => d.id)
          .attr('href', d => d.imageUrl)
          .attr('width', d => d.width);

        p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.screen-info')
          .data(p.data(), d => d.id)
          .attr('width', d => d.width - 20)
          .attr('height', 20)
          .attr('x', 20)
          .attr('y', 0)
          .call(nodeDraggable())
          .call(fo => {
            fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .style('width', d => d.width)
              .style('height', '16px')
              .style('display', 'block')
              .style('margin', 0)
              .style('font-size', '12px')
              .attr('class', 'poh')
              .style('background', Tags.TILE_STROKE_COLOR_DEFAULT)
              .style('color', 'black')
              .style('padding', '2px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .text(d => `${d.screenTitle.substring(0, 30)}${d.screenTitle.length > 30 ? '...' : ''}`);
          });

        p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.ann-info')
          .data(p.data(), d => d.id)
          .attr('width', d => d.width)
          .attr('height', 40)
          .attr('x', 0)
          .attr('y', d => d.height - 40)
          .call(fo => {
            fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .style('width', d => d.width)
              .style('height', '40px')
              .style('display', 'block')
              .style('margin', 0)
              .style('font-size', '12px')
              .style('background', Tags.TILE_STROKE_COLOR_DEFAULT)
              .style('color', 'black')
              .style('padding', '2px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .style('cursor', 'pointer')
              .text(d => `${d.text!.substring(0, 65)}${d.text!.length > 65 ? '...' : ''}`);
          });

        p.selectAll<SVGTextElement, AnnotationNode<dagre.Node>>('rect.interaction-marker')
          .data(p.data(), d => d.id)
          .attr('width', d => d.width)
          .attr('height', d => d.height);
      })
      .exit()
      .remove();
  }, [props.allAnnotationsForTour]);

  const viewBox = `0 0 ${window.innerWidth} ${window.innerHeight}`;

  return (
    <>
      <Tags.SVGCanvas
        id="fab-tour-canvas"
        viewBox={viewBox}
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="fit-rect">
            <rect x="0" y="0" width={canvasGrid.gridSize * 6} height={canvasGrid.gridSize * 4} />
          </clipPath>
          <marker
            id="triangle-arrowhead"
            markerWidth="5"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 5 5 0 10 Z" style={{ fill: 'black' }} />
          </marker>
        </defs>
        <rect id="pattern-fill" width="100%" height="100%" />
        <g id="fab-tour-canvas-main" ref={rootGRef} />
      </Tags.SVGCanvas>
      <Tags.CanvasMenuCon
        onClick={prevent}
        onMouseUp={prevent}
        onMouseDown={prevent}
      >
        <Tags.CanvasMenuItemCon>
          <Btn
            title="Add a new screen to this tour"
            icon="new-screen"
            style={{
              margin: 0,
              border: '1px solid black',
            }}
            onClick={() => setShowScreenSelector(!showScreenSelector)}
          />
        </Tags.CanvasMenuItemCon>
      </Tags.CanvasMenuCon>
      <Tags.CanvasMenuCon>
        <Tags.CanvasMenuItemCon>
          <Btn
            title="Add a new screen to this tour"
            icon="new-screen"
            style={{
              margin: 0,
              border: '1px solid black',
            }}
            onClick={() => setShowScreenSelector(!showScreenSelector)}
          />
        </Tags.CanvasMenuItemCon>
      </Tags.CanvasMenuCon>
      {showScreenSelector && (
      <Tags.SelectScreenContainer>
        <Tags.ScreensContainer>
          {screensPartOfTour.length > 0 && (
          <>
            <GTags.Txt
              className="title"
              style={{ marginBottom: '0.5rem' }}
            >
              Screens part of tour
            </GTags.Txt>
            <Tags.ScreenSlider style={{ flexDirection: 'column', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1.25rem' }}>
                {screensPartOfTour.map(screen => (
                  <Tags.Screen
                    key={screen.id}
                    onClick={() => {
                      props.navigate(`${screen.id}`, 'annotation-hotspot');
                    }}
                  >
                    <img src={screen.thumbnailUri.href} alt={screen.displayName} />
                    <Tags.ScreenTitleIconCon>
                      <GTags.Txt className="title2">{screen.displayName}</GTags.Txt>
                      <div>
                        {
                            screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
                          }
                      </div>
                    </Tags.ScreenTitleIconCon>
                  </Tags.Screen>
                ))}
              </div>
              <div />
            </Tags.ScreenSlider>
          </>
          )}
          {screensNotPartOfTour.length > 0 ? (
            <>
              <GTags.Txt
                className="title"
                style={{ marginBottom: '0.5rem' }}
              >
                Original recorded screens
              </GTags.Txt>
              <Tags.ScreenSlider style={{ flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <Tags.Screen onClick={() => {
                    setShowScreenSelector(false);
                    setShowUploadScreenImgModal(true);
                  }}
                  >
                    <Tags.UploadImgCont>
                      <UploadOutlined style={{ fontSize: '3rem' }} />
                      <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                    </Tags.UploadImgCont>
                  </Tags.Screen>
                  {screensNotPartOfTour.map(screen => (
                    <Tags.Screen
                      key={screen.id}
                      onClick={() => {
                        props.addScreenToTour(screen.type, screen.id, screen.rid);
                      }}
                    >
                      <img src={screen.thumbnailUri.href} alt={screen.displayName} />
                      <Tags.ScreenTitleIconCon>
                        <GTags.Txt className="title2">{screen.displayName}</GTags.Txt>
                        <div>
                          {
                            screen.type === ScreenType.SerDom ? <FileTextOutlined /> : <FileImageOutlined />
                          }
                        </div>
                      </Tags.ScreenTitleIconCon>
                    </Tags.Screen>
                  ))}
                </div>
                <div />
              </Tags.ScreenSlider>
            </>
          ) : (
            <>
              <GTags.Txt>
                All captured screens are already part of this tour.
                <br />
                Any new screen captured will be available here.
              </GTags.Txt>
              <Tags.Screen
                onClick={() => {
                  setShowScreenSelector(false);
                  setShowUploadScreenImgModal(true);
                }}
                style={{ margin: '1rem auto' }}
              >
                <Tags.UploadImgCont>
                  <UploadOutlined style={{ fontSize: '3rem' }} />
                  <GTags.Txt className="title2">Upload screen image</GTags.Txt>
                </Tags.UploadImgCont>
              </Tags.Screen>
            </>

          )}
        </Tags.ScreensContainer>
      </Tags.SelectScreenContainer>
      )}
      {!!connectionErr.msg && (
        <div style={{
          background: '#FF7450',
          padding: '8px',
          borderRadius: '8px',
          width: '240px',
          top: `${connectionErr.y - (connectionErr.h / 2)}px`,
          position: 'absolute',
          whiteSpace: 'pre-line',
          left: `${connectionErr.position === 'l'
            ? connectionErr.x - (10 + 16 /* both side padding */ + 360 /* width */)
            : connectionErr.x + connectionErr.w + (10 + 8 /* padding one side */)}px`,
        }}
        >
          <GTags.Txt color="#fff">{connectionErr.msg}</GTags.Txt>
          <GTags.Txt color="#fff" className="subhead">Click outside to cancel this popup</GTags.Txt>
        </div>
      )}
      {
        showUploadScreenImgModal && (
          <AddImageScreen
            open={showUploadScreenImgModal}
            closeModal={() => setShowUploadScreenImgModal(false)}
            tourRid={props.tour.rid}
            addScreenToTour={props.addScreenToTour}
          />
        )
      }
      {/* isMenuModalVisible(connectorMenuModalXY) && (
        <Tags.MenuModalMask onClick={() => {
          ctxData.current = null;
          setConnectorMenuModalXY([null, null, 'l']);
        }}
        >
          <Tags.MenuModal xy={connectorMenuModalXY as [number, number, LRPostion]} onClick={prevent}>
            <div className="menu-item danger">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <DisconnectOutlined style={{ marginTop: '2px' }} />
                <div>
                  Delete this connector
                  <div className="subtext">This action will break the flow in two parts</div>
                </div>
              </div>
            </div>
          </Tags.MenuModal>
        </Tags.MenuModalMask>
      ) */}
      {/* isMenuModalVisible(nodeMenuModalXY) && (
        <Tags.MenuModalMask onClick={() => setNodeMenuModalXY([null, null, 'l'])}>
          <Tags.MenuModal xy={nodeMenuModalXY as [number, number, LRPostion]} onClick={prevent}>
            <div className="menu-item danger">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <DeleteOutlined style={{ marginTop: '2px' }} />
                <div>
                  Delete this annotation
                  <div className="subtext">Prev and next annotation will be connected</div>
                </div>
              </div>
            </div>
          </Tags.MenuModal>
        </Tags.MenuModalMask>
      ) */}
    </>
  );
}
