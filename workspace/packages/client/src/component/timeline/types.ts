import { IAnnotationConfig, ITourDataOpts } from '@fable/common/dist/types';

export type AnnUpdate = {
    config: IAnnotationConfig,
    btnId: string,
    screenId: number,
    actionValue: string | null,
    grpId?: string
}

export type AnnUpdateType = {
  main: string | null,
  updates: AnnUpdate[],
  groupedUpdates: GroupUpdatesByAnnotationType,
  deletionUpdate: AnnUpdate | null,
  status: 'accepted' | 'denied',
  deniedReason?: string;
}

export type GroupUpdatesByAnnotationType = Record<string, AnnUpdate[]>

export type IUpdateButton = (
  config: IAnnotationConfig,
  btnId: string,
  screenId: number,
  actionValue: string | null,
  opts: ITourDataOpts | null | undefined
) => IAnnotationConfig
