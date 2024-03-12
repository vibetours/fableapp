import { IAnnotationButtonType } from '@fable/common/dist/types';

export enum FableAnalyticsLocalStoreKeys {
  AnonymousUserId = 'fable/aid',
  SessionId = 'fable/sid',
  SessionIdExpireAt = 'fable/side'
}

export interface CommonEventProps {
  aid: string;
  sid?: string;
  uts: number;
  tz: string;
}

// INFO events should always be in lowercase and cased & separated like following
export enum AnalyticsEvents {
  ANN_BTN_CLICKED = 'ann_btn_clicked',
  ANN_USER_ASSIGN = 'ann_user_assign',
  TIME_SPENT_IN_ANN = 'time_spent_in_ann',
  VIDEO_ANN_SKIPPED = 'video_ann_skipped'
}

export interface AnnotationBtnClickedPayload {
  tour_id: number;
  ann_id: string;
  btn_type: IAnnotationButtonType;
  btn_id: string;
}

export interface TimeSpentInAnnotationPayload {
  tour_id: number;
  ann_id: string;
  time_in_sec: number
}

export interface VideoAnnotationSkippedPayload {
  tour_id: number;
  ann_id: string;
  time_in_sec_played: number
}

export interface UserAssignPayload {
  user_email: string;
  tour_id: number;
  others: Record<string, string>;
}

export interface PayloadTypeMap {
  [AnalyticsEvents.ANN_BTN_CLICKED]: AnnotationBtnClickedPayload;
  [AnalyticsEvents.ANN_USER_ASSIGN]: UserAssignPayload;
  [AnalyticsEvents.TIME_SPENT_IN_ANN]: TimeSpentInAnnotationPayload;
  [AnalyticsEvents.VIDEO_ANN_SKIPPED]: VideoAnnotationSkippedPayload;
}

export interface EventLog {
  payload: AnnotationBtnClickedPayload | TimeSpentInAnnotationPayload | VideoAnnotationSkippedPayload | UserAssignPayload;
  aid: string;
  sid?: string;
  uts: number;
  tz: string;
  event: AnalyticsEvents;
}

export interface FlattendEventLog extends Record<string, number | string | undefined | object>{
  aid: string;
  sid?: string;
  payload_others?: object;
  uts: number;
  tz: string;
  event: AnalyticsEvents;
}
