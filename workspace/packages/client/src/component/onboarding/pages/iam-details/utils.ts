import { ReqUpdateUser, RespUser, ApiResp, ResponseStatus } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';

export async function updateUser(firstName: string, lastName: string): Promise<ResponseStatus> {
  const data = await api<ReqUpdateUser, ApiResp<RespUser>>('/userprop', {
    auth: true,
    body: {
      firstName,
      lastName
    }
  });
  return data.status;
}
