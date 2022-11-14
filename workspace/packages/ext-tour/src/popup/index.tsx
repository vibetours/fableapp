import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Msg, MsgPayload } from '../msg';
import './index.less';

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

  onMessageReceiveFromWorkerScript = (msg: MsgPayload<any>, sender: chrome.runtime.MessageSender) => {
    console.log('message received', msg);
    switch (msg.type) {
      case Msg.INITED:
        this.setState({ loading: msg.data });
        break;

      default:
        console.error('No handler present for msg', msg);
        break;
    }
  };

  render() {
    return <div className="con">{this.state.loading ? 'loading' : 'not-loading'}</div>;
  }
}

ReactDOM.render(<Root />, document.querySelector('#root'));
