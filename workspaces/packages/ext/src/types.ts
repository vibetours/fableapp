export enum ENetworkEvents {
  RequestWillbeSent = 'Network.requestWillBeSent',
  RespReceivedExtraInfo = 'Network.responseReceivedExtraInfo',
  ResponseReceived = 'Network.responseReceived',
  LoadingFinished = 'Network.loadingFinished',
}

export enum StorageKeys {
  RecordedTabs = 'tabs_being_recorded',
  PrefixRequestData = 'rd',
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

export interface SerializableReq {
  origin: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  reqHeaders: Record<string, string | number>;
  meta: {
    skipped: boolean;
  };
}

export interface SerializableRedirectResp {
  redirectHeaders: Record<string, string | number>;
  status: number;
}

export interface SerializableResp {
  // ref: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  contentType: string | number;
  respHeaders: Record<string, string | number>;
  status: number;
}

export interface SerializableRespBody {
  respBody: any;
}

export type SerializablePayload = SerializableReq & SerializableResp & SerializableRedirectResp & SerializableRespBody;

export interface IRuntimeMsg {
  type: 'record' | 'query_status' | 'stop' | 'hb';
}

export namespace NNetworkEvents {
  export interface IBaseXhrNetData {
    requestId: string;
  }

  export interface IReqWillBeSentData extends IBaseXhrNetData {
    request: {
      headers: Record<string, string | number>;
      url: string;
      method: 'GET' | 'POST';
    };
    redirectResponse?: {
      status: number;
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
