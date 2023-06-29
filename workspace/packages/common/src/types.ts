import { RespScreen, SchemaVersion } from './api-contract';

export interface SerNode {
  type: number;
  name: string;
  attrs: Record<string, string | null>;
  props: {
    nodeProps?: {
      type?: string;
      value?: string | boolean | number;
      checked?: boolean;
    };
    cssRules?: string;
    proxyUrl?: string;
    proxyAttr?: 'href' | 'src';
    isStylesheet?: boolean;
    textContent?: string | null;
    isHidden?: boolean;
    isShadowHost?: boolean;
    isShadowRoot?: boolean;
    origHref?: string | null;
    rect?: {
      height: number;
      width: number;
    };
  };
  chldrn: SerNode[];
}

export interface SerNodeWithPath extends SerNode {
  path: string;
}

export interface PostProcess {
  type: 'asset' | 'iframe' | 'elpath' | 'object';
  path: string;
}

export interface SerDoc {
  frameUrl: string;
  userAgent: string;
  name: string;
  title: string;
  postProcesses: Array<PostProcess>;
  icon: SerNodeWithPath | null;
  docTree?: SerNode;
  docTreeStr: string;
  rect: {
    height: number;
    width: number;
  };
  baseURI: string;
}

export interface CapturedViewPort {
  h: number;
  w: number;
}

export interface ScreenData {
  version: string;
  vpd: CapturedViewPort;
  docTree: SerNode;
}

export interface EditFile<T> {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
  edits: T;
}

export interface TourEntity {
  type: 'screen' | 'qualification';
  ref: string;
}

export interface TourScreenEntity extends TourEntity {
  type: 'screen';
  annotations: Record<string, IAnnotationOriginConfig>;
}

export interface IChronoUpdatable {
  monoIncKey: number;
  createdAt: number;
  updatedAt: number;
}

export interface ITourDataOpts extends IChronoUpdatable {
  primaryColor: string;
  annotationBodyBackgroundColor: string;
  annotationBodyBorderColor: string;
  annotationFontFamily: string | null;
  annotationFontColor: string;
  main: string;
}

export interface TourDataWoScheme {
  opts: ITourDataOpts,
  entities: Record<string, TourEntity>;
}

export interface TourData extends TourDataWoScheme {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
}

export enum LoadingStatus {
  NotStarted,
  InProgress,
  Done,
}

// ---- types for Annotation ----

export enum AnnotationPositions {
  Auto = 'auto',
  AboveOrBelow = 'above-or-below',
  LeftOrRight = 'left-or-right',
}

export enum VideoAnnotationPositions {
  BottomRight = 'bottom-right',
  BottomLeft = 'bottom-left',
  Center = 'center',
  Follow = 'follow',
}

export interface IAnnotationHotSpot {
  type: 'button',
}

export enum AnnotationButtonStyle {
  Primary = 'primary',
  Link = 'link',
  Outline = 'outline'
}

export enum AnnotationButtonSize {
  Large = 'large',
  Medium = 'medium',
  Small = 'small'
}

export enum AnnotationBodyTextSize {
  small = '15',
  medium = '18',
  large = '21'
}

export interface IAnnotationButton {
  id: string;
  type: 'next' | 'prev' | 'custom';
  text: string;
  style: AnnotationButtonStyle;
  size: AnnotationButtonSize;
  exclude?: boolean;
  // This is used to sort buttons for display
  // next button normally have very high order since it would be towards the end
  // prev button normally have very low order since it would be towards the start
  // all the other buttons are in between
  order: number;
  // TODO right now hotspots are created from here for. Later on with other entity check where
  // the hotspot could be created
  hotspot: ITourEntityHotspot | null;
}

export interface ITourEntityHotspot {
  type: 'el' | 'an-btn',
  on: 'click',
  target: string;
  actionType: 'navigate' | 'open';
  actionValue: string;
}

export type EAnnotationBoxSize = 'small' | 'medium' | 'large';

export interface IAnnotationOriginConfig extends IChronoUpdatable {
  id: string;
  refId: string;
  bodyContent: string;
  displayText: string;
  positioning: AnnotationPositions | VideoAnnotationPositions,
  buttons: IAnnotationButton[],
  type: 'cover' | 'default',
  size: EAnnotationBoxSize,
  isHotspot: boolean,
  hideAnnotation: boolean,
  bodyTextSize: AnnotationBodyTextSize;
  videoUrl: string;
  hotspotElPath: string | null;
  videoUrlMp4: string;
  videoUrlWebm: string;
  showOverlay: boolean;
}

// TODO perform this conversion, client side
export interface IAnnotationConfig extends IAnnotationOriginConfig {
  syncPending: boolean;
}

export interface Coords {
  x: number;
  y: number;
  width: number;
  height: number;
}
