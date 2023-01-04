export interface IUser {
  id: number;
  belongsToOrg: {
    rid: string;
  };
}

export interface IExtStoredState {
  identity: IUser | null;
}
