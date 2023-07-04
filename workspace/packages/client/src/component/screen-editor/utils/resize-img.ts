import {
  ReqMediaProcessing,
  ApiResp,
  ImgResizingJobInfo,
  EntityType,
  ResponseStatus
} from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';
import { captureException } from '@sentry/react';

export type ImgResolution = '720' | '480';

export async function resizeImg(uri: string, screenRid: string, resolution?: ImgResolution): Promise<string> {
  const data = await api<ReqMediaProcessing, ApiResp<ImgResizingJobInfo>>(`/rzeimg?pr=${resolution || '480'}`, {
    auth: true,
    body: {
      path: uri,
      assn: {
        entityRid: screenRid,
        entityType: EntityType.Screen
      }
    }
  });

  if (data.status === ResponseStatus.Failure) {
    captureException('Img could not be resized');
    return '';
  }

  return data.data.processedFilePath;
}
