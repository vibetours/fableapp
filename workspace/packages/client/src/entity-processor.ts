import { RespScreen } from "@fable/common/dist/api-contract";
import { TState } from "./reducer";

export interface P_RespScreen extends RespScreen {
  urlStructured: URL;
  thumbnailUri: URL;
  dataFileUri: URL;
}

export function processRawScreenData(screen: RespScreen, state: TState): P_RespScreen {
  const processedScreen: P_RespScreen = {
    ...screen,
    createdAt: new Date(screen.createdAt),
    updatedAt: new Date(screen.updatedAt),
    urlStructured: new URL(screen.url),
    thumbnailUri: new URL(`${state.default.commonConfig?.commonAssetPath}${screen.thumbnail}`),
    dataFileUri: new URL(`${state.default.commonConfig?.screenAssetPath}index.json`),
  };
  return processedScreen;
}
