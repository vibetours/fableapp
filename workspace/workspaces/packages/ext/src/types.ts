export enum ENetworkEvents {
  RequestWillbeSent = 'Network.requestWillBeSent',
  ResponseReceived = 'Network.responseReceived',
  LoadingFinished = 'Network.loadingFinished',
}

export enum StorageKeys {
  RecordedTabs = 'tabs_being_recorded',
  PrefixReqRespData = 'rr',
  PrefixRedirectionData = 'rd',
  AllowedHost = 'allowed_hosts',
  RecordingStatus = 'recording_status',
  LastActiveTabId = 'last_active_tab_id',
  UploadQ = 'upload',
  RunningTimer = 'running_timer',
  TabIdWithDebuggerAttached = 'tab_id_with_debugger_attached',
}

export enum RecordingStatus {
  Recording = 'recording',
  Idle = 'idle',
}

export enum EHttpMethod {
  na = 'na',
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface IRuntimeMsg {
  type: 'record' | 'query_status' | 'stop' | 'hb';
}

export namespace NSerReqResp {
  export interface IBase {
    event: ENetworkEvents;
    timestamp: number;

    requestId: string;
    tabId: number;
  }

  export interface IReqRedirectResp {
    headers: Record<string, string | number>;
    status: number;
    url: string;
    isRedirect: boolean;
  }

  export interface IReqWillBeSent extends IBase {
    origin: string;
    method: EHttpMethod;
    url: string;
    reqHeaders: Record<string, string | number>;
    contentType: string | number;
    redirectResponse?: IReqRedirectResp;
  }

  export interface IRespReceived extends IBase {
    // ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
    contentType: string | number;
    respHeaders: Record<string, string | number>;
    status: number;
  }

  export type IIncoming = IReqWillBeSent | IRespReceived | IBase;

  export interface IOutgoing {
    origin: string;
    method: EHttpMethod;
    url: string;
    reqHeaders: Record<string, string | number>;
    contentType: string | number;
    respHeaders: Record<string, string | number>;
    status: number;
    respResolveTabId?: number;
    respResolveReqId?: string;
    respBody?: {
      base64Encoded: boolean;
      body: string;
    };
  }
}

export namespace NNetworkEvents {
  export interface IBaseXhrNetData {
    requestId: string;
    timestamp: number;
  }

  export interface IReqWillBeSentData extends IBaseXhrNetData {
    request: {
      headers: Record<string, string | number>;
      url: string;
      method: EHttpMethod;
    };
    redirectResponse?: {
      status: number;
      headers: Record<string, string | number>;
      url: string;
    };
    documentURL: string;
    redirectHasExtraInfo?: boolean;
  }

  export interface IRespReceivedExtraInfo extends IBaseXhrNetData {
    statusCode: number;
    headers: Record<string, string | number>;
  }

  export interface IRespReceivedData extends IBaseXhrNetData {
    response: {
      headers: Record<string, string | number>;
      mimeType: string;
      status: number;
    };
  }
}
