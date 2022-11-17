import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import CreateProject from "./components/CreateProject";
import SelectProject from "./components/SelectProject";
import FormCreateProject from "./components/FormCreateProject";
import { NavigatePage } from "./type";

type Props = {};

interface State {
  loading: boolean;
  active: NavigatePage;
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      active: NavigatePage.Create,
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
    console.log("message received", msg);
    switch (msg.type) {
      case Msg.INITED:
        this.setState({ loading: msg.data });
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
            {this.state.active === NavigatePage.Create && (
              <CreateProject onNavigate={this.navigatePage} />
            )}
            {/* <SelectProject /> */}
            {this.state.active === NavigatePage.FormCreate && (
              <FormCreateProject onNavigate={this.navigatePage} />
            )}
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

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(<Root />);
