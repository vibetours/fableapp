import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { init as sentryInit } from "@fable/common/dist/sentry";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import { IExtStoredState, RecordingStatus } from "../types";
import Loader from "./components/loader";
import { version } from "../../package.json";
import DisabledStopDelActionBtns from "./components/disabled-action-btns";

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

sentryInit("extension", version);

type Props = {};

const RecordBtnText = "Record a new demo";
const StopBtnText = "Stop Recording";
const DeleteBtnText = "Delete Recording";
const StoppingBtnText = "Finishing...";
const DeletingBtnText = "Deleting...";

interface State {
  // This state is true when all the data is retrieved for the extension to work.
  // In this case logged in user, org etc
  inited: boolean;
  recordingStatus: RecordingStatus,
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inited: false,
      recordingStatus: RecordingStatus.Idle,
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
          recordingStatus: tMsg.data.recordingStatus
        });
        break;

      case Msg.RECORDING_CREATE_OR_DELETE_COMPLETED:
        this.setState({ recordingStatus: RecordingStatus.Idle });
        window.close();
        break;

      default:
        break;
    }
  };

  startRecording = () => {
    this.setState({ recordingStatus: RecordingStatus.Recording });
    chrome.runtime.sendMessage({ type: Msg.START_RECORDING });
    setTimeout(() => {
      window.close();
    }, 300);
  };

  stopRecording = () => {
    this.setState({ recordingStatus: RecordingStatus.Stopping });
    chrome.runtime.sendMessage({ type: Msg.STOP_RECORDING });
  };

  deleteRecording = () => {
    this.setState({ recordingStatus: RecordingStatus.Deleting });
    chrome.runtime.sendMessage({ type: Msg.DELETE_RECORDING });
  };

  resetState = () => {
    this.setState({ recordingStatus: RecordingStatus.Idle });
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
            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer"
              }}
              onClick={this.openLinkInNewTab("demos")}
            >
              <img
                alt="illustration"
                style={{ margin: "0.5rem 0" }}
                width={100}
                src="./illustration-extension.png"
              />
            </button>
            <div style={{ margin: "0.5rem 0rem 1rem 0rem" }}>
              <div className="as-p title">Create stunning interactive demos in 5 minutes</div>
              <div className="as-p description">
                <ul style={{
                  listStyleType: "none"
                }}
                >
                  <li>✅ For marketing teams to create interactive tours</li>
                  <li>✅ For sales teams to create personalized demos</li>
                  <li>✅ For support to create interactive guides</li>
                </ul>
              </div>
            </div>

            {
              this.state.recordingStatus === RecordingStatus.Idle && (
                <button type="button" className="btn-primary" onClick={this.startRecording}>
                  {RecordBtnText}
                </button>
              )
            }
            {
              this.state.recordingStatus === RecordingStatus.Recording && (
                <>
                  <button type="button" className="btn-primary" onClick={this.stopRecording}>
                    {StopBtnText}
                  </button>
                  <button type="button" className="btn-secondary" onClick={this.deleteRecording}>
                    {DeleteBtnText}
                  </button>
                </>
              )
            }
            {
              this.state.recordingStatus === RecordingStatus.Stopping && (
                <DisabledStopDelActionBtns
                  stopBtnText={StoppingBtnText}
                  deleteBtnText={DeleteBtnText}
                />
              )
            }
            {
              this.state.recordingStatus === RecordingStatus.Deleting && (
                <DisabledStopDelActionBtns
                  stopBtnText={StopBtnText}
                  deleteBtnText={DeletingBtnText}
                />
              )
            }
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
