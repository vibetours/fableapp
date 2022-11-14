import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Msg, MsgPayload } from '../msg';
import './index.less';

type Props = {};

type State = {
  loading: boolean;
  currentTab: string;
};

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      currentTab: "",
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
      <div className="container">
        {this.state.loading ? "loading" : "not-loading"}
        <button
          onClick={() => {
            chrome.action.getTitle({}, (title) => {
              this.setState({ currentTab: title });
              console.log(title);
            });
          }}
        >
          take screenshot
        </button>
        <p>current tab: {this.state.currentTab}</p>
      </div>
    );
  }
}

ReactDOM.render(<Root />, document.querySelector("#root"));
