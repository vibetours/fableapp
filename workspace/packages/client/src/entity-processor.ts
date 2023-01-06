import { RespScreen } from "@fable/common/dist/api-contract";
import { TState } from "./reducer";
import { getDisplayableTime } from "@fable/common/dist/utils";

export interface P_RespScreen extends RespScreen {
  urlStructured: URL;
  thumbnailUri: URL;
  dataFileUri: URL;
  displayableUpdatedAt: string;
  related: P_RespScreen[];
}

export function processRawScreenData(screen: RespScreen, state: TState): P_RespScreen {
  const d = new Date(screen.updatedAt);
  const processedScreen: P_RespScreen = {
    ...screen,
    createdAt: new Date(screen.createdAt),
    updatedAt: d,
    displayableUpdatedAt: getDisplayableTime(d),
    urlStructured: new URL(screen.url),
    thumbnailUri: new URL(`${state.default.commonConfig?.commonAssetPath}${screen.thumbnail}`),
    dataFileUri: new URL(`${state.default.commonConfig?.screenAssetPath}index.json`),
    related: [],
  };
  return processedScreen;
}

function allScreensTillParent(
  screen: P_RespScreen,
  allScreens: Record<number, P_RespScreen>,
  traversedScreens: Record<number, P_RespScreen> = {}
): Record<number, P_RespScreen> {
  traversedScreens[screen.id] = screen;
  if (screen.parentScreenId > 0) {
    allScreensTillParent(allScreens[screen.parentScreenId], allScreens, traversedScreens);
  } else {
    traversedScreens[-1] = screen;
  }
  return traversedScreens;
}

// TODO currently this calculation is done in local. But for paginated response this might not work
// correctly. In that case do it on server
export function groupScreens(screens: P_RespScreen[]): P_RespScreen[] {
  const allScreens = screens.reduce((store, scrn) => {
    store[scrn.id] = scrn;
    return store;
  }, {} as Record<number, P_RespScreen>);

  const store: Record<number, Record<number, P_RespScreen>> = {};
  for (const scrn of screens) {
    const allRelatedScreens = allScreensTillParent(scrn, allScreens);
    const rootScreen = allRelatedScreens[-1];
    delete allRelatedScreens[-1];
    if (rootScreen.id in store) {
      const ob = store[rootScreen.id];
      for (const [, scn] of Object.entries(allRelatedScreens)) {
        ob[scn.id] = scn;
      }
    } else {
      store[rootScreen.id] = allRelatedScreens;
    }
  }

  const groupedScreens: P_RespScreen[] = [];
  for (const [, screensObj] of Object.entries(store)) {
    const srn = Object.values(screensObj);
    const orderedScreen = srn.sort((m, n) => +n.updatedAt - +m.updatedAt);
    orderedScreen[0].related.push.apply(orderedScreen[0].related, orderedScreen.slice(1));
    groupedScreens.push(orderedScreen[0]);
  }
  return groupedScreens.sort((m, n) => +n.updatedAt - +m.updatedAt);
}
