export enum ENetworkEvents {
  RequestWillbeSent = 'Network.requestWillBeSent',
  RespReceivedExtraInfo = 'Network.responseReceivedExtraInfo',
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
  UploadIds = 'upload_ids',
  RunningTimer = 'running_timer',
  TabIdWithDebuggerAttached = 'tab_id_with_debugger_attached',
}

export enum RecordingStatus {
  Recording = 'recording',
  Idle = 'idle',
}

export interface SerNetEvt {
  event: ENetworkEvents;
  timestamp: number;
}

export enum EHttpMethod {
  na = 'na',
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export interface SerReqRedirectResp {
  headers: Record<string, string | number>;
  status: number;
  url: string;
  isRedirect: boolean;
}

export interface SerReqWillBeSent extends SerNetEvt {
  origin: string;
  method: EHttpMethod;
  url: string;
  reqHeaders: Record<string, string | number>;
  contentType: string | number;
  redirectResponse?: SerReqRedirectResp;
}

export interface SerRespReceived extends SerNetEvt {
  // ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  contentType: string | number;
  respHeaders: Record<string, string | number>;
  status: number;
}

export type SerReqRespIncoming = SerReqWillBeSent | SerRespReceived | SerNetEvt;

export interface ISerReqRespOutgoing {
  origin: string;
  method: EHttpMethod;
  url: string;
  reqHeaders: Record<string, string | number>;

  contentType: string | number;

  respHeaders: Record<string, string | number>;
  status: number;

  respBody?: any;
}

export interface IRuntimeMsg {
  type: 'record' | 'query_status' | 'stop' | 'hb';
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
