import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload } from "../msg";
import "./index.less";
import CreateProject from "./components/CreateProject";
import SelectProject from "./components/SelectProject";
import FormCreateProject from "./components/FormCreateProject";
import { NavigatePage } from "../types";
import MyProvider from "./context/MyProvider";

type Props = {};

type State = {
  loading: boolean;
  active: NavigatePage;
};

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
        break;
    }
  };

  render() {
    return (
      <MyProvider>
        <div className="container">
          {this.state.active === NavigatePage.Create && (
            <CreateProject onNavigate={this.navigatePage} />
          )}
          {this.state.active === NavigatePage.Select && <SelectProject />}
          {this.state.active === NavigatePage.FormCreate && (
            <FormCreateProject onNavigate={this.navigatePage} />
          )}
          <div className="container__bg">
            <div />
            <div />
            <div />
          </div>
        </div>
      </MyProvider>
    );
  }
}

// ReactDOM.render(<Root />, document.querySelector("#root"));

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(<Root />);
