export interface IProject extends Record<string, any> {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  displayName: string;
  thumbnail: string;
  origin: string;
}

export interface IProject_Raw {
  id: number;
  createdAt: string;
  updatedAt: string;
  name: string;
  displayName: string;
  thumbnail: string | null;
  origin: string;
}
