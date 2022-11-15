import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import CreateProject from "../components/CreateProject";
import SelectProject from "../components/SelectProject";

type Props = {};

type State = {
  loading: boolean;
};

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
    };

    chrome.runtime.onMessage.addListener(this.onMessageReceiveFromWorkerScript);
    chrome.runtime.sendMessage({ type: Msg.INIT });
  }

  onMessageReceiveFromWorkerScript = (
    msg: MsgPayload<any>,
    sender: chrome.runtime.MessageSender
  ) => {
    console.log("message received", msg);
    switch (msg.type) {
      case Msg.INITED:
        this.setState({ loading: msg.data });
        break;

      default:
        console.error("No handler present for msg", msg);
        break;
    }
  };

  render() {
    return (
      <>
        {this.state.loading ? (
          <div className="container">
            <CreateProject />
            {/* <SelectProject /> */}
            <div className="container__bg">
              <div />
              <div />
              <div />
            </div>
          </div>
        ) : (
          <div className="container">
            <h1
              style={{
                alignItems: "center",
              }}
            >
              Loading...
            </h1>
            <div className="container__bg">
              <div />
              <div />
              <div />
            </div>
          </div>
        )}
        {/* <button
            onClick={() => {
              chrome.tabs.captureVisibleTab(
                {
                  format: "png",
                  quality: 100,
                },
                (dataUrl) => {
                  console.log(dataUrl);
                }
              );
            }}
          >
            take screenshot
          </button> */}
      </>
    );
  }
}

// ReactDOM.render(<Root />, document.querySelector("#root"));

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(<Root />);
