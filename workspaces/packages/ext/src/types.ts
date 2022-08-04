export enum ENetworkEvents {
  RequestWillbeSent = 'Network.requestWillBeSent',
  RespReceivedExtraInfo = 'Network.responseReceivedExtraInfo',
  ResponseReceived = 'Network.responseReceived',
  LoadingFinished = 'Network.loadingFinished',
}

export enum StorageKeys {
  RecordedTabs = 'tabs_being_recorded',
  PrefixRequestMeta = 'rm',
  AllowedHost = 'allowed_hosts',
}

export interface IRuntimeMsg {
  type: 'record' | '';
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
    };
  }
}
