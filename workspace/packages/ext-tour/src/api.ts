const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const API_VERSION = "/v1";
const BEHIND_AUTH = "/f";

// TODO handle common error here like 500, 403, 401 etc
export default async function api<T, M>(
  url: string,
  payload?: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: T;
    auth?: boolean;
  }
): Promise<M> {
  let auth = payload?.auth;
  let method = "GET";
  if (payload?.method) {
    method = payload.method;
  }
  if (method === "POST" && auth === undefined) {
    auth = true;
  }
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(payload?.headers || {}),
  };

  // TODO temporary until auth is implemented
  if (auth) {
    (headers as any).Authorization = "Basic MTphZG1pbg==";
  }

  const path = API_ENDPOINT + API_VERSION + (auth ? BEHIND_AUTH : "");
  let resp;
  if (payload === null || payload === undefined) {
    resp = await fetch(`${path}${url}`);
  }

  let body = null;
  if (payload?.body) {
    body = JSON.stringify(payload.body);
  }
  resp = await fetch(`${path}${url}`, {
    method,
    headers,
    body,
  });

  const json = await resp.json();
  return json as M;
}
