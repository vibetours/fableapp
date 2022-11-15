import React, { Component } from "react";
import "./index.less";

export default class SelectProject extends Component {
  render() {
    return (
      <div className="container__select">
        <div className="container__select-create">
          <div>
            <input type="text" />
            <button>+</button>
            <span>Select a project</span>
          </div>
          <span className="container__select-create-update">
            Last updated 2 mins ago
          </span>
        </div>
        <button className="container__select-new">
          + Create a new project
        </button>
        <div className="container__select-save">
          <button>Save screen in project</button>
          <span>or Press cmd + E</span>
        </div>
      </div>
    );
  }
}
