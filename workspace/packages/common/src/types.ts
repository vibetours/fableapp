import { SchemaVersion } from './api-contract';

export interface SerNode {
  type: number;
  name: string;
  attrs: Record<string, string | null>;
  props: {
    isStylesheet?: boolean;
    textContent?: string | null;
    isHidden?: boolean;
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
  type: 'asset' | 'iframe';
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
  navigation: any[]; // TODO
}

export interface TourScreen extends TourEntity {
  type: 'screen';
  annotations: any[];
}

export interface TourData {
  v: SchemaVersion;
  lastUpdatedAtUtc: number;
  main: string;
  entities: TourEntity[];
}

export enum LoadingStatus {
  NotStarted,
  InProgress,
  Done,
}

export enum AnnotationPositions {
  Auto = 'auto',
  AboveOrBelow = 'above-or-below',
  LeftOrRight = 'left-or-right',
}

export interface IAnnotationConfig {
  localId: number;
  bodyContent: string;
  positioning: AnnotationPositions,
}
