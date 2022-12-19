import React, { Component } from "react";
import { createRoot } from "react-dom/client";
import { Msg, MsgPayload, Payload_UpdatePersistentState } from "../msg";
import "./index.less";
import Intro from "./components/intro";
import Main from "./components/main";
import FormCreateProject from "./components/FormCreateProject";
import { IExtStoredState, IProject, Route } from "../types";
import { RootContext } from "./ctx";

type Props = {};

interface State {
  activeRoute: Route;
  projects: Array<IProject>;
  selectedProject: number;
  inited: boolean;
}

class Root extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      inited: false,
      projects: [],
      selectedProject: -1,
      activeRoute: Route.Main,
    };

    chrome.runtime.onMessage.addListener(this.onMessageReceiveFromWorkerScript);
    chrome.runtime.sendMessage({ type: Msg.INIT });
  }

  navigateToRoute = (activeRoute: Route) => {
    this.setState({ activeRoute });
  };

  changeProjectSelection = (id: number) => {
    const projects = this.state.projects;
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id === id) {
        const data: Payload_UpdatePersistentState = {
          selectedProjectId: id,
          selectedProjectIndex: i,
        };
        chrome.runtime.sendMessage({
          type: Msg.UPDATE_PERSISTENT_STATE,
          data,
        });
        this.setState({ selectedProject: i });
        break;
      }
    }
  };

  saveScreenToProject = () => {
    chrome.runtime.sendMessage({
      type: Msg.SAVE_SCREEN_TO_PROJECT,
      data: { project: this.state.projects[this.state.selectedProject] },
    });
  };

  onMessageReceiveFromWorkerScript = (
    msg: MsgPayload<any>,
    sender: chrome.runtime.MessageSender
  ) => {
    switch (msg.type) {
      case Msg.INITED:
        const tMsg = msg as MsgPayload<IExtStoredState>;
        const route = tMsg.data.projects.length ? Route.Main : Route.Intro;
        this.setState({
          inited: true,
          projects: tMsg.data.projects,
          selectedProject: tMsg.data.selectedProjectIndex,
          activeRoute: route,
        });
        break;

      default:
        break;
    }
  };

  render() {
    if (!this.state.inited) {
      // TODO[asset] loader screen
      return (
        <div>
          <em>todo</em>loader page
        </div>
      );
    }
    // We will check if there are projects in state, if there are projects then we don't show the CreateProject route
    // We will directly send them to SelectProject route
    return (
      <RootContext.Provider value={{ navigateToRoute: this.navigateToRoute }}>
        <div className="container">
          {this.state.activeRoute === Route.Intro && <Intro />}
          {this.state.activeRoute === Route.Main && (
            <Main
              projects={this.state.projects}
              selectedProject={this.state.selectedProject}
              changeProjectSelection={this.changeProjectSelection}
              saveScreenToProject={this.saveScreenToProject}
            />
          )}
          {this.state.activeRoute === Route.NewProject && <FormCreateProject />}
          <div className="container__bg">
            <div />
            <div />
            <div />
          </div>
        </div>
      </RootContext.Provider>
    );
  }
}

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);
root.render(<Root />);
