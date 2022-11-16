import React, { Component } from "react";
import { Msg } from "../../msg";
import "./index.less";

export default class CreateProject extends Component {
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
            chrome.runtime.sendMessage({ type: Msg.CREATE_PROJECT });
          }}
        >
          Create a new project
        </button>
      </div>
    );
  }
}
