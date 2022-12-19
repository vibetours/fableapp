export enum Route {
  Intro,
  Main,
  NewProject,
}

export interface IProject {
  url: string;
  title: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  noOfScreens: number;
  id: number;
}

export interface IExtStoredState {
  projects: Array<IProject>;
  selectedProjectIndex: number;
  selectedProjectId: number;
}
