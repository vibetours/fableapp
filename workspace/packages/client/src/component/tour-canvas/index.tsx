/* eslint-disable react/no-this-in-sfc */
import { nanoid } from 'nanoid';
import { DeleteOutlined, DisconnectOutlined, SisternodeOutlined } from '@ant-design/icons';
import { ITourDataOpts, ITourEntityHotspot } from '@fable/common/dist/types';
import Modal from 'antd/lib/modal';
import { D3DragEvent, drag, DragBehavior, SubjectPosition } from 'd3-drag';
import { pointer as fromPointer, select, selectAll, Selection as D3Selection } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { D3ZoomEvent, zoom, zoomIdentity } from 'd3-zoom';
import dagre from 'dagre';
import React, { useEffect, useRef, useState } from 'react';
import transition from 'd3-transition';
import { Button, Tooltip } from 'antd';
import {
  updateGrpIdForTimelineTillEnd,
  deleteAnnotation,
  deleteConnection,
  getAnnotationByRefId,
  reorderAnnotation,
  groupUpdatesByAnnotation
} from '../annotation/ops';
import newScreenDark from '../../assets/new-screen-dark.svg';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import { P_RespTour } from '../../entity-processor';
import {
  AnnotationPerScreen,
  ConnectedOrderedAnnGroupedByScreen,
  DestinationAnnotationPosition,
  NavFn,
  TourDataChangeFn
} from '../../types';
import { IAnnotationConfigWithScreenId, updateButtonProp } from '../annotation/annotation-config-utils';
import { AnnUpdateType } from '../timeline/types';
import { dSaveZoomPanState } from './deferred-tasks';
import * as Tags from './styled';
import {
  AnnAddScreenModal,
  AnnotationNode,
  AnnotationPosition, CanvasGrid,
  EdgeWithData,
  LRPostion,
  ModalPosition
} from './types';
import { formAnnotationNodes, formPathUsingPoints, getEndPointsUsingPath } from './utils';
import { isNavigateHotspot, isNextBtnOpensALink, updateLocalTimelineGroupProp } from '../../utils';
import ScreenPicker from '../../container/screen-picker';
import NewAnnotationPopup from '../timeline/new-annotation-popup';

const { confirm } = Modal;

// TODO[now] addScreenToTour + addNewScreenToTouris redundant
type CanvasProps = {
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: NavFn;
  onTourDataChange: TourDataChangeFn;
  tour: P_RespTour;
  timeline: ConnectedOrderedAnnGroupedByScreen,
  // addNewScreenToTour: AddScreenFn,
  tourOpts: ITourDataOpts,
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  applyAnnGrpIdMutations: (mutations: AnnUpdateType, tx: Tx) => void,
  commitTx: (tx: Tx) => void,
  setAlert: (msg?: string) => void,
};

type AnnoationLookupMap = Record<string, [number, number]>;

const canvasGrid: CanvasGrid = {
  gridSize: 36,
  gridDotSize: 2,
  initial: {
    tx: 260,
    ty: 180,
    scale: 1
  }
};

let dragTimer = 0;

const CONNECTOR_COLOR_NON_HOVERED = '#9e9e9e';
const CONNECTOR_COLOR_HOVERED = '#000000';
const CONNECTOR_HOTSPOT_COLOR_NON_HOVERED = 'transparent';
const CONNECTOR_HOTSPOT_COLOR_HOVERED = '#1503450a';
const TILE_STROKE_WIDTH_ON_HOVER = '6px';
const TILE_STROKE_WIDTH_DEFAULT = '4px';
const DROP_TARGET_PEEK_WIDTH = 40;
const DROP_TARGET_PEEK_GUTTER = 30;

