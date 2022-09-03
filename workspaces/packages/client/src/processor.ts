import { IProject_Raw, IProject } from "./entity_type";

export function processRawProjectData(rawData: IProject_Raw): IProject {
  const origin = new URL(rawData.origin);
  let nOrigin = origin.host + origin.pathname;
  nOrigin = nOrigin.substring(0, 200);
  return {
    ...rawData,

    id: rawData.id,
    createdAt: new Date(rawData.createdAt),
    __createdAt: rawData.createdAt,
    updatedAt: new Date(rawData.updatedAt),
    __updatedAt: rawData.updatedAt,
    name: rawData.name,
    displayName: rawData.displayName,
    thumbnail: rawData.thumbnail ? rawData.thumbnail : "",
    __thumbnail: rawData.thumbnail,
    origin: nOrigin,
    __origin: rawData.origin,
  };
}
