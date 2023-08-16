import { RespScreen } from '@fable/common/dist/api-contract';
import { AnnAdd } from '../../action/creator';

export type AddScreenFn = (screen: RespScreen, annAdd: AnnAdd) => void;

export type ApplyDiffAndGoToAnn = (
    currAnnRefId: string,
    goToAnnIdWithScreenId: string,
    isGoToVideoAnn: boolean,
) => Promise<void>;

export type DisplayCSSPropValue = 'block' | 'inline' | 'inline-block' | 'flex' |
'grid' | 'none' | 'table' | 'table-cell' | 'table-row' | 'initial' | 'inherit';
