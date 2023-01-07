/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.35.1025 on 2023-01-06 17:59:37.

export interface ApiResp<T> {
    status: ResponseStatus;
    data: T;
    errStr: string;
    errCode: ErrorCode;
}

export interface ReqNewOrg {
    displayName: string;
    thumbnail: string;
}

export interface ReqNewScreen {
    name: string;
    url: string;
    thumbnail: string;
    favIcon?: string;
    parentId?: number;
    body: string;
}

export interface ReqNewUser {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    belongsToOrg: number;
}

export interface ReqProxyAsset {
    origin: string;
    clientInfo: string;
}

export interface RespCommonConfig extends ResponseBase {
    commonAssetPath: string;
    screenAssetPath: string;
    flowAssetPath: string;
    dataFileName: string;
}

export interface RespHealth extends ResponseBase {
    status: string;
}

export interface RespOrg extends ResponseBase {
    rid: string;
    displayName: string;
    thumbnail: string;
}

export interface RespProxyAsset extends ResponseBase {
    proxyUri: string;
}

export interface RespScreen extends ResponseBase {
    id: number;
    parentScreenId: number;
    rid: string;
    assetPrefixHash: string;
    displayName: string;
    createdBy: RespUser;
    thumbnail: string;
    url: string;
    icon: string;
}

export interface RespUser extends ResponseBase {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    belongsToOrg: RespOrg;
}

export interface ResponseBase {
    createdAt: Date;
    updatedAt: Date;
}

export const enum ResponseStatus {
    Success = "Success",
    Failure = "Failure",
}

export const enum ErrorCode {
    IllegalArgs = 100,
    NotFound = 101,
}
