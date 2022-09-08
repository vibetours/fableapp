import { IProject_Raw, IProject } from "./entity_type";

export function processRawProjectData(rawData: IProject_Raw): IProject {
  const origin = new URL(rawData.origin);
  let nOrigin = origin.host + origin.pathname;
  nOrigin = nOrigin.substring(0, 200);
  return {
    ...rawData,

    createdAt: new Date(rawData.createdAt),
    __createdAt: rawData.createdAt,
    updatedAt: new Date(rawData.updatedAt),
    __updatedAt: rawData.updatedAt,
    thumbnail: rawData.thumbnail ? rawData.thumbnail : "/dash_ph.png",
    __thumbnail: rawData.thumbnail,
    origin: nOrigin,
    __origin: rawData.origin,
  };
}
