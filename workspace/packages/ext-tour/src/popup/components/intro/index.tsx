import React, { Component, useContext } from "react";
import { Msg } from "../../../msg";
import "./index.less";
import { Route } from "../../../types";
import { RootContext } from "../../ctx";

interface Props {}

export default function (props: Props) {
  const ctx = useContext(RootContext);

  return (
    <div className="container__create">
      <img alt="illustration" src="./illustration-extension.svg" />
      <div>
        <p>Welcome to fable extension.</p>
        <p>Lets get started by setting up a new project</p>
      </div>
      <button
        type="button"
        onClick={() => {
          ctx.navigateToRoute(Route.NewProject);
        }}
      >
        Create a new project
      </button>
    </div>
  );
}
