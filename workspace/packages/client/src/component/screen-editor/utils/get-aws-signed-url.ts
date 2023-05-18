import api from '@fable/common/dist/api';
import { ApiResp, RespUploadUrl, ResponseStatus } from '@fable/common/dist/api-contract';
import { captureException } from '@sentry/react';

export const getS3UploadUrl = async (type: string): Promise<string> => {
  const res = await api<null, ApiResp<RespUploadUrl>>(`/getuploadlink?te=${btoa(type)}`, {
    auth: true,
  });

  if (res.status === ResponseStatus.Failure) {
    captureException('Error in getting S3 upload url');
  }
  return res.status === ResponseStatus.Failure ? '' : res.data.url;
};
