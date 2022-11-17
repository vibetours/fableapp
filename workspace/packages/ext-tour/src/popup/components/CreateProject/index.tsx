import React, { Component } from "react";
import { Msg } from "../../../msg";
import "./index.less";
import { NavigatePage } from "../../type";

type Props = {
  onNavigate: (active: NavigatePage) => void;
};
type State = {};

export default class CreateProject extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  render() {
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
            this.props.onNavigate(NavigatePage.FormCreate);
          }}
        >
          Create a new project
        </button>
      </div>
    );
  }
}
