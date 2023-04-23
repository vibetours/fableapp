import { ApiResp, ResponseStatus, RespOrg, ReqNewOrg } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';

export async function createOrg(displayName: string): Promise<ResponseStatus> {
  const data = await api<ReqNewOrg, ApiResp<RespOrg>>('/neworg', {
    auth: true,
    body: {
      displayName,
      thumbnail: ''
    },
  });
  return data.status;
}
