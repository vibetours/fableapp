import React, { Component } from "react";
import api from "../../../api";
import { Route } from "../../../types";
import { captureVisibleTab, getActiveTab } from "../../../common";
import { RootContext } from "../../ctx";

interface Props {}

interface State {
  displayName: string;
}

export default class FormCreateProject extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      displayName: "",
    };
  }

  static rootCtx = RootContext;

  getThumbnail = captureVisibleTab;

  getData = async (): Promise<{ url: string; title: string }> => {
    const tab = await getActiveTab();
    return { url: tab?.url || "", title: tab?.title || "" };
  };

  createNewProject = async (data: Object) => {
    try {
      const res = api("/projects", {
        ...data,
        displayName: this.state.displayName,
      });
    } catch (err) {
      // TODO Handle error for 500, 403
      console.log("Error", err);
    }
  };

  render() {
    return (
      <div>
        <form>
          <div className="form__group">
            <label htmlFor="displayName">
              Display Name
              <input
                type="text"
                name="displayName"
                id="displayName"
                placeholder="Enter display name"
                value={this.state.displayName}
                onChange={(e) => {
                  this.setState({
                    displayName: e.target.value,
                  });
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={async (e: React.FormEvent<HTMLButtonElement>) => {
              e.preventDefault();
              const thumbnail = await this.getThumbnail();
              const data = await this.getData();
              await this.createNewProject({ ...data, thumbnail });
            }}
          >
            Submit
          </button>
        </form>
      </div>
    );
  }
}
