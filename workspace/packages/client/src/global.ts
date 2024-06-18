import { FWin, GlobalAppData, GlobalWin } from './types';

export interface CmnLeadProps {
  ti: number;
}

export interface FableLeadContactProps {
  pk_key: string;
  pk_val: string
  email?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  industry?: string;
  org?: string;
  phone?: string;
  website_url?: string;
  custom_fields?: Record<string, string | number | undefined | null>;
}

export interface FtmQueryParams extends Record<string, string | number | undefined | null> {
  email?: string;
  first_name?: string;
  last_name?: string;
  org?: string;
  phone?: string;
}

export function saveGlobalFtmQueryParams(params: Partial<FtmQueryParams>) {
  (window as FWin).__fable_global_query_param__ = {
    ...((window as FWin).__fable_global_query_param__ || {}) as FtmQueryParams,
    ...params
  };
}

export function saveGlobalUser(user: Partial<FableLeadContactProps>) {
  (window as FWin).__fable_global_user__ = {
    ...((window as FWin).__fable_global_user__ || {}) as FableLeadContactProps,
    ...user
  };
}

export function addToGlobalAppData<T>(key: keyof GlobalAppData, val: GlobalAppData[keyof GlobalAppData]) : void {
  (window as GlobalWin).__fable_global_app_data__ = {
    ...((window as GlobalWin).__fable_global_app_data__ || {}),
    [key]: val
  };
}

export function getGlobalData(key: keyof GlobalAppData): GlobalAppData[keyof GlobalAppData] {
  const commonMessageData = (window as GlobalWin).__fable_global_app_data__ || {};
  return commonMessageData[key];
}