function isMenuModalVisible(xy: [number | null, number | null, LRPostion]): boolean {
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

const initialReorderPropsValue = {
  destinationPosition: DestinationAnnotationPosition.next,
  currentDraggedAnnotationId: '',
  destinationDraggedAnnotationId: '',
  isCursorOnDropTarget: false
};

function shouldShowRepositionMarker(
  el: SVGRectElement,
  markerData: AnnotationNode<dagre.Node>,
  selectedNodeData: AnnotationNode<dagre.Node>,
): boolean {
  const isR = select(el).classed('r');
  const isSameTimelineGrp = markerData.grp === selectedNodeData.grp;
  const isPrev = markerData.localIdx === selectedNodeData.localIdx - 1;
  return !(isSameTimelineGrp && isPrev && isR);
}

const initialModalPos: ModalPosition = [null, null, 'l'];

const initialConnectorModalData = {
  position: initialModalPos,
  fromAnnId: '',
  toAnnId: '',
};

const initialAnnNodeModalData = {
  position: initialModalPos,
  annId: '',
};

const initialAddScreenModal: AnnAddScreenModal = {
  position: initialModalPos,
  annId: '',
  annotationPosition: 'prev',
  screenAnnotation: null
};

export default function TourCanvas(props: CanvasProps): JSX.Element {
  const isGuideArrowDrawing = useRef(0);
  const reorderPropsRef = useRef({ ...initialReorderPropsValue });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const [showScreenSelector, setShowScreenSelector] = useState(false);
  const ctxData = useRef<CtxSelectionData | null>(null);
  const [connectorMenuModalData, setConnectorMenuModalData] = useState(initialConnectorModalData);
  const [nodeMenuModalData, setNodeMenuModalData] = useState(initialAnnNodeModalData);
  const [addScreenModalData, setAddScreenModalData] = useState(initialAddScreenModal);
  const [noAnnotationsPresent, setNoAnnotationsPresent] = useState(false);

  const [init] = useState(1);
  const zoomPanState = dSaveZoomPanState(props.tour.rid);

  const drawGrid = (): void => {
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

  const updateGrid = (ze: D3ZoomEvent<SVGGElement, unknown>): void => {
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

  const nodeDraggable = (): DragBehavior<
    SVGForeignObjectElement,
    AnnotationNode<dagre.Node>,
    AnnotationNode<dagre.Node> | SubjectPosition
  > => {
    let relX = 0;
    let relY = 0;
    let newX = 0;
    let newY = 0;
    let id = '';

    return drag<SVGForeignObjectElement, AnnotationNode<dagre.Node>>()
      .on('start', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
      ) {
        const [eventX, eventY] = fromPointer(event, rootGRef.current);

        const selectedScreen = select<SVGForeignObjectElement, AnnotationNode<dagre.Node>>(this);
        const data = selectedScreen.datum();
        // Find out where in the box the mousedown for drag is fired relative to the current box.
        relX = eventX - (data.storedData!.x - data.storedData!.width / 2);
        relY = eventY - (data.storedData!.y - data.storedData!.height / 2);
        id = data.id;
        reorderPropsRef.current.currentDraggedAnnotationId = id;

        const nodeParent = selectedScreen.select(function () { return this.closest('g.node'); });
        nodeParent.raise(); // moves the dragged element to the end simulating higher zindex
        nodeParent.selectAll('rect.tg-hide')
          .classed('rev', true);

        const allNodesParentParent = select('g#fab-tour-canvas-main');
        allNodesParentParent.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.tg-hide')
          .classed('tg-show', function (datum) {
            return shouldShowRepositionMarker(this, datum, data);
          })
          .classed('tg-hide', function (datum) {
            return !shouldShowRepositionMarker(this, datum, data);
          });

        select('g.connectors').classed('fade', true);
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

        const [ox, oy] = fromPointer(event, document.body);
        if (dragTimer) {
          clearTimeout(dragTimer);
        }
        dragTimer = setTimeout(() => {
          dragTimer = 0;
          clearTimeout(dragTimer);

          const els = document.elementsFromPoint(ox, oy);
          const [dropTg] = els.filter(elm => elm.nodeName === 'rect' && elm.classList.contains('droptg'));

          selectAll('rect.tg-show.sel').classed('sel', false);
          reorderPropsRef.current = {
            ...initialReorderPropsValue,
            currentDraggedAnnotationId: reorderPropsRef.current.currentDraggedAnnotationId
          };

          if (!dropTg) return;

          const dropTarget = select<SVGRectElement, AnnotationNode<dagre.Node>>(dropTg as SVGRectElement);
          const isLeft = dropTarget.classed('l');
          const targetData = dropTarget.datum();
          dropTarget.classed('sel', true);

          reorderPropsRef.current.destinationPosition = isLeft
            ? DestinationAnnotationPosition.prev
            : DestinationAnnotationPosition.next;
          reorderPropsRef.current.destinationDraggedAnnotationId = targetData.id;
          reorderPropsRef.current.isCursorOnDropTarget = true;
        }, 200) as unknown as number;
      })
      .on('end', () => {
        const allNodesParentParent = select('g#fab-tour-canvas-main');
        allNodesParentParent.selectAll('rect.tg-show')
          .classed('tg-show', false)
          .classed('tg-hide', true)
          .classed('rev', false)
          .classed('sel', false);

        select('g.connectors').classed('fade', false);

        if (reorderPropsRef.current.isCursorOnDropTarget) {
          confirm({
            title: 'Do you want to reorder annotation?',
            icon: <SisternodeOutlined />,
            onOk() {
              const [currentScreenId, currentAnnRefId] = reorderPropsRef.current.currentDraggedAnnotationId.split('/');
              const currentAnnConfig = getAnnotationByRefId(currentAnnRefId, props.allAnnotationsForTour)!;
              const [, destinationAnnId] = reorderPropsRef.current.destinationDraggedAnnotationId.split('/');
              const result = reorderAnnotation(
                { ...currentAnnConfig, screenId: +currentScreenId },
                destinationAnnId,
                props.allAnnotationsForTour,
                props.tourOpts.main,
                reorderPropsRef.current.destinationPosition!,
              );
              if (result.status === 'accepted') props.applyAnnButtonLinkMutations(result);
              else props.setAlert(result.deniedReason);

              reorderPropsRef.current = { ...initialReorderPropsValue };
            },
            onCancel() { reorderPropsRef.current = { ...initialReorderPropsValue }; },
          });
        } else {
          reorderPropsRef.current = { ...initialReorderPropsValue };
        }

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

  const getAnnotationLookupMap = (allAnns: AnnotationPerScreen[]): AnnoationLookupMap => {
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
  ): void => {
    const [fromScreenIdx, fromAnIdx] = lookupMap[from];
    const [toScreenIdx, toAnIdx] = lookupMap[to];
    const fromAn = allAnns[fromScreenIdx].annotations[fromAnIdx];
    const toAn = allAnns[toScreenIdx].annotations[toAnIdx];
    toAn.grpId = fromAn.grpId;

    if (isNextBtnOpensALink(fromAn)) {
      props.setAlert("The selected annotation contains a link, hence, it can't be reordered. ");
      return;
    }

    const tx = new Tx();
    tx.start();

    const grpIdUpdates = updateGrpIdForTimelineTillEnd({ ...toAn, screenId: +to.split('/')[0] }, allAnns, fromAn.grpId);
    const groupedUpdates = groupUpdatesByAnnotation(grpIdUpdates);
    props.applyAnnGrpIdMutations({ groupedUpdates, updates: [], main: null, deletionUpdate: null, status: 'accepted' }, tx);

    let update;
    const newGrpIdForMiddleGroup = nanoid();
    updateLocalTimelineGroupProp(newGrpIdForMiddleGroup, fromAn.grpId);

    const nextBtnOfFromAn = fromAn.buttons.find(btn => btn.type === 'next')!;
    if (isNavigateHotspot(nextBtnOfFromAn.hotspot)) {
      const toOldAnnId = nextBtnOfFromAn.hotspot!.actionValue;
      const [toOldScrnIdx, toOldAnnIdx] = lookupMap[toOldAnnId];
      const toOldAn = allAnns[toOldScrnIdx].annotations[toOldAnnIdx];
      toOldAn.grpId = newGrpIdForMiddleGroup;

      const middleGroupedUpdates = groupUpdatesByAnnotation(updateGrpIdForTimelineTillEnd(
        { ...toOldAn, screenId: +toOldAnnId.split('/')[0] },
        allAnns,
        newGrpIdForMiddleGroup
      ));
      props.applyAnnGrpIdMutations({
        groupedUpdates: middleGroupedUpdates,
        updates: [],
        main: null,
        deletionUpdate: null,
        status: 'accepted'
      }, tx);

      const prevBtn = toOldAn.buttons.find(btn => btn.type === 'prev')!;
      update = updateButtonProp(toOldAn, prevBtn.id, 'hotspot', null);
      allAnns[toOldScrnIdx].annotations[toOldAnnIdx] = update; // updated value push it back to the list
      updateFn('annotation-and-theme', allAnns[toOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert'
      }, tx);
    }

    const prevBtnOfToAn = toAn.buttons.find(btn => btn.type === 'prev')!;
    if (isNavigateHotspot(prevBtnOfToAn.hotspot)) {
      // if former connection does exists;
      // B -> A and a connection is getting established with C
      //  C.next => A
      //  A.prev.next = null (A.prev === B) // true
      //  A.prev = C
      const fromOldAnnId = prevBtnOfToAn.hotspot!.actionValue;
      const [fromOldScrnIdx, fromOldAnnIdx] = lookupMap[fromOldAnnId];
      const fromOldAn = allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx];
      const nextBtn = fromOldAn.buttons.find(btn => btn.type === 'next')!;
      update = updateButtonProp(fromOldAn, nextBtn.id, 'hotspot', null);
      allAnns[fromOldScrnIdx].annotations[fromOldAnnIdx] = update; // Updated config push it back to list
      updateFn('annotation-and-theme', allAnns[fromOldScrnIdx].screen.id, {
        config: update,
        actionType: 'upsert'
      }, tx);
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
    }, tx);

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
    }, tx);

    props.commitTx(tx);
  };

  const hideGuideConnector = (sel: D3Selection<SVGPathElement, {}, SVGGElement, AnnotationPerScreen[]>): void => {
    sel.remove();
  };

  const prevent = (e: any): void => {
    if (e.target.name !== 'screen-img' && e.target.name !== 'screen-upload') {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  // todo[now] delete if not needed
  const resetState = (): void => {
  };

  const updateNodePos = (node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, SVGGElement, {}>): void => {
    node
      .transition()
      .attr(
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

  function createPlusIconGroup(
    parent: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>,
    position: AnnotationPosition
  ): void {
    parent
      .attr('class', `actnicngrp-${position}`)
      .attr(
        'transform',
        (d: AnnotationNode<dagre.Node>) => `translate(${position === 'prev' ? 20 : d.width - 20}, ${d.height / 2})`
      )
      .on('mousedown', prevent)
      .on('mouseup', prevent)
      .on('click', function (e, d) {
        prevent(e);
        const con = svgRef.current!.parentNode as HTMLDivElement;
        const sel = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
        const relCoord = fromPointer(e, con);

        setAddScreenModalData(
          {
            position: getLRPosition(relCoord, con),
            annId: sel.id,
            screenAnnotation: d.annotation,
            annotationPosition: position
          }
        );
      });

    parent.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 10)
      .attr('class', 'plusicnbase')
      .attr('fill', 'transparent');

    parent
      .append('path')
      .attr('class', 'plusicn')
      .attr('stroke-width', 3)
      .attr('d', 'M-6 0 H6 M0 -6 V6');

    parent
      .append('circle')
      .attr('cx', -10)
      .attr('cy', -10)
      .attr('r', 20)
      .attr('class', 'plusicnovrly')
      .attr('fill', 'transparent');
  }

  useEffect(() => {
    const rootG = rootGRef.current;
    const svgEl = svgRef.current;
    if (!rootG || !svgEl) {
      return;
    }
    const g = select(rootG);

    const [nodeWithDim, edges] = formAnnotationNodes(props.timeline, canvasGrid);

    const gBoundData = g
      .selectAll<SVGGElement, number>('g.connectors')
      .data([props.allAnnotationsForTour], () => 1);

    const connectorG = gBoundData
      .enter()
      .append('g')
      .attr('class', 'connectors')
      .merge(gBoundData);

    if (nodeWithDim.length === 0) {
      setNoAnnotationsPresent(true);
      setShowScreenSelector(true);
    }

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
          .on('click', function (e: MouseEvent) {
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            const d = select<SVGGElement, EdgeWithData>(this).datum();
            setConnectorMenuModalData({
              position: getLRPosition(relCoord, con),
              fromAnnId: d.srcId,
              toAnnId: d.destId
            });
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

        gEl.selectAll('circle.plusicnbase')
          .style('fill', Tags.TILE_STROKE_COLOR_ON_HOVER);

        gEl.selectAll('path.plusicn')
          .style('stroke', Tags.TILE_STROKE_COLOR_DEFAULT);
      })
      .on('mousedown', null)
      .on('mousedown', function (e: MouseEvent) {
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

        gEl.selectAll('circle.plusicnbase')
          .style('fill', 'transparent');

        gEl.selectAll('path.plusicn')
          .style('stroke', 'transparent');
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

        ['l', 'r'].forEach(pos => {
          p
            .append('rect')
            .attr('class', `tg-hide droptg ${pos}`)
            .attr('y', 4)
            .attr('x', d => (pos === 'l'
              ? -(DROP_TARGET_PEEK_WIDTH + DROP_TARGET_PEEK_GUTTER)
              : d.width + DROP_TARGET_PEEK_GUTTER))
            .attr('rx', 4)
            .attr('ry', 4)
            .attr('height', d => d.height - 8)
            .attr('width', DROP_TARGET_PEEK_WIDTH);
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

        const leftPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(leftPlusG, 'prev');
        const rightPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(rightPlusG, 'next');

        const menug = p
          .append('g')
          .attr('transform', 'translate(4, 4) scale(0.04)')
          .on('mousedown', prevent)
          .on('mouseup', prevent)
          .on('click', function (e) {
            prevent(e);
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            const d = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
            setNodeMenuModalData({
              position: getLRPosition(relCoord, con),
              annId: d.id
            });
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

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.r')
          .data(p.data(), d => d.id);

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.l')
          .data(p.data(), d => d.id)
          .style('visibility', 'visible')
          .filter((d) => d.localIdx !== 0)
          .style('visibility', 'hidden');

        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-next').data(p.data(), d => d.id);
        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-prev').data(p.data(), d => d.id);

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
      });

    nodeG
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
          <Tooltip
            title="Add a new screen to this tour"
            overlayStyle={{ fontSize: '0.75rem' }}
            placement="right"
          >
            <div>
              <Button
                onClick={() => setShowScreenSelector(!showScreenSelector)}
                icon={<img src={newScreenDark} alt="new screen" />}
                size="middle"
                style={{
                  margin: 0,
                  border: '1px solid black',
                }}
              />
            </div>
          </Tooltip>
        </Tags.CanvasMenuItemCon>
      </Tags.CanvasMenuCon>
      {showScreenSelector
        && <ScreenPicker
          hideScreenPicker={() => !noAnnotationsPresent && setShowScreenSelector(false)}
          screenPickerMode="navigate"
          dontShowCloseBtn={noAnnotationsPresent}
        />}
      {isMenuModalVisible(connectorMenuModalData.position) && (
        <Tags.MenuModalMask onClick={() => {
          ctxData.current = null;
          setConnectorMenuModalData(initialConnectorModalData);
        }}
        >
          <Tags.MenuModal xy={connectorMenuModalData.position} onClick={prevent}>
            <div
              className="menu-item danger"
              onClick={() => {
                confirm({
                  title: 'Are you sure you want to delete the connector?',
                  icon: <DisconnectOutlined />,
                  onOk() {
                    const [, fromAnnId] = connectorMenuModalData.fromAnnId.split('/');
                    const [, toAnnId] = connectorMenuModalData.toAnnId.split('/');
                    const result = deleteConnection(
                      fromAnnId,
                      toAnnId,
                      props.allAnnotationsForTour
                    );
                    props.applyAnnButtonLinkMutations(result);
                    setConnectorMenuModalData(initialConnectorModalData);
                  },
                  onCancel() { }
                });
              }}
            >
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
      )}
      {isMenuModalVisible(nodeMenuModalData.position) && (
        <Tags.MenuModalMask onClick={() => {
          ctxData.current = null;
          setNodeMenuModalData(initialAnnNodeModalData);
        }}
        >
          <Tags.MenuModal xy={nodeMenuModalData.position} onClick={prevent}>
            <div
              className="menu-item danger"
              onClick={() => {
                confirm({
                  title: 'Are you sure you want to delete this annotation?',
                  icon: <DeleteOutlined />,
                  onOk() {
                    const [screenId, annId] = nodeMenuModalData.annId.split('/');
                    const currentAnn = getAnnotationByRefId(annId, props.allAnnotationsForTour)!;
                    const main = props.tourOpts.main;
                    const result = deleteAnnotation(
                      { ...currentAnn, screenId: +screenId },
                      props.allAnnotationsForTour,
                      main,
                      true
                    );

                    props.applyAnnButtonLinkMutations(result);
                    // TODO[rrl] do this once api endpoint is completed
                    setTimeout(() => setNodeMenuModalData(initialAnnNodeModalData), 500);
                  },
                  onCancel() { }
                });
              }}
            >
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
      )}
      {isMenuModalVisible(addScreenModalData.position) && addScreenModalData.screenAnnotation && (
        <Tags.MenuModalMask onClick={() => {
          setAddScreenModalData(initialAddScreenModal);
        }}
        >
          <Tags.MenuModal xy={addScreenModalData.position} onClick={prevent}>
            <NewAnnotationPopup
              position={addScreenModalData.annotationPosition}
              allAnnotationsForTour={props.allAnnotationsForTour}
              annotation={addScreenModalData.screenAnnotation}
              tourDataOpts={props.tourOpts}
              hidePopup={() => setAddScreenModalData(initialAddScreenModal)}
              raiseAlertIfOpsDenied={props.setAlert}
              applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
            />
          </Tags.MenuModal>
        </Tags.MenuModalMask>
      )}
    </>
  );
}
