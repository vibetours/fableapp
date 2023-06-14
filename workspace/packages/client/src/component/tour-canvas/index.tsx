import { ITourEntityHotspot } from '@fable/common/dist/types';
import { pointer as fromPointer, selectAll, select, Selection as D3Selection } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { D3ZoomEvent, zoom, zoomIdentity } from 'd3-zoom';
import dagre from 'dagre';
import React, { useEffect, useRef, useState } from 'react';
import { drag, D3DragEvent } from 'd3-drag';
import { FileImageOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { ScreenType } from '@fable/common/dist/api-contract';
import * as GTags from '../../common-styled';
import { AnnotationPerScreen, NavFn, TourDataChangeFn } from '../../types';
import { updateButtonProp } from '../annotation/annotation-config-utils';
import Btn from '../btn';
import * as Tags from './styled';
import { AnnotationNode, Box, CanvasGrid, EdgeWithData } from './types';
import { formPathUsingPoints, formScreens2, getEdges, getEndPointsUsingPath } from './utils';
import { P_RespScreen } from '../../entity-processor';
import AddImageScreen from './add-image-screen';

type CanvasProps = {
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: NavFn;
  onTourDataChange: TourDataChangeFn;
  rootScreens: P_RespScreen[];
  addScreenToTour: (screenType: ScreenType, screenId: number, screenRid: string) => void;
  tourRid: string | undefined;
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

export default function TourCanvas(props: CanvasProps) {
  const isGuideArrowDrawing = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const [showScreenSelector, setShowScreenSelector] = useState(false);
  const [screensNotPartOfTour, setScreensNotPartOfTour] = useState<P_RespScreen[]>([]);
  const [connectionErr, setConnectionErr] = useState<ConnectionErrMsg>(connectionErrInitData);
  const [showUploadScreenImgModal, setShowUploadScreenImgModal] = useState<boolean>(false);

  const [init] = useState(1);

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

        const fromEl = selectAll<SVGPathElement, EdgeWithData>('path.edge').filter((data) => data.srcId === d.id);
        const toEl = selectAll<SVGPathElement, EdgeWithData>('path.edge').filter((data) => data.destId === d.id);

        const data = el.datum();

        if (fromEl.node()) {
          const fromElNode = fromEl.node() as SVGPathElement;
          const pathD = fromElNode.getAttribute('d') ?? '';
          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX + data.width, y: newY + data.height / 2 };
          fromEl.attr('d', formPathUsingPoints([newPoints, endPoints[1]]));
        }

        if (toEl.node()) {
          const toElNode = toEl.node() as SVGPathElement;
          const pathD = toElNode.getAttribute('d') ?? '';
          const endPoints = getEndPointsUsingPath(pathD);
          const newPoints = { x: newX, y: newY + data.height / 2 };
          toEl.attr('d', formPathUsingPoints([endPoints[0], newPoints]));
        }
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

      const z = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 2])
        .on('zoom', null)
        .on('zoom', (e: D3ZoomEvent<SVGGElement, unknown>) => {
          updateGrid(e);
          select(rootG).attr('transform', e.transform.toString());
        });

      select(svg)
        .call(z)
        .call(z.translateBy, canvasGrid.initial.tx, canvasGrid.initial.ty)
        .call(z.scaleBy, canvasGrid.initial.scale);
      select(rootG).attr(
        'transform',
        zoomIdentity
          .translate(canvasGrid.initial.tx, canvasGrid.initial.ty)
          .scale(canvasGrid.initial.scale)
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

    const nodeWithDim = formScreens2(props.allAnnotationsForTour, canvasGrid);
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

    const connectorGDataBound = connectorG
      .selectAll<SVGPathElement, EdgeWithData>('path.edge')
      .data(newEdgesWithPositions);
    connectorGDataBound
      .enter()
      .append('path')
      .attr('class', 'edge')
      .style('marker-end', 'url(#triangle-arrowhead)')
      .attr('fill', 'none')
      .attr('stroke-width', 1)
      .attr('stroke', 'black')
      .merge(connectorGDataBound)
      .attr('d', ({ points }) => lines(points as any));

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
          .style('stroke-width', '4px')
          .style('cursor', 'ew-resize');
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

        if (toElData.type === 'screen' || fromElData.type === 'screen') {
          const target = toElData.type === 'screen' ? toEl : fromEl;
          const bbox = target.getBoundingClientRect();
          const remainingSpaceOnRight = window.innerWidth - (bbox.x + bbox.width);
          const remainingSpaceOnLeft = bbox.x;
          const position = remainingSpaceOnLeft > remainingSpaceOnRight ? 'l' : 'r';
          requestAnimationFrame(() => {
            setConnectionErr({
              msg: CONNECTION_ERR_MSG,
              x: bbox.x,
              y: bbox.y,
              h: bbox.height,
              w: bbox.width,
              position,
              renderingW: position === 'l' ? remainingSpaceOnLeft : remainingSpaceOnRight,
            });
          });
        } else {
          const allAnns = g.selectAll<SVGGElement, AnnotationPerScreen[]>('g.connectors').datum();
          const lookupMap = getAnnotationLookupMap(allAnns);
          updateConnection(allAnns, lookupMap, fromElData.id, toElData.id, props.onTourDataChange);
        }

        hideGuideConnector(connectorG.selectAll('path.guide-arr'));
      })
      .on('mouseout', null)
      .on('mouseout', function () {
        const gEl = select(this);
        gEl.select('rect.interaction-marker')
          .style('stroke-width', '1px');
      })
      .call(p => {
        p
          .append('image')
          .attr('x', 0)
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .attr('y', 20);

        p.append('foreignObject')
          .attr('class', 'screen-info')
          .call(fo => {
            fo.append('xhtml:p');
          });

        p.filter(d => d.type === 'annotation')
          .append('foreignObject')
          .attr('class', 'ann-info')
          .call(fo => {
            fo.append('xhtml:p');
          });
        p.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('class', 'interaction-marker')
          .style('fill', 'none')
          .style('stroke', '#16023E')
          .style('stroke-width', '1px');
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
          .attr('width', d => d.width)
          .attr('height', 20)
          .attr('x', 0)
          .attr('y', 0)
          .call(nodeDraggable())
          .call(fo => {
            fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .style('width', d => d.width)
              .style('height', '15px')
              .style('display', 'block')
              .style('margin', 0)
              .style('font-size', '12px')
              .style('background', '#16023E')
              .style('color', 'white')
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
              .style('background', '#16023E')
              .style('color', 'white')
              .style('padding', '2px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .text(d => `${d.text!.substring(0, 65)}${d.text!.length > 65 ? '...' : ''}`);
          });

        p.selectAll<SVGTextElement, AnnotationNode<dagre.Node>>('rect')
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
          {screensNotPartOfTour.length > 0 ? (
            <>
              <GTags.Txt
                className="title"
                style={{ marginBottom: '0.5rem' }}
              >Select a screen to add it in the tour
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
                        // TODO this is just arbitrary timeout after which the popup would close
                        // normally wait for the request to finish, show a loader and then add the
                        // screen
                        setTimeout(() => {
                          setShowScreenSelector(false);
                        }, 500);
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
            tourRid={props.tourRid}
            addScreenToTour={props.addScreenToTour}
          />
        )
      }
    </>
  );
}
