import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { init as sentryInit } from "@fable/common/dist/sentry";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import { IExtStoredState, IUser } from "../types";
import { RootContext } from "./ctx";
import Loader from "./components/loader";
import { version } from "../../package.json";

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

sentryInit("extension", version);

type Props = {};

interface State {
  // This state is true when all the data is retrieved for the extension to work.
  // In this case logged in user, org etc
  inited: boolean;
  isRecordingStarted: boolean;
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inited: false,
      isRecordingStarted: false
    };

    chrome.runtime.onMessage.addListener(this.onMessageReceiveFromWorkerScript);
    chrome.runtime.sendMessage({ type: Msg.INIT });
  }

  onMessageReceiveFromWorkerScript = (msg: MsgPayload<any>, sender: chrome.runtime.MessageSender) => {
    switch (msg.type) {
      case Msg.INITED:
        const tMsg = msg as MsgPayload<IExtStoredState>;
        this.setState({
          inited: true,
          isRecordingStarted: tMsg.data.isRecordingStarted
        });
        break;

      default:
        break;
    }
  };

  startRecording = () => {
    this.setState({ isRecordingStarted: true });
    chrome.runtime.sendMessage({ type: Msg.START_RECORDING });
    setTimeout(() => {
      window.close();
    }, 300);
  };

  stopRecording = () => {
    this.setState({ isRecordingStarted: false });
    chrome.runtime.sendMessage({ type: Msg.STOP_RECORDING });
  };

  resetState = () => {
    this.setState({ isRecordingStarted: false });
    chrome.runtime.sendMessage({ type: Msg.RESET_STATE });
    setTimeout(() => {
      window.close();
    }, 300);
  };

  // eslint-disable-next-line class-methods-use-this
  openLinkInNewTab = (path: string) => () => {
    chrome.tabs.create({ active: true, url: `${APP_CLIENT_ENDPOINT}/${path}` });
  };

  render() {
    return (
      <div className="p-con">
        <div style={{ position: "absolute", top: "5px", right: "5px", color: "gray", fontSize: "0.75rem" }}>
          <span>
            v{version}
          </span>
          &nbsp;&nbsp;
          <span style={{ cursor: "pointer", paddingTop: "4px" }} title="Reset extension state" onClick={this.resetState}>
            ◼︎
          </span>
        </div>
        {!this.state.inited && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <img alt="logo" src="./logo_16.png" className="sm-logo" />
              <div style={{ marginLeft: "0.5rem" }}>Please wait while we set things up for you</div>
            </div>
            <Loader />
          </div>
        )}
        {this.state.inited && (
          <div className="action-con">
            <img alt="illustration" style={{ margin: "0.5rem 0" }} width={100} src="./illustration-extension.png" />
            <div style={{ margin: "0.5rem 0rem 1rem 0rem" }}>
              <div className="as-p title">Fable helps you create tour of your product in matter of minutes.</div>
              <div className="as-p description">
                <ol>
                  <li>Click on “Start Recording”</li>
                  <li>Click through your product to create the tour. Don't worry, it's not a video recording, if you've made a mistake you can edit / augment / trim every aspect of your tour.</li>
                  <li>Once you are done, click on the tick sign from the control pill or click on "Stop Recording" from the extension menu.</li>
                </ol>
              </div>
            </div>

            {this.state.isRecordingStarted
              ? (
                <button type="button" className="btn-primary" onClick={this.stopRecording}>
                  Stop Recording
                </button>
              )
              : (
                <button type="button" className="btn-primary" onClick={this.startRecording}>
                  Start Recording
                </button>
              )}

            <button type="button" className="btn-secondary" onClick={this.openLinkInNewTab("tours")}>
              See all Tours
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
