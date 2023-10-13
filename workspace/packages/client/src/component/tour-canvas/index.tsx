/* eslint-disable react/no-this-in-sfc */
import { nanoid } from 'nanoid';
import {
  BarsOutlined,
  DisconnectOutlined,
  HourglassOutlined,
  SisternodeOutlined,
} from '@ant-design/icons';
import {
  CmnEvtProp,
  CreateJourneyData,
  IAnnotationConfig,
  ITourDataOpts,
  ITourEntityHotspot,
  ScreenData
} from '@fable/common/dist/types';
import Modal from 'antd/lib/modal';
import { D3DragEvent, drag, DragBehavior, SubjectPosition } from 'd3-drag';
import { pointer as fromPointer, select, selectAll, Selection as D3Selection } from 'd3-selection';
import { curveBasis, line } from 'd3-shape';
import { D3ZoomEvent, ZoomBehavior, zoom, zoomIdentity } from 'd3-zoom';
import dagre from 'dagre';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { traceEvent } from '@fable/common/dist/amplitude';
import { interpolate } from 'd3-interpolate';
import * as GTags from '../../common-styled';
import {
  updateGrpIdForTimelineTillEnd,
  deleteAnnotation,
  deleteConnection,
  getAnnotationByRefId,
  reorderAnnotation,
  groupUpdatesByAnnotation,
  AnnotationSerialIdMap
} from '../annotation/ops';
import newScreenDark from '../../assets/new-screen-dark.svg';
import { Tx } from '../../container/tour-editor/chunk-sync-manager';
import { P_RespScreen, P_RespTour } from '../../entity-processor';
import {
  AllEdits,
  AnnotationPerScreen,
  ConnectedOrderedAnnGroupedByScreen,
  DestinationAnnotationPosition,
  EditItem,
  ElEditType,
  IAnnotationConfigWithScreen,
  NavFn,
  ScreenPickerData,
  TourDataChangeFn,
  onAnnCreateOrChangeFn
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
import NewAnnotationPopup from '../timeline/new-annotation-popup';
import PreviewAndEmbedGuide from '../../user-guides/preview-and-embed-guide';
import SelectorComponent from '../../user-guides/selector-component';
import { AMPLITUDE_EVENTS } from '../../amplitude/events';
import LoaderEditor from '../../container/loader-editor';
import ScreenEditor from '../screen-editor';
import CloseIcon from '../../assets/tour/close.svg';
import { UpdateScreenFn } from '../../action/creator';
import CreateJourney from '../../container/create-journey';
import Header, { HeaderProps } from '../header';
import DeleteIcon from '../../assets/icons/canvas-delete.svg';

const { confirm } = Modal;

const userGuides = [PreviewAndEmbedGuide];

type CanvasProps = {
  allAnnotationsForTour: AnnotationPerScreen[];
  navigate: NavFn;
  navigateBackToTour: () => void;
  toAnnotationId: string;
  onTourDataChange: TourDataChangeFn;
  tour: P_RespTour;
  timeline: ConnectedOrderedAnnGroupedByScreen,
  tourOpts: ITourDataOpts,
  applyAnnButtonLinkMutations: (mutations: AnnUpdateType) => void,
  applyAnnGrpIdMutations: (mutations: AnnUpdateType, tx: Tx) => void,
  commitTx: (tx: Tx) => void,
  setAlert: (msg?: string) => void,
  shouldShowScreenPicker: (screenPickerData: ScreenPickerData) => void;
  annotationSerialIdMap: AnnotationSerialIdMap;
  screen: P_RespScreen;
  screenData: ScreenData;
  allEdits: EditItem[];
  allAnnotationsForScreen: IAnnotationConfig[];
  onAnnotationCreateOrChange: onAnnCreateOrChangeFn;
  onScreenEditStart: () => void;
  onScreenEditFinish: () => void;
  onScreenEditChange: (editChunks: AllEdits<ElEditType>) => void;
  isScreenLoaded: boolean;
  shouldShowOnlyScreen: boolean;
  updateScreen: UpdateScreenFn;
  onTourJourneyChange: (newJourney: CreateJourneyData, tx?: Tx)=> void;
  headerProps: HeaderProps,
  tourJourney: CreateJourneyData
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

const ANN_NODE_HEIGHT_WIDTH_RATIO = 1.77765625;
const ANN_NODE_WIDTH = canvasGrid.gridSize * 5;
const ANN_NODE_HEIGHT = ANN_NODE_WIDTH / ANN_NODE_HEIGHT_WIDTH_RATIO;
const ANN_NODE_BORDER_RADIUS = 16;
const ANN_NODE_PADDING = 0;
const ANN_NODE_SEP = canvasGrid.gridSize * 2;
const ANN_EDITOR_ZOOM = 0.75;
const ANN_NODE_TOP_MARGIN_FOR_EDITOR = 20 * ANN_EDITOR_ZOOM;
const ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR = 40 * ANN_EDITOR_ZOOM;
const ANN_EDITOR_TOP = ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM
  + ANN_NODE_TOP_MARGIN_FOR_EDITOR + ANN_NODE_BOTTOM_MARGIN_FOR_EDITOR;

const SVG_ZOOM_EXTENT: [number, number] = [0.5, 2];

let dragTimer = 0;

const CONNECTOR_COLOR_NON_HOVERED = '#bdbdbd';
const CONNECTOR_COLOR_HOVERED = '#000000';
const CONNECTOR_HOTSPOT_COLOR_NON_HOVERED = 'transparent';
const CONNECTOR_HOTSPOT_COLOR_HOVERED = '#1503450a';
const TILE_STROKE_WIDTH_ON_HOVER = '6px';
const TILE_STROKE_WIDTH_DEFAULT = '4px';
const DROP_TARGET_PEEK_WIDTH = ANN_NODE_SEP / 2;
const DROP_TARGET_PEEK_GUTTER = ANN_NODE_SEP / 4;
const CREATE_JOURNEY_MODAL_WIDTH = 360;

const ANN_EDITOR_ANIM_DUR = 750;

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

const newScreenPickerData: ScreenPickerData = {
  screenPickerMode: 'navigate',
  annotation: null,
  position: DestinationAnnotationPosition.next,
  showCloseButton: true,
};

interface AnnEditorModal {
  annId: string,
  newSvgZoom: { x: number, y: number, k: number, centerX: number },
  applyTransitionToArrow: boolean,
  prevAnnId: string,
}

interface AnnWithCoords {
  screenId: number,
  annId: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

interface CreateJourneyModal {
  newSvgZoom: { x: number, y: number, k: number, centerX: number },
}

export default function TourCanvas(props: CanvasProps): JSX.Element {
  const isGuideArrowDrawing = useRef(0);
  const reorderPropsRef = useRef({ ...initialReorderPropsValue });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootGRef = useRef<SVGGElement | null>(null);
  const ctxData = useRef<CtxSelectionData | null>(null);
  const [connectorMenuModalData, setConnectorMenuModalData] = useState(initialConnectorModalData);
  const [nodeMenuModalData, setNodeMenuModalData] = useState(initialAnnNodeModalData);
  const [addScreenModalData, setAddScreenModalData] = useState(initialAddScreenModal);
  const [showLoaderEditor, setShowLoaderEditor] = useState(false);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown>>();
  const [annEditorModal, setAnnEditorModal] = useState<AnnEditorModal | null>(null);
  const annEditorModalRef = useRef<AnnEditorModal | null>(null);
  const [annWithCoords, setAnnWithCoords] = useState<AnnWithCoords[]>([]);
  const [selectedAnnId, setSelectedAnnId] = useState<string>('');
  const [showScreenEditor, setShowSceenEditor] = useState(false);
  const [showJourneyEditor, setShowJourneyEditor] = useState(false);
  const [firstAnnotations, setFirstAnnotations] = useState<IAnnotationConfigWithScreen[]>([]);
  const [createJourneyModal, setCreateJourneyModal] = useState<CreateJourneyModal | null>(null);
  const createJourneyModalRef = useRef<CreateJourneyModal | null>(null);
  const [showAnnText, setShowAnnText] = useState(false);
  const [newAnnPos, setNewAnnPos] = useState<null | DestinationAnnotationPosition>(null);
  const [screenEditorArrowLeft, setScreenEditorArrowLeft] = useState(0);

  const [init] = useState(1);
  const zoomPanState = dSaveZoomPanState(props.tour.rid);

  const drawGrid = (): void => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select('svg#fab-tour-canvas');
    const pattern = svg
      .selectAll('pattern')
      .data([1])
      .enter()
      .append('pattern')
      .attr('id', 'grid-pattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', canvasGrid.gridSize)
      .attr('height', canvasGrid.gridSize);

    pattern
      .append('line')
      .attr('x1', 0)
      .attr('x2', 100)
      .attr('stroke', '#E0E0E0');
    pattern
      .append('line')
      .attr('y1', 0)
      .attr('y2', 100)
      .attr('stroke', '#E0E0E0');
    // .append('rect')
    // .attr('width', canvasGrid.gridDotSize)
    // .attr('height', canvasGrid.gridDotSize)
    // .attr('fill', '#a4a4a4')
    // .attr('x', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2))
    // .attr('y', (canvasGrid.gridSize / 2) - (canvasGrid.gridDotSize / 2));

    // Append a "backdrop" rect to your svg, and fill it with your pattern.
    // You shouldn't need to touch this again after adding it.
    svg.select('#pattern-fill')
      .attr('fill', 'url(#grid-pattern)');
  };

  const updateGrid = (x: number, y: number, k: number): void => {
    const svgEl = svgRef.current;
    if (!svgEl) {
      return;
    }
    const svg = select(svgEl);
    svg.select('#grid-pattern')
      .attr('x', x)
      .attr('y', y)
      .attr('width', canvasGrid.gridSize * k)
      .attr('height', canvasGrid.gridSize * k)
      .selectAll('rect')
      .attr('x', (canvasGrid.gridSize * (k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('y', (canvasGrid.gridSize * (k / 2)) - (canvasGrid.gridDotSize / 2))
      .attr('opacity', Math.min(k, 1));
  };

  const nodeDraggable = (): DragBehavior<
    SVGGElement,
    AnnotationNode<dagre.Node>,
    AnnotationNode<dagre.Node> | SubjectPosition
  > => {
    let relX = 0;
    let relY = 0;
    let newX = 0;
    let newY = 0;
    let id = '';
    let startPoints: [x: number, y: number] = [0, 0];
    let hasDraggingStarted = false;
    const clickThreshold = 5;

    return drag<SVGGElement, AnnotationNode<dagre.Node>>()
      .on('start', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
      ) {
        if (createJourneyModalRef.current) return;

        const [eventX, eventY] = fromPointer(event, rootGRef.current);
        startPoints = [eventX, eventY];
        const selectedScreen = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        const data = selectedScreen.datum();
        id = data.id;
      })
      .on('drag', function (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
        d: any
      ) {
        prevent(event.sourceEvent);
        if (createJourneyModalRef.current) return;

        if (!hasDraggingStarted) {
          const [eventX, eventY] = fromPointer(event, rootGRef.current);
          const [startX, startY] = startPoints;

          const isDraggingStarted = Math.abs(startX - eventX) > clickThreshold
          || Math.abs(startY - eventY) > clickThreshold;

          if (!isDraggingStarted) return;

          hasDraggingStarted = true;
          const selectedScreen = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
          const data = selectedScreen.datum();
          // Find out where in the box the mousedown for drag is fired relative to the current box.
          relX = eventX - (data.storedData!.x - data.storedData!.width / 2);
          relY = eventY - (data.storedData!.y - data.storedData!.height / 2);
          id = data.id;
          reorderPropsRef.current.currentDraggedAnnotationId = id;

          selectedScreen.raise(); // moves the dragged element to the end simulating higher zindex
          selectedScreen.selectAll('rect.tg-hide')
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
        }

        const [x, y] = fromPointer(event, rootGRef.current);
        newX = x - relX;
        newY = y - relY;

        // eslint-disable-next-line react/no-this-in-sfc
        const el = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
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
      .on('end', (
        event: D3DragEvent<SVGForeignObjectElement, AnnotationNode<dagre.Node>, AnnotationNode<dagre.Node>>,
      ) => {
        if (createJourneyModalRef.current) return;

        const allNodesParentParent = select('g#fab-tour-canvas-main');
        allNodesParentParent.selectAll('rect.tg-show')
          .classed('tg-show', false)
          .classed('tg-hide', true)
          .classed('rev', false)
          .classed('sel', false);

        select('g.connectors').classed('fade', false);

        hasDraggingStarted = false;

        const [eventX, eventY] = fromPointer(event, rootGRef.current);
        const [startX, startY] = startPoints;

        const isClick = Math.abs(startX - eventX) < clickThreshold || Math.abs(startY - eventY) < clickThreshold;
        if (isClick) {
          resetNodePos();
          selectAnn(id);
          return;
        }

        if (reorderPropsRef.current.isCursorOnDropTarget) {
          confirm({
            title: 'Do you want to reorder annotation?',
            icon: <SisternodeOutlined />,
            onOk() {
              traceEvent(
                AMPLITUDE_EVENTS.ANNOTATION_MOVED,
                {
                  annotation_op_location: 'canvas'
                },
                [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
              );
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
    props.applyAnnGrpIdMutations({
      groupedUpdates,
      updates: [],
      main: null,
      deletionUpdate: null,
      status: 'accepted'
    }, tx);

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
    if (e.target.name !== 'screen-img'
      && e.target.name !== 'img-submit-btn'
      && e.target.getAttribute('for') !== 'screen-image'
    ) {
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

  const handleUserZoomPanWhenAnnEditorIsShown = (x: number): void => {
    const { y: currZoomY } = annEditorModalRef.current!.newSvgZoom;
    updateGrid(x, currZoomY, ANN_EDITOR_ZOOM);
    select(rootGRef.current!).attr('transform', `translate(${x}, ${currZoomY}) scale(${ANN_EDITOR_ZOOM})`);
    setAnnEditorModal(prev => ({ ...prev!, newSvgZoom: { ...prev!.newSvgZoom, x, }, applyTransitionToArrow: false }));
  };

  useEffect(() => {
    annEditorModalRef.current = annEditorModal;

    if (!zoomBehaviorRef.current) return;

    if (annEditorModal) {
      zoomBehaviorRef.current.scaleExtent([ANN_EDITOR_ZOOM, ANN_EDITOR_ZOOM]);
      select(svgRef.current).attr('cursor', 'ew-resize');
    } else {
      zoomBehaviorRef.current.scaleExtent(SVG_ZOOM_EXTENT);
      select(svgRef.current).attr('cursor', 'move');
    }
  }, [annEditorModal]);

  useEffect(() => {
    const svg = svgRef.current;
    const rootG = rootGRef.current;
    if (svg && rootG) {
      drawGrid();
      select(svgRef.current).attr('cursor', 'move');

      const [sk, sx, sy] = zoomPanState.get();
      const initialZoom = sk !== null ? sk : canvasGrid.initial.scale;
      const initialPan = sx !== null && sy !== null ? [sx, sy] : [canvasGrid.initial.tx, canvasGrid.initial.ty];

      const z = zoom<SVGSVGElement, unknown>()
        .interpolate(interpolate)
        .scaleExtent(SVG_ZOOM_EXTENT)
        .on('zoom', null)
        .on('zoom', (e: D3ZoomEvent<SVGGElement, unknown>) => {
          /**
           * e.sourceEvent is null for programmatic zoom/pan change but is present when user uses the mouse.
           * Ideally this is to determine if user is initiating the zoom or is it triggered programatically
           */
          // when user zooms when Ann Editor is shown, only pan on X-axis
          const isMouseZoomWhenAnnEditorShown = annEditorModalRef.current && e.sourceEvent;
          if (isMouseZoomWhenAnnEditorShown) {
            handleUserZoomPanWhenAnnEditorIsShown(e.transform.x);
            return;
          }

          const isMouseZoomWhenCreateJourneyShown = createJourneyModalRef.current && e.sourceEvent;
          if (isMouseZoomWhenCreateJourneyShown) {
            const x = e.transform.x;
            const y = e.transform.y;
            const k = e.transform.k;
            setCreateJourneyModal(prev => ({ ...prev!,
              newSvgZoom: { ...prev!.newSvgZoom, x, y, k },
              applyTransitionToArrow: false }));
          }

          // don't save zoom value if zoom is triggered when ann editor is shown
          if (!restrictCanvasActions()) {
            zoomPanState.set(e.transform.k, e.transform.x, e.transform.y);
          }

          updateGrid(e.transform.x, e.transform.y, e.transform.k);
          select(rootG).attr('transform', e.transform.toString());
        });

      zoomBehaviorRef.current = z;

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
            if (restrictCanvasActions()) return;
            const relativeCoord = fromPointer(e, rootG);
            svgSel.select<SVGGElement>('g.connectors')
              .selectAll<SVGPathElement, SVGGElement>('path.guide-arr')
              .attr('d', pEl => {
                const d = select<SVGGElement, AnnotationNode<dagre.Node>>(pEl).datum();
                return formPathUsingPoints([{
                  x: d.storedData!.x + d.storedData!.width / 2,
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
      .style('cursor', 'pointer')
      .on('mousedown', prevent)
      .on('mouseup', prevent)
      .on('click', function (e, d) {
        prevent(e);
        if (createJourneyModalRef.current) return;
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

    const [nodeWithDim, edges] = formAnnotationNodes(
      props.timeline,
      { width: ANN_NODE_WIDTH, height: ANN_NODE_HEIGHT }
    );

    const gBoundData = g
      .selectAll<SVGGElement, number>('g.connectors')
      .data([props.allAnnotationsForTour], () => 1);

    const connectorG = gBoundData
      .enter()
      .append('g')
      .attr('class', 'connectors')
      .merge(gBoundData);

    if (nodeWithDim.length === 0 && !props.shouldShowOnlyScreen) {
      props.shouldShowScreenPicker({ ...newScreenPickerData, showCloseButton: false });
    }

    const nodeLookup = nodeWithDim.reduce((hm, n) => {
      hm[n.id] = n;
      return hm;
    }, {} as Record<string, AnnotationNode<dagre.Node>>);

    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: 'LR', ranksep: ANN_NODE_SEP, nodesep: ANN_NODE_SEP });
    graph.setDefaultEdgeLabel(() => ({}));
    nodeWithDim.forEach(node => graph.setNode(node.id, { label: node.id, width: node.width, height: node.height }));
    edges.forEach(edge => graph.setEdge(edge[0], edge[1]));
    dagre.layout(graph);

    const newNodesWithPositions: AnnotationNode<dagre.Node>[] = graph.nodes().map(v => {
      const graphNode = graph.node(v);
      const logicalNode = nodeLookup[graphNode.label!];
      logicalNode.storedData = graphNode;
      logicalNode.origStoredData = { ...graphNode };
      return logicalNode;
    });
    // TODO Keep the x, y, width, height in d3 only.
    // Right now we save it as part of d3 & react. That means this map code will be part of the above map code
    setAnnWithCoords(graph.nodes().map(v => {
      const graphNode = graph.node(v);
      const [screenId, annId] = graphNode.label!.split('/');
      const { x, y, width, height } = graphNode;
      return { annId, screenId: +screenId, x, y, width, height } as AnnWithCoords;
    }));

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
            if (restrictCanvasActions()) return;
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
            if (restrictCanvasActions()) return;
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
      .style('filter', 'drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))')
      .style('cursor', 'pointer')
      .on('mouseover', null)
      .on('mouseover', function () {
        const gEl = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        if ((annEditorModalRef.current && annEditorModalRef.current.annId === gEl.datum().annotation.refId)
        || createJourneyModalRef.current) return;
        setAnnNodeSelectionStyle(gEl, Tags.TILE_STROKE_COLOR_ON_HOVER);
      })
      .on('mousedown', null)
      .on('mouseup', null)
      .on('mouseup', function (e: MouseEvent) {
        prevent(e);
        if (createJourneyModalRef.current) return;
        const toEl = this;
        const fromEl = connectorG.selectAll<SVGPathElement, SVGGElement>('path.guide-arr').datum();
        const fromElSel = select<SVGGElement, AnnotationNode<dagre.Node>>(fromEl);
        const fromElData = fromElSel.datum();
        const toElData = select<SVGGElement, AnnotationNode<dagre.Node>>(toEl).datum();

        isGuideArrowDrawing.current = 0;
        if (fromElData.id === toElData.id) return;
        if (annEditorModalRef.current) return;
        const allAnns = g.selectAll<SVGGElement, AnnotationPerScreen[]>('g.connectors').datum();
        const lookupMap = getAnnotationLookupMap(allAnns);
        updateConnection(allAnns, lookupMap, fromElData.id, toElData.id, props.onTourDataChange);

        hideGuideConnector(connectorG.selectAll('path.guide-arr'));
      })
      .on('mouseout', null)
      .on('mouseout', function () {
        const gEl = select<SVGGElement, AnnotationNode<dagre.Node>>(this);
        if (annEditorModalRef.current && annEditorModalRef.current.annId === gEl.datum().annotation.refId) return;
        resetAnnNodeSelectionStyle(gEl);
      })
      .call(p => {
        // background rect which covers the entire annotation node
        p.append('rect')
          .attr('class', 'bg')
          .attr('rx', ANN_NODE_BORDER_RADIUS)
          .attr('ry', ANN_NODE_BORDER_RADIUS)
          .attr('x', '0')
          .attr('y', '0')
          .attr('width', d => d.width)
          .attr('height', d => d.height);

        p
          .append('image')
          .attr('preserveAspectRatio', 'xMidYMid meet')
          .attr('clip-path', 'url(#fit-rect)');

        p.append('foreignObject')
          .attr('class', 'step-num')
          .call(fo => {
            fo
              .append('xhtml:div')
              .call(div => {
                div.append('xhtml:p');
              });
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
          .attr('rx', ANN_NODE_BORDER_RADIUS)
          .attr('ry', ANN_NODE_BORDER_RADIUS)
          .attr('class', 'interaction-marker')
          .style('fill', 'none')
          .style('stroke', 'transparent')
          .style('stroke-width', TILE_STROKE_WIDTH_DEFAULT);

        const leftPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(leftPlusG, 'prev');
        const rightPlusG = p.append<SVGGElement>('g');
        createPlusIconGroup(rightPlusG, 'next');

        const MENU_ICON_WIDTH = 20;
        const MENU_ICON_PADDING = 10.5;
        const menug = p
          .append('g')
          .attr('transform', d => `translate(${d.width - MENU_ICON_WIDTH - MENU_ICON_PADDING}, ${MENU_ICON_PADDING})`)
          .style('cursor', 'pointer')
          .on('mousedown', prevent)
          .on('mouseup', prevent)
          .on('click', function (e) {
            prevent(e);
            if (createJourneyModalRef.current) return;
            const con = svgRef.current!.parentNode as HTMLDivElement;
            const relCoord = fromPointer(e, con);
            const d = select<SVGGElement, AnnotationNode<dagre.Node>>(this).datum();
            setNodeMenuModalData({
              position: getLRPosition(relCoord, con),
              annId: d.id
            });
          });

        menug
          .append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', MENU_ICON_WIDTH)
          .attr('width', MENU_ICON_WIDTH)
          .attr('rx', MENU_ICON_WIDTH / 2)
          .attr('class', 'menuicnovrly')
          .attr('fill', 'transparent');

        menug
          .append('path')
          .attr('class', 'menuicn')
          .attr('fill', Tags.MENU_ICN_DOTS_COLOR)
          .attr('transform', d => 'translate(-2, -2)')
          // eslint-disable-next-line max-len
          .attr('d', 'M11.997 17.3333C11.7212 17.3333 11.4861 17.2351 11.2917 17.0387C11.0972 16.8423 11 16.6062 11 16.3304C11 16.0546 11.0982 15.8194 11.2946 15.625C11.491 15.4306 11.7271 15.3333 12.003 15.3333C12.2788 15.3333 12.5139 15.4315 12.7083 15.628C12.9028 15.8244 13 16.0605 13 16.3363C13 16.6121 12.9018 16.8472 12.7054 17.0417C12.509 17.2361 12.2729 17.3333 11.997 17.3333ZM11.997 12.6667C11.7212 12.6667 11.4861 12.5685 11.2917 12.372C11.0972 12.1756 11 11.9395 11 11.6637C11 11.3879 11.0982 11.1528 11.2946 10.9583C11.491 10.7639 11.7271 10.6667 12.003 10.6667C12.2788 10.6667 12.5139 10.7649 12.7083 10.9613C12.9028 11.1577 13 11.3938 13 11.6696C13 11.9454 12.9018 12.1806 12.7054 12.375C12.509 12.5694 12.2729 12.6667 11.997 12.6667ZM11.997 8C11.7212 8 11.4861 7.90179 11.2917 7.70537C11.0972 7.50897 11 7.27286 11 6.99704C11 6.72124 11.0982 6.48611 11.2946 6.29167C11.491 6.09722 11.7271 6 12.003 6C12.2788 6 12.5139 6.09821 12.7083 6.29463C12.9028 6.49103 13 6.72714 13 7.00296C13 7.27876 12.9018 7.51389 12.7054 7.70833C12.509 7.90278 12.2729 8 11.997 8Z');

        const connectorCircleG = p
          .append('g')
          .attr('transform', d => `translate(${d.width}, ${d.height / 2})`)
          .style('cursor', 'pointer');

        connectorCircleG
          .append('circle')
          .attr('class', 'connector-indicator')
          .attr('cx', '0')
          .attr('cy', '0')
          .attr('r', '5')
          .attr('fill', 'transparent')
          .attr('stroke-width', '2px');
      })
      .merge(nodeG)
      .call(updateNodePos)
      .call(nodeDraggable())
      .call(p => {
        const bgEl = p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.bg')
          .data(p.data(), d => d.id);

        bgEl
          .merge(bgEl)
          .style('fill', '#e1e1e1');

        p.selectAll<SVGImageElement, AnnotationNode<dagre.Node>>('image')
          .data(p.data(), d => d.id)
          .attr('href', d => d.imageUrl)
          .attr('x', ANN_NODE_PADDING)
          .attr('width', d => d.width - ANN_NODE_PADDING * 2)
          .attr('y', ANN_NODE_PADDING);

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.r')
          .data(p.data(), d => d.id);

        p.selectAll<SVGRectElement, AnnotationNode<dagre.Node>>('rect.droptg.l')
          .data(p.data(), d => d.id)
          .style('visibility', 'visible')
          .filter((d) => d.localIdx !== 0)
          .style('visibility', 'hidden');

        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-next').data(p.data(), d => d.id);
        p.selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.actnicngrp-prev').data(p.data(), d => d.id);

        const connectorIndicator = p
          .selectAll<SVGCircleElement, AnnotationNode<dagre.Node>>('circle.connector-indicator')
          .data(p.data(), d => d.id);

        connectorIndicator
          .merge(connectorIndicator)
          .on('mouseover', function (e: MouseEvent) {
            const el = select<SVGCircleElement, AnnotationNode<dagre.Node>>(this);
            el.attr('r', 8);
          })
          .on('mouseout', function (e: MouseEvent) {
            const el = select<SVGCircleElement, AnnotationNode<dagre.Node>>(this);
            el.attr('r', 5);
          })
          .on('mousedown', function (e: MouseEvent) {
            prevent(e);
            if (createJourneyModalRef.current) return;
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
          });

        const stepNumCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.step-num')
          .data(p.data(), d => d.id);

        stepNumCon.merge(stepNumCon)
          .attr('width', d => d.width)
          .attr('height', 45)
          .attr('x', 0)
          .attr('y', d => d.height - 45)
          .style('border-radius', `${ANN_NODE_BORDER_RADIUS}px`)
          .call(fo => {
            const stepNumWrapper = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('div')
              .data(p.data(), d => d.id);

            stepNumWrapper
              .merge(stepNumWrapper)
              .style('display', 'flex')
              .style('align-items', 'flex-end')
              .style('padding-right', '15px')
              .style('height', '100%')
              .style('width', 'fit-content')
              .style('background', 'radial-gradient(100% 120% at 0px 120%, rgba(13, 18, 22, 0.7), rgba(0, 0, 0, 0))');

            const stepNumber = stepNumWrapper.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            stepNumber.merge(stepNumber)
              .style('width', d => d.width)
              .style('height', '24px')
              .style('display', 'inline-block')
              .style('text-align', 'left')
              .style('font-weight', 600)
              .style('margin', 0)
              .style('font-size', '16px')
              .style('text-shadow', 'rgba(0, 0, 0, 1) 2px 0px 15px, rgb(0, 0, 0) 2px 0px 20px')
              .style('color', 'white')
              .style('padding', '2px 8px')
              .text(d => `${d.screenTitle.substring(0, 30)}${d.screenTitle.length > 30 ? '...' : ''}`);
          });

        const annTextCon = p
          .selectAll<SVGForeignObjectElement, AnnotationNode<dagre.Node>>('foreignObject.ann-info')
          .data(p.data(), d => d.id);

        annTextCon
          .merge(annTextCon)
          .style('display', () => (showAnnText ? 'block' : 'none'))
          .attr('width', d => d.width)
          .attr('height', d => d.height)
          .style('border-radius', `${ANN_NODE_BORDER_RADIUS}px`)
          .attr('x', 0)
          .attr('y', 0)
          .call(fo => {
            const annText = fo.selectAll<HTMLParagraphElement, AnnotationNode<dagre.Node>>('p')
              .data(p.data(), d => d.id);

            annText
              .merge(annText)
              .style('width', d => d.width)
              .style('display', 'block')
              .style('height', '100%')
              .style('margin', 0)
              .style('font-size', '16px')
              .style('color', 'black')
              .style('padding', '2px')
              .style('display', 'flex')
              .style('align-items', 'center')
              .style('justify-content', 'center')
              .style('cursor', 'pointer')
              .style('text-align', 'center')
              .style('background', 'rgba(0, 0, 0, 0.2)')
              .style('color', 'black')
              .text(d => `${d.text!.substring(0, 80)}${d.text!.length > 80 ? '...' : ''}`);
          });

        p.selectAll<SVGTextElement, AnnotationNode<dagre.Node>>('rect.interaction-marker')
          .data(p.data(), d => d.id)
          .attr('width', d => d.width)
          .attr('height', d => d.height);
      });

    nodeG
      .exit()
      .remove();
  }, [props.allAnnotationsForTour, showAnnText]);

  function resetNodePos(): void {
    const g = select(rootGRef.current);
    g
      .selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .transition()
      .attr(
        'transform',
        d => {
          const pos = d.origStoredData!;
          const x = pos.x - pos.width / 2;
          const y = pos.y - pos.height / 2;
          return `translate(${x}, ${y})`;
        }
      );

    const lines = line<EdgeWithData>()
      .curve(curveBasis)
      .x(d => d.x)
      .y(d => d.y);

    g
      .selectAll('rect.connectors')
      .selectAll<SVGGElement, EdgeWithData>('g.edgegrp')
      .call(p => {
        ['path.edgeconn', 'path.edgehotspot'].forEach(sel => {
          p.selectAll<SVGPathElement, EdgeWithData>(sel)
            .data(p.data(), d => `${d.srcId}:${d.destId}`)
            .attr('d', attr => lines(attr.points as any));
        });
      });
  }
  const setAnnNodeSelectionStyle = (
    node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>,
    color: string,
  ): void => {
    node.selectAll('rect.interaction-marker')
      .style('stroke-width', TILE_STROKE_WIDTH_ON_HOVER)
      .style('stroke', color);

    node.selectAll('circle.plusicnbase')
      .style('fill', color);

    node.selectAll('path.menuicn')
      .style('fill', Tags.TILE_STROKE_COLOR_DEFAULT);

    node.selectAll('rect.menuicnovrly')
      .style('fill', color);

    node.selectAll('path.plusicn')
      .style('stroke', Tags.TILE_STROKE_COLOR_DEFAULT);

    if (!annEditorModalRef.current) {
      node
        .selectAll('circle.connector-indicator')
        .style('stroke', color)
        .style('fill', 'white');
    }
  };

  const resetAnnNodeSelectionStyle = (
    node: D3Selection<SVGGElement, AnnotationNode<dagre.Node>, any, any>
  ): void => {
    node.selectAll('rect.interaction-marker')
      .style('stroke', 'transparent');

    node.selectAll('circle.plusicnbase')
      .style('fill', 'transparent');

    node.selectAll('path.menuicn')
      .style('fill', 'transparent');

    node.selectAll('rect.menuicnovrly')
      .style('fill', 'transparent');

    node.selectAll('path.plusicn')
      .style('stroke', 'transparent');

    node
      .selectAll('circle.connector-indicator')
      .style('stroke', 'transparent')
      .style('fill', 'transparent');
  };

  const getAnnModalArrowLeftPos = (annCoordsX: number, newSvgZoomX: number): number => {
    const left = newSvgZoomX + (annCoordsX * ANN_EDITOR_ZOOM);
    return left;
  };

  const zoomThenPan = (
    currZoom: { x: number, y: number, k: number },
    intermediateZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number }
  ): void => {
    const currZoomTransform = zoomIdentity
      .translate(currZoom.x, currZoom.y)
      .scale(currZoom.k);
    const onlyZoomTransform = zoomIdentity
      .translate(intermediateZoom.x, intermediateZoom.y)
      .scale(intermediateZoom.k);
    const finalTransform = zoomIdentity
      .translate(newZoom.x!, newZoom.y!)
      .scale(newZoom.k!);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .call(zoomBehaviorRef.current!.transform, currZoomTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, onlyZoomTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  const panThenZoom = (
    intermediateZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number }
  ): void => {
    const onlyTranslateTransform = zoomIdentity
      .translate(intermediateZoom.x, intermediateZoom.y)
      .scale(intermediateZoom.k);
    const finalTransform = zoomIdentity
      .translate(newZoom.x, newZoom.y)
      .scale(newZoom.k);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, onlyTranslateTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  const zoomAndPan = (
    currZoom: { x: number, y: number, k: number },
    newZoom: { x: number, y: number, k: number },
  ): void => {
    const currTransform = zoomIdentity
      .translate(currZoom.x, currZoom.y)
      .scale(currZoom.k);

    const finalTransform = zoomIdentity
      .translate(newZoom.x, newZoom.y)
      .scale(newZoom.k);

    select<SVGSVGElement, unknown>(svgRef.current!)
      .call(zoomBehaviorRef.current!.transform, currTransform)
      .transition()
      .duration(ANN_EDITOR_ANIM_DUR)
      .call(zoomBehaviorRef.current!.transform, finalTransform);
  };

  useEffect(() => {
    createJourneyModalRef.current = createJourneyModal;
  }, [createJourneyModal]);

  useEffect(() => {
    // reset previously selected ann's selection marker
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);

    if (!annWithCoords.length) return;

    if (!selectedAnnId && annEditorModal) {
      const [k, x, y,] = zoomPanState.getValueFromBuffer();
      const centerX = annEditorModal.newSvgZoom.centerX;

      const translateXWithoutZoom = window.innerWidth / 2 - (centerX * k!);

      const newSvgZoom = annEditorModal.newSvgZoom;

      zoomThenPan(
        { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
        { x: translateXWithoutZoom, y: annEditorModal.newSvgZoom.y * k!, k: k! },
        { x: x!, y: y!, k: k! }
      );
      setAnnEditorModal(null);
      setShowSceenEditor(false);
      return;
    }

    if (!selectedAnnId) return;

    // set selection marker
    const annNode = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
      .filter((d) => d.annotation.refId === selectedAnnId);
    setAnnNodeSelectionStyle(annNode, Tags.TILE_STROKE_COLORON_SELECT);

    const annCoords = annWithCoords.find(ann => ann.annId === selectedAnnId);

    if (!annCoords) return;

    if (annEditorModal) {
      const { x: zoomAfterAnnModalShownX } = annEditorModal.newSvgZoom;
      const startX = zoomAfterAnnModalShownX + annCoords.x * ANN_EDITOR_ZOOM - (annCoords.width * ANN_EDITOR_ZOOM) / 2;
      const endY = zoomAfterAnnModalShownX + annCoords.x * ANN_EDITOR_ZOOM + (annCoords.width * ANN_EDITOR_ZOOM) / 2;

      const isAnnNodeInViewPort = startX > 0 && endY * ANN_EDITOR_ZOOM < window.innerWidth * ANN_EDITOR_ZOOM;
      if (isAnnNodeInViewPort) {
        setAnnEditorModal(prev => ({
          ...prev!,
          annId: selectedAnnId,
          applyTransitionToArrow: true,
          prevAnnId: getPrevSelectedAnnIdForEditor(prev, selectedAnnId),
        }));
        setScreenEditorArrowLeft(getAnnModalArrowLeftPos(annCoords.x, zoomAfterAnnModalShownX));
        return;
      }
    }

    const [currK] = zoomPanState.getValueFromBuffer();
    const rowHeight = ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM + ANN_NODE_SEP * ANN_EDITOR_ZOOM;
    const row = Math.floor((annCoords.y * ANN_EDITOR_ZOOM) / rowHeight);
    const newY = -(row * rowHeight) + ANN_NODE_TOP_MARGIN_FOR_EDITOR;

    const newX = window.innerWidth / 2 - (annCoords.x * ANN_EDITOR_ZOOM);

    const translateXWithoutZoom = window.innerWidth / 2 - (annCoords.x * currK!);

    if (annEditorModal) {
      const newSvgZoom = annEditorModal.newSvgZoom;
      zoomAndPan(
        { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
    } else {
      panThenZoom(
        { x: translateXWithoutZoom, y: newY * currK!, k: currK! },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
      setTimeout(() => {
        setShowSceenEditor(true);
      }, ANN_EDITOR_ANIM_DUR * 2);
    }

    setAnnEditorModal(prev => ({
      annId: selectedAnnId,
      newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: annCoords.x },
      applyTransitionToArrow: true,
      prevAnnId: getPrevSelectedAnnIdForEditor(prev, selectedAnnId),
    }));
    setScreenEditorArrowLeft(getAnnModalArrowLeftPos(annCoords.x, newX));
  }, [selectedAnnId, annWithCoords]);

  useEffect(() => {
    setSelectedAnnId(props.toAnnotationId);
  }, [props.toAnnotationId]);

  const resetSelectedAnn = (): void => {
    setSelectedAnnId('');
    props.navigateBackToTour();
  };

  const selectAnn = (annQualificationUri: string): void => {
    props.navigate(annQualificationUri, 'annotation-hotspot');
    setNewAnnPos(null);
    setSelectedAnnId(annQualificationUri.split('/')[1]);
  };

  const getPrevSelectedAnnIdForEditor = (prevAnnEditorData: AnnEditorModal | null, selectedAnnRid: string): string => {
    if (!prevAnnEditorData) return '';

    if (prevAnnEditorData.annId === selectedAnnRid) return prevAnnEditorData.prevAnnId;

    return prevAnnEditorData.annId;
  };

  const handleReselectionOfPrevAnnWhenCurAnnIsDeleted = (deletedAnnRid: string): void => {
    if (deletedAnnRid !== selectedAnnId) return;
    if (!annEditorModal) return;

    if (!annEditorModal.prevAnnId) {
      resetSelectedAnn();
      return;
    }

    const prevAnn = getAnnotationByRefId(annEditorModal!.prevAnnId, props.allAnnotationsForTour);
    if (!prevAnn) {
      resetSelectedAnn();
    } else {
      selectAnn(`${prevAnn!.screenId}/${annEditorModal!.prevAnnId}`);
    }
  };

  const viewBox = `0 0 ${window.innerWidth} ${window.innerHeight}`;

  const isAnnSelected = selectedAnnId && annEditorModal;

  const getFirstAnnotations = () : IAnnotationConfigWithScreen[] => {
    if (firstAnnotations.length !== 0) {
      zoomAnnInView(firstAnnotations[0].refId);
      return firstAnnotations;
    }
    const firstScreens : IAnnotationConfigWithScreen[] = [];
    props.timeline.forEach((flow) => {
      firstScreens.push(flow[0][0]);
    });
    zoomAnnInView(firstScreens[0].refId);
    setFirstAnnotations(firstScreens);
    return firstScreens;
  };

  const zoomAnnInView = (annRefId: string) : void => {
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);

    const annCoords = annWithCoords.find(ann => ann.annId === annRefId)!;
    const [currK] = zoomPanState.get();
    const rowHeight = ANN_NODE_HEIGHT * ANN_EDITOR_ZOOM + ANN_NODE_SEP * ANN_EDITOR_ZOOM;
    const row = Math.floor((annCoords.y * ANN_EDITOR_ZOOM) / rowHeight);
    const newY = -(row * rowHeight) + ANN_NODE_TOP_MARGIN_FOR_EDITOR;
    const newX = annCoords.x * ANN_EDITOR_ZOOM + CREATE_JOURNEY_MODAL_WIDTH;

    if (createJourneyModal) {
      const { x: zoomAfterAnnModalShownX, y: zoomAfterAnnModalShownY } = createJourneyModal.newSvgZoom;
      const startY = zoomAfterAnnModalShownY + annCoords.y * ANN_EDITOR_ZOOM - (annCoords.height * ANN_EDITOR_ZOOM) / 2;
      const endY = zoomAfterAnnModalShownY + annCoords.y * ANN_EDITOR_ZOOM + (annCoords.height * ANN_EDITOR_ZOOM) / 2;

      const startX = zoomAfterAnnModalShownX + annCoords.x * ANN_EDITOR_ZOOM - (annCoords.width * ANN_EDITOR_ZOOM) / 2;
      const isAnnNodeYInViewPort = startY > 0 && endY * ANN_EDITOR_ZOOM < window.innerHeight * ANN_EDITOR_ZOOM;
      const isAnnNodeXInViewPort = startX > window.innerWidth * ANN_EDITOR_ZOOM
      && startX * ANN_EDITOR_ZOOM < window.innerWidth * ANN_EDITOR_ZOOM;

      const annNode = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node')
        .filter((d) => d.annotation.refId === annRefId);
      setAnnNodeSelectionStyle(annNode, Tags.TILE_STROKE_COLOR_ON_HOVER);
      if (isAnnNodeYInViewPort && isAnnNodeXInViewPort) {
        return;
      }
      const newSvgZoom = createJourneyModal.newSvgZoom;

      zoomAndPan(
        { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
        { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
      );
      setCreateJourneyModal({ newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: annCoords.x } });
      return;
    }

    panThenZoom(
      { x: newX, y: newY * currK!, k: currK! },
      { x: newX, y: newY, k: ANN_EDITOR_ZOOM }
    );
    setCreateJourneyModal({ newSvgZoom: { x: newX, y: newY, k: ANN_EDITOR_ZOOM, centerX: annCoords.x } });
    setTimeout(() => {
      setShowJourneyEditor(true);
    }, ANN_EDITOR_ANIM_DUR * 2);
  };

  const resetCreateJourneyZoom = () : void => {
    const annNodes = selectAll<SVGGElement, AnnotationNode<dagre.Node>>('g.node');
    resetAnnNodeSelectionStyle(annNodes);

    const [k, x, y,] = zoomPanState.get();
    const centerX = createJourneyModal!.newSvgZoom.centerX;

    const translateXWithoutZoom = CREATE_JOURNEY_MODAL_WIDTH + (centerX * k!);

    const newSvgZoom = createJourneyModal!.newSvgZoom;
    // while closing
    zoomThenPan(
      { x: newSvgZoom.x, y: newSvgZoom.y, k: newSvgZoom.k },
      { x: translateXWithoutZoom, y: newSvgZoom.y * k!, k: k! },
      { x: x!, y: y!, k: k! }
    );
    setCreateJourneyModal(null);
  };

  const restrictCanvasActions = () : boolean => Boolean(annEditorModalRef.current || createJourneyModalRef.current);

  return (
    <>
      <GTags.ColCon>
        <GTags.HeaderCon>
          <Header
            {...props.headerProps}
            canvasOptions={{
              resetZoom: () => {
                if (annEditorModal) return;
                const transform = zoomIdentity
                  .translate(canvasGrid.initial.tx, canvasGrid.initial.ty)
                  .scale(canvasGrid.initial.scale);

                select<SVGSVGElement, unknown>(svgRef.current!)
                  .transition()
                  .duration(ANN_EDITOR_ANIM_DUR)
                  .call(zoomBehaviorRef.current!.transform, transform);
              },
              showAnnText,
              setShowAnnText
            }}
          />
        </GTags.HeaderCon>
        <GTags.BodyCon
          style={{
            height: '100%',
            background: '#fff',
            overflowY: 'hidden',
            position: 'relative',
          }}
        >
          <Tags.SVGCanvas
            id="fab-tour-canvas"
            viewBox={viewBox}
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="fit-rect">
                <rect
                  x={ANN_NODE_PADDING}
                  y={ANN_NODE_PADDING}
                  rx={ANN_NODE_BORDER_RADIUS}
                  ry={ANN_NODE_BORDER_RADIUS}
                  width={ANN_NODE_WIDTH - 2 * ANN_NODE_PADDING}
                  height={ANN_NODE_HEIGHT - 2 * ANN_NODE_PADDING}
                />
              </clipPath>
              <marker
                id="triangle-arrowhead"
                markerWidth="5"
                markerHeight="10"
                refX="5"
                refY="5"
                orient="auto"
              >
                <path d="M 0 0 5 5 0 10 Z" style={{ fill: CONNECTOR_COLOR_NON_HOVERED }} />
              </marker>
            </defs>
            <rect width="100%" height="100%" fill="#FAFAFA" />
            <rect id="pattern-fill" width="100%" height="100%" />
            <g id="fab-tour-canvas-main" ref={rootGRef} />
          </Tags.SVGCanvas>

          {
        !annEditorModal && (
          <Tags.CanvasMenuCon
            onClick={prevent}
            onMouseUp={prevent}
            onMouseDown={prevent}
          >
            <Tags.CanvasMenuItemCon id="new-screen-btn">
              <Tooltip
                title="Add a new screen to this tour"
                overlayStyle={{ fontSize: '0.75rem' }}
                placement="right"
              >
                <div>
                  <Button
                    onClick={() => props.shouldShowScreenPicker(newScreenPickerData)}
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

            <Tags.CanvasMenuItemCon id="loader-btn">
              <Tooltip
                title="Design your loader"
                overlayStyle={{ fontSize: '0.75rem' }}
                placement="right"
              >
                <div>
                  <Button
                    onClick={() => setShowLoaderEditor(true)}
                    icon={<HourglassOutlined style={{ fontSize: '1.4rem', fontWeight: 500, color: 'black' }} />}
                    size="middle"
                    style={{
                      margin: 0,
                      border: '1px solid black',
                    }}
                  />
                </div>
              </Tooltip>
            </Tags.CanvasMenuItemCon>

            <Tags.CanvasMenuItemCon id="journey-btn">
              <Tooltip
                title={props.tourJourney.flows.length === 0 ? 'Create a Journey' : 'Edit journey'}
                overlayStyle={{ fontSize: '0.75rem' }}
                placement="right"
              >
                <div style={{ position: 'relative' }}>
                  {props.tourJourney.flows.length !== 0 && !showJourneyEditor && <Tags.JourneyAddedIcon />}
                  <Button
                    onClick={() => getFirstAnnotations()}
                    icon={<BarsOutlined style={{ fontSize: '1.4rem', fontWeight: 500, color: 'black' }} />}
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
        )
      }
          {
        showLoaderEditor && <LoaderEditor closeEditor={() => setShowLoaderEditor(false)} />
      }
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
                    content: `This connector will get deleted and previous 
                  annotation and next annotation will get separated`,
                    okText: 'Delete',
                    okType: 'danger',
                    onOk() {
                      traceEvent(AMPLITUDE_EVENTS.EDGE_CONNECTION_DELETED, {}, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
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
                    onCancel() { },
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
                className="menu-item"
                onClick={() => {
                  confirm({
                    title: 'Are you sure you want to delete this annotation?',
                    content: `This annotation will be deleted and the previous annotation 
                    will get connected to the next`,
                    okText: 'Delete',
                    okType: 'danger',
                    onOk() {
                      traceEvent(AMPLITUDE_EVENTS.ANNOTATION_DELETED, {
                        annotation_op_location: 'canvas'
                      }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
                      const [screenId, annId] = nodeMenuModalData.annId.split('/');

                      handleReselectionOfPrevAnnWhenCurAnnIsDeleted(annId);

                      const currentAnn = getAnnotationByRefId(annId, props.allAnnotationsForTour)!;
                      const main = props.tourOpts.main;
                      const result = deleteAnnotation(
                        { ...currentAnn, screenId: +screenId },
                        props.allAnnotationsForTour,
                        main,
                        true
                      );

                      props.applyAnnButtonLinkMutations(result);
                      setNodeMenuModalData(initialAnnNodeModalData);
                    },
                    onCancel() { }
                  });
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <img
                    src={DeleteIcon}
                    width="24px"
                    height="24px"
                    alt="delete annotation"
                    style={{ width: '1.5rem' }}
                  />
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
                position={addScreenModalData.annotationPosition === 'next'
                  ? DestinationAnnotationPosition.next : DestinationAnnotationPosition.prev}
                annotation={addScreenModalData.screenAnnotation}
                hidePopup={() => setAddScreenModalData(initialAddScreenModal)}
                updateOriginAnnPos={(position) => {
                  const annotation = addScreenModalData.screenAnnotation;
                  props.navigate(`${annotation!.screen.id}/${annotation!.refId}`, 'annotation-hotspot');
                  setNewAnnPos(position);
                }}
                shouldShowScreenPicker={props.shouldShowScreenPicker}
              />
            </Tags.MenuModal>
          </Tags.MenuModalMask>
          )}
          {
            props.shouldShowOnlyScreen && (
            <Tags.AnnEditorModalWrapper
              top={20}
            >
              <Tags.AnnEditorModal style={{ position: 'relative' }}>
                <Tags.CloseIcon
                  alt=""
                  src={CloseIcon}
                  role="button"
                  tabIndex={0}
                  onClick={resetSelectedAnn}
                  style={{ position: 'absolute', top: '4px', right: '12px', zIndex: '1', border: 'none' }}
                />
                {
                  props.isScreenLoaded && (
                  <ScreenEditor
                    annotationSerialIdMap={props.annotationSerialIdMap}
                    key={props.screen!.rid}
                    screen={props.screen!}
                    tour={props.tour!}
                    screenData={props.screenData!}
                    allEdits={props.allEdits}
                    toAnnotationId={selectedAnnId}
                    navigate={props.navigate}
                    setAlert={props.setAlert}
                    timeline={props.timeline}
                    allAnnotationsForScreen={props.allAnnotationsForScreen}
                    allAnnotationsForTour={props.allAnnotationsForTour}
                    tourDataOpts={props.tourOpts}
                    commitTx={props.commitTx}
                    onScreenEditStart={props.onScreenEditStart}
                    onScreenEditFinish={props.onScreenEditFinish}
                    onScreenEditChange={props.onScreenEditChange}
                    onAnnotationCreateOrChange={props.onAnnotationCreateOrChange}
                    applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
                    shouldShowScreenPicker={props.shouldShowScreenPicker}
                    showEntireTimeline={false}
                    isScreenLoaded={props.isScreenLoaded}
                    updateScreen={props.updateScreen}
                    newAnnPos={newAnnPos}
                    resetNewAnnPos={() => setNewAnnPos(null)}
                  />
                  )
                }
              </Tags.AnnEditorModal>
            </Tags.AnnEditorModalWrapper>
            )
          }
          {
            isAnnSelected && (
            <Tags.AnnEditorModalCon>
              <Tags.AnnEditorModalArrow
                top={ANN_EDITOR_TOP - 12}
                left={screenEditorArrowLeft}
                applyTransition={annEditorModal.applyTransitionToArrow}
                width={`${15}px`}
                height={`${12}px`}
                viewBox="-50 0 100 80"
                style={{ verticalAlign: 'bottom' }}
              >
                <path
                  fill="#9f96fa"
                  d="M-50 80 L-14 14 C-14 14, 0 1, 14 14 L14 14 L50 80 Z"
                />
              </Tags.AnnEditorModalArrow>
              <Tags.AnnEditorModalWrapper
                top={ANN_EDITOR_TOP}
              >
                <Tags.AnnEditorModal style={{ position: 'relative' }}>
                  <Tags.CloseIcon
                    alt=""
                    src={CloseIcon}
                    role="button"
                    tabIndex={0}
                    onClick={resetSelectedAnn}
                    style={{ position: 'absolute', top: '4px', right: '12px', zIndex: '1', border: 'none' }}
                  />
                  {
                props.isScreenLoaded && showScreenEditor && (
                  <ScreenEditor
                    annotationSerialIdMap={props.annotationSerialIdMap}
                    key={props.screen!.rid}
                    screen={props.screen!}
                    tour={props.tour!}
                    screenData={props.screenData!}
                    allEdits={props.allEdits}
                    toAnnotationId={selectedAnnId}
                    navigate={props.navigate}
                    setAlert={props.setAlert}
                    timeline={props.timeline}
                    allAnnotationsForScreen={props.allAnnotationsForScreen}
                    allAnnotationsForTour={props.allAnnotationsForTour}
                    tourDataOpts={props.tourOpts}
                    commitTx={props.commitTx}
                    onScreenEditStart={props.onScreenEditStart}
                    onScreenEditFinish={props.onScreenEditFinish}
                    onScreenEditChange={props.onScreenEditChange}
                    onAnnotationCreateOrChange={props.onAnnotationCreateOrChange}
                    applyAnnButtonLinkMutations={props.applyAnnButtonLinkMutations}
                    shouldShowScreenPicker={props.shouldShowScreenPicker}
                    showEntireTimeline={false}
                    isScreenLoaded={props.isScreenLoaded}
                    onDeleteAnnotation={handleReselectionOfPrevAnnWhenCurAnnIsDeleted}
                    updateScreen={props.updateScreen}
                    newAnnPos={newAnnPos}
                    resetNewAnnPos={() => setNewAnnPos(null)}
                  />
                )
              }
                </Tags.AnnEditorModal>
              </Tags.AnnEditorModalWrapper>
            </Tags.AnnEditorModalCon>
            )
          }
          {
            showJourneyEditor && <CreateJourney
              closeEditor={() => { setShowJourneyEditor(false); resetCreateJourneyZoom(); setFirstAnnotations([]); }}
              firstAnnotations={firstAnnotations}
              getAnnInView={zoomAnnInView}
              onTourJourneyChange={props.onTourJourneyChange}
              tourOpts={props.tourOpts}
              tourJourney={props.tourJourney}
            />
          }
          <SelectorComponent userGuides={userGuides} />
        </GTags.BodyCon>
      </GTags.ColCon>
    </>
  );
}
