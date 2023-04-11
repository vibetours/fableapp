/* tslint:disable */
/* eslint-disable */
// Generated using typescript-generator version 2.35.1025 on 2023-04-10 05:22:57.

export interface ApiResp<T> {
    status: ResponseStatus;
    data: T;
    errStr: string;
    errCode: ErrorCode;
}

export interface ReqCopyScreen {
    parentId: number;
    tourRid: string;
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
    body: string;
}

export interface ReqNewTour {
    name: string;
    description?: string;
}

export interface ReqProxyAsset {
    origin: string;
    clientInfo: string;
}

export interface ReqRecordEdit {
    rid: string;
    editData: string;
}

export interface ReqRenameGeneric {
    newName: string;
    rid: string;
}

export interface ReqUpdateUser {
    firstName: string;
    lastName: string;
}

export interface RespCommonConfig extends ResponseBase {
    commonAssetPath: string;
    screenAssetPath: string;
    tourAssetPath: string;
    dataFileName: string;
    editFileName: string;
    latestSchemaVersion: SchemaVersion;
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
    tour?: RespTour;
}

export interface RespTour extends ResponseBase {
    rid: string;
    assetPrefixHash: string;
    displayName: string;
    description: string;
    createdBy: RespUser;
}

export interface RespTourWithScreens extends RespTour {
    screens: RespScreen[];
}

export interface RespUploadUrl {
    url: string;
    expiry: string;
    filename: string;
}

export interface RespUser extends ResponseBase {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
    personalEmail: boolean;
    belongsToOrg: number;
    orgAssociation: UserOrgAssociation;
}

export interface ResponseBase {
    createdAt: Date;
    updatedAt: Date;
}

export const enum SchemaVersion {
    V1 = "2023-01-10",
}

export const enum ResponseStatus {
    Success = "Success",
    Failure = "Failure",
}

export const enum ErrorCode {
    IllegalArgs = 100,
    NotFound = 101,
}

export const enum UserOrgAssociation {
    Implicit = "Implicit",
    Explicit = "Explicit",
    NA = "NA",
}
