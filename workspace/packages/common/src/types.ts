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
