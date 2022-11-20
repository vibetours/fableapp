import React from "react";
import { Route } from "../types";

interface ICtx {
  navigateToRoute: (route: Route) => void;
}

export const RootContext = React.createContext<ICtx>({} as ICtx);
