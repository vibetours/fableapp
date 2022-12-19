const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const API_VERSION = "/v1";

// TODO handle common error here like 500, 403, 401 etc
export default async function api<T>(url: string, payload?: any): Promise<T> {
  const path = API_ENDPOINT + API_VERSION;
  let resp;
  if (payload === null || payload === undefined) {
    resp = await fetch(`${path}${url}`);
  }
  resp = await fetch(`${path}${url}`, payload);

  const json = await resp.json();
  return json as T;
}
