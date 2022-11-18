import React, { Component } from "react";
import axios from "axios";
import { NavigatePage } from "../../../types";
import MyContext from "../../context/MyContext";

type Props = {
  onNavigate: (active: NavigatePage) => void;
};
type State = {
  displayName: string;
};

export default class FormCreateProject extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      displayName: "",
    };
  }

  static myContextType = MyContext;

  getThumbnail = async () => {
    const thumbnail: string = await chrome.tabs.captureVisibleTab({
      format: "png",
      quality: 100,
    });

    return thumbnail;
  };

  getData = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    console.log(tab);

    return { url: tab.url, title: tab.title };
  };

  handleSubmit = async (data: Object) => {
    try {
      const res = await axios.post(`http://localhost:3000/projects/`, {
        ...data,
        ...this.state,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
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
                    ...this.state,
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

              await this.handleSubmit({ ...data, thumbnail });
            }}
          >
            Submit
          </button>
        </form>
      </div>
    );
  }
}
