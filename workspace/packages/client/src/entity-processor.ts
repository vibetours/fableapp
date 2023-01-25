import { RespScreen, RespTour, RespUser, SchemaVersion } from '@fable/common/dist/api-contract';
import { deepcopy, getDisplayableTime } from '@fable/common/dist/utils';
import { IAnnotationConfig, IAnnotationTheme, TourData, TourDataWoScheme, TourEntity, TourScreenEntity } from '@fable/common/dist/types';
import { TState } from './reducer';
import { AllEdits, EditItem, ElEditType } from './types';
import { getDefaultThemeConfig } from './component/annotation/annotation-config-utils';

export interface P_RespScreen extends RespScreen {
  urlStructured: URL;
  thumbnailUri: URL;
  dataFileUri: URL;
  editFileUri: URL;
  displayableUpdatedAt: string;
  related: P_RespScreen[];
}

export function processRawScreenData(screen: RespScreen, state: TState): P_RespScreen {
  const d = new Date(screen.updatedAt);
  return {
    ...screen,
    createdAt: new Date(screen.createdAt),
    updatedAt: d,
    displayableUpdatedAt: getDisplayableTime(d),
    urlStructured: new URL(screen.url),
    thumbnailUri: new URL(`${state.default.commonConfig?.commonAssetPath}${screen.thumbnail}`),
    dataFileUri: new URL(`${state.default.commonConfig?.screenAssetPath}${screen.assetPrefixHash}/${state.default.commonConfig?.dataFileName}`),
    editFileUri: new URL(`${state.default.commonConfig?.screenAssetPath}${screen.assetPrefixHash}/${state.default.commonConfig?.editFileName}?ts=${+new Date()}`),
    related: [],
  };
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

/* ************************************************************************* */

export interface P_RespTour extends RespTour {
  dataFileUri: URL;
  displayableUpdatedAt: string;
  isPlaceholder: boolean;
}

export function processRawTourData(tour: RespTour, state: TState, isPlaceholder = false): P_RespTour {
  const d = new Date(tour.updatedAt);
  return {
    ...tour,
    createdAt: new Date(tour.createdAt),
    updatedAt: d,
    displayableUpdatedAt: getDisplayableTime(d),
    dataFileUri: new URL(`${state.default.commonConfig?.tourAssetPath}${tour.assetPrefixHash}/${state.default.commonConfig?.dataFileName}?ts=${+new Date()}`),
    isPlaceholder,
  };
}

export function createEmptyTour(): RespTour {
  const name = 'Untitled';
  // TODO add the logged in user from state as createdBy once login is implemented
  const user = {} as RespUser;
  return {
    rid: `xxx-xx-${name.toLowerCase()}`,
    assetPrefixHash: '$local$',
    displayName: name,
    description: '',
    createdBy: user,
    createdAt: new Date(new Date().toUTCString()),
    updatedAt: new Date(new Date().toUTCString()),
  };
}

export function createEmptyTourDataFile(): TourData {
  return {
    v: SchemaVersion.V1,
    lastUpdatedAtUtc: -1,
    main: '',
    theme: getDefaultThemeConfig(),
    entities: {},
  };
}

export function getThemeAndAnnotationFromDataFile(data: TourData, syncPending: boolean): {
  annotations: Record<string, IAnnotationConfig[]>,
  theme: IAnnotationTheme,
} {
  const annotationsPerScreen: Record<string, IAnnotationConfig[]> = {};
  for (const [screenId, entity] of Object.entries(data.entities)) {
    if (entity.type === 'screen') {
      const annotationList = annotationsPerScreen[screenId] || [];
      const screenEntity = entity as TourScreenEntity;
      for (const [, annotation] of Object.entries(screenEntity.annotations)) {
        annotation.syncPending = syncPending;
        annotationList.push(annotation);
      }
      annotationsPerScreen[screenId] = annotationList;
    }
  }

  return {
    annotations: annotationsPerScreen,
    theme: data.theme
  };
}

export function normalizeTourDataFile(data: TourData) {
  if (!data.theme) {
    data.theme = getDefaultThemeConfig();
  }
  if (data.main === null || data.main === undefined) {
    data.main = '';
  }
  if (!data.entities || data.entities instanceof Array) {
    data.entities = {};
  }
  return data;
}

/* ************************************************************************* */

export function mergeEdits(master: AllEdits<ElEditType>, incomingEdits: AllEdits<ElEditType>): AllEdits<ElEditType> {
  for (const path of Object.keys(incomingEdits)) {
    if (path in master) {
      const perElEdit = incomingEdits[path];
      for (const editType of Object.keys(perElEdit)) {
        master[path][+editType as ElEditType] = perElEdit[+editType as ElEditType];
      }
    } else {
      master[path] = incomingEdits[path];
    }
  }

  return master;
}

export function mergeTourData(
  master: TourDataWoScheme,
  incoming: Partial<TourDataWoScheme>,
  isDefault = false
): TourDataWoScheme {
  const inOb = deepcopy(incoming) as any;
  if (isDefault && inOb.theme) {
    inOb.theme = undefined;
  }

  // only support merging primitive value, array, js objects
  function recMerge(to: any, from: any) {
    for (const [key, value] of Object.entries(from)) {
      // TODO this is plain old wrong. SyncPending is a local key to
      // detect if annotation edit is synced. While merging we conditionally
      // delete this. This is done in the interest of the time. Ideally this
      // should be handled like chunk edit
      if (value === null) {
        delete to[key];
      } if (value === undefined) {
        continue;
      }

      if (key === 'createdAt' && typeof from[key] === 'number') {
        continue;
      }

      if (typeof value === 'object') {
        if (typeof to[key] !== 'object') {
          to[key] = deepcopy(value);
        } else if (value instanceof Array) {
          // Recursive merge inside array is not yet supported, not needed right now
          to[key] = deepcopy(value);
        } else /* both are js object */ {
          recMerge(to[key], from[key]);
        }
      } else {
        to[key] = value;
      }
    }
  }
  const m = deepcopy(master);
  recMerge(m, inOb);
  return m;
}

// if (incoming.id in master) {
//   const annotationsInMaster = master[incoming.id].annotations;
//   for (const [id, annotationConfig] of Object.entries(incoming.annotations)) {
//     annotationsInMaster[id] = annotationConfig;
//   }
// } else {
//   master[incoming.id] = incoming;
// }
// return master;

export function convertEditsToLineItems(editChunks: AllEdits<ElEditType>, editTypeLocal: boolean): EditItem[] {
  const editList: EditItem[] = [];
  for (const [path, edits] of Object.entries(editChunks)) {
    for (const [type, editDetails] of Object.entries(edits)) {
      editList.push([`${path}:${type}`, path, +type, editTypeLocal, editDetails[0], editDetails]);
    }
  }
  return editList;
}
