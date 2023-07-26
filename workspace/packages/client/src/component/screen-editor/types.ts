import { RespScreen } from '@fable/common/dist/api-contract';
import { AnnAdd } from '../../action/creator';

export type AddScreenFn = (screen: RespScreen, annAdd: AnnAdd) => void;
