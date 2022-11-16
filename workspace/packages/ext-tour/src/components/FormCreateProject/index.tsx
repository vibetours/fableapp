import React, { Component } from "react";
import axios from "axios";

type Props = {};
type State = {
  displayName: string;
  thumbnail: string;
  url: string | undefined;
  title: string | undefined;
  createdAt: string;
  noOfScreens: number;
  updatedAt: string;
};

export default class FormCreateProject extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      displayName: "",
      thumbnail: "",
      url: "",
      title: "",
      createdAt: "",
      updatedAt: "",
      noOfScreens: 1,
    };
  }

  getThumbnail = () => {
    chrome.tabs.captureVisibleTab(
      {
        format: "png",
        quality: 100,
      },
      (dataUrl) => {
        this.setState({ thumbnail: dataUrl });
      }
    );
  };

  getData = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      this.setState({ url: tabs[0]?.url }, () => {
        console.log(this.state.url, " url is done");
      });
      this.setState({ title: tabs[0]?.title }, () => {
        console.log(this.state.title, " title is done");
      });
    });
  };

  handleSubmit = async (e: React.FormEvent<HTMLButtonElement>) => {
    e.preventDefault();

    this.setState(
      {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      () => {}
    );

    // console.log(this.state);
    try {
      const res = await axios.post(
        "http://localhost:3000/projects",
        this.state
      );
      console.log(res.status);
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
                  this.setState({ displayName: e.target.value });
                }}
              />
            </label>
          </div>
          <button
            type="button"
            onClick={(e: React.FormEvent<HTMLButtonElement>) => {
              this.getData();
              this.getThumbnail();
              this.handleSubmit(e);
            }}
          >
            Submit
          </button>
        </form>
      </div>
    );
  }
}
