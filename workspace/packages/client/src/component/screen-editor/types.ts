import { RespScreen } from '@fable/common/dist/api-contract';
import { AnnAdd } from '../../action/creator';

export type AddScreenFn = (screen: RespScreen, annAdd: AnnAdd) => void;

export type ApplyDiffAndGoToAnn = (
    currAnnRefId: string,
    goToAnnIdWithScreenId: string,
    isGoToVideoAnn: boolean,
) => Promise<void>;
