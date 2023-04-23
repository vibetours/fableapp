import { ApiResp, ResponseStatus, RespOrg } from '@fable/common/dist/api-contract';
import api from '@fable/common/dist/api';

export async function assignImplicitOrgToUser(): Promise<ResponseStatus> {
  const data = await api<null, ApiResp<RespOrg>>(
    '/assgnimplorg',
    { auth: true, method: 'POST' }
  );
  return data.status;
}
