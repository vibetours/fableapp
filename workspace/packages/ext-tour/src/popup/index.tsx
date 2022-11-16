import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import CreateProject from "../components/CreateProject";
import SelectProject from "../components/SelectProject";
import FormCreateProject from "../components/FormCreateProject";

type Props = {};

type State = {
  loading: boolean;
  active: "create" | "select" | "form";
};

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      active: "create",
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

      case Msg.CREATE_PROJECT:
        this.setState({ active: "form" });
        break;

      default:
        // console.error("No handler present for msg", msg);
        break;
    }
  };

  render() {
    return (
      <>
        {this.state.loading ? (
          <div className="container">
            {/* {this.state.active === "create" && <CreateProject />} */}
            {/* <SelectProject /> */}
            {/* {this.state.active === "form" && <FormCreateProject />} */}
            <FormCreateProject />
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
                textAlign: "center",
                color: "#16023e",
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
