import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import { IExtStoredState, IUser } from "../types";
import { RootContext } from "./ctx";
import Loader from "./components/loader";

type Props = {};

interface State {
  // This state is true when all the data is retrieved for the extension to work.
  // In this case logged in user, org etc
  inited: boolean;
  identity: IUser | null;
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inited: false,
      identity: null,
    };

    chrome.runtime.onMessage.addListener(this.onMessageReceiveFromWorkerScript);
    chrome.runtime.sendMessage({ type: Msg.INIT });
  }

  navigatePage = (active: NavigatePage) => {
    this.setState({ active });
  };

  onMessageReceiveFromWorkerScript = (
    msg: MsgPayload<any>,
    sender: chrome.runtime.MessageSender
  ) => {
    switch (msg.type) {
      case Msg.INITED:
        const tMsg = msg as MsgPayload<IExtStoredState>;
        this.setState({
          inited: true,
          identity: tMsg.data.identity,
        });
        break;

      default:
        break;
    }
  };

  addSampleUser = () => {
    chrome.runtime.sendMessage({ type: Msg.ADD_SAMPLE_USER });
  };

  saveScreen = () => {
    chrome.runtime.sendMessage({ type: Msg.SAVE_SCREEN });
  };

  openLinkInNewTab = (path: string) => () => {
    chrome.runtime.sendMessage({
      type: Msg.OPEN_LINK_IN_NEW_TAB,
      data: { path },
    });
  };

  render() {
    return (
      <div className="p-con">
        {!this.state.inited && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img alt="logo" src="./logo_16.png" className="sm-logo" />
              <div style={{ marginLeft: "0.5rem" }}>
                Please wait while we set things up for you
              </div>
            </div>
            <Loader />
          </div>
        )}
        {this.state.inited && !this.state.identity && (
          <div className="login-con">
            <b>TODO</b> Show login screen
            <div>
              <a onClick={this.addSampleUser}>
                Click here to add a sample user
              </a>
            </div>
          </div>
        )}
        {this.state.inited && this.state.identity && (
          <div className="action-con">
            <img alt="illustration" src="./illustration-extension.svg" />
            <div style={{ margin: "0.65rem 0rem" }}>
              <div className="as-p">
                Fable helps you create tour of your product in matter of
                minutes.
              </div>
              <div className="as-p">
                Once you click on <em>Save Screen</em>, Fable copies an
                interactive version of the current webpage and lets you edit,
                annotate & connect multiple screens to create a tour of your
                product.
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={this.saveScreen}
            >
              Save screen or press <span className="em">⌘ + E</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={this.openLinkInNewTab("/screens")}
            >
              See all saved screen
            </button>
          </div>
        )}
        <div className="header-pills">
          <div />
          <div />
          <div />
        </div>
      </div>
    );
  }
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
root.render(<Root />);
