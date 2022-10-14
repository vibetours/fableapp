import React from "react";
import { connect } from "react-redux";
import { TState } from "../../reducer";
import { withRouter, WithRouterProps } from "../../router_hoc";
import * as CmnTags from "../styled";
import Header from "../../component/header";
import { PageType, EMBED_LOADER_IFRAME_ID } from "../../constant";
import SideActionPanel from "../../component/side_action_panel";
import { getProject } from "../../action/creator";
import { IProject } from "../../entity_type";
import "./index.css";
import { isSameOrigin } from "@fable/common/dist/utils";
import { OutboundMessageTypes, FrameParentMsg, InboundMessageTypes, EmptyMsg } from "@fable/common/dist/constants";

// Properties which inturns calls dispatcher
interface IDispatchProps {
  getProject: (projectId: number) => void;
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    getProject: (projectId: number) => dispatch(getProject(projectId)),
  };
};

// Subset of properties that will be used by this comp of all the state properties
interface IAppStateProps {
  project: IProject | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  project: state.project.selectedProject,
});

// Component own property which needs to be passed by the parent when mounted
interface IOwnProps {}
type IProps = IOwnProps &
  IAppStateProps &
  IDispatchProps &
  WithRouterProps<{
    projectId: string;
  }>;

// Component's local state
interface IOwnStateProps {
  showCtrlPanelIcons: boolean;
  isEditing: boolean;
}

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT as string;
const API_URL = new URL(API_ENDPOINT);

class EmbedContainer extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);
    this.state = { showCtrlPanelIcons: false, isEditing: false };
  }
  componentDidMount() {
    this.props.getProject(+this.props.match.params.projectId);

    window.addEventListener("message", (e) => {
      if (isSameOrigin(e.origin, `${API_URL.protocol}://${API_URL.host}`)) {
        if (e.data === OutboundMessageTypes.EmbedReady) {
          this.setState({ showCtrlPanelIcons: true });
        }
      }
    });
  }

  sendMsgToIframe<T>(msg: FrameParentMsg<T>) {
    const iframe = document.getElementById(EMBED_LOADER_IFRAME_ID) as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(msg, "*");
    } else {
      console.warn("Message is sent but iframe not found", msg);
    }
  }

  toggleEditing = () => {
    if (this.state.isEditing) {
      this.sendMsgToIframe<typeof EmptyMsg>({
        type: InboundMessageTypes.EditModeEnd,
        data: EmptyMsg,
      });
      this.setState({ isEditing: false });
    } else {
      this.sendMsgToIframe<typeof EmptyMsg>({
        type: InboundMessageTypes.EditModeStart,
        data: EmptyMsg,
      });
      this.setState({ isEditing: true });
    }
  };

  render() {
    return (
      <CmnTags.Con>
        <CmnTags.TopCon>
          <Header page={PageType.EmbedLoader} />
        </CmnTags.TopCon>
        <CmnTags.BodyCon>
          <CmnTags.LeftCon style={{ width: "70px", minWidth: "70px" }}>
            <SideActionPanel activateIcons={this.state.showCtrlPanelIcons} toggleEditing={this.toggleEditing} />
          </CmnTags.LeftCon>
          <CmnTags.MainCon style={{ padding: 0 }}>
            {this.state.isEditing && (
              <CmnTags.EditingStatus>
                The page is currently in &nbsp;<b>Edit Mode</b>. &nbsp;{" "}
                <CmnTags.ClickableTxt onClick={this.toggleEditing}>
                  <u>Click here</u>
                </CmnTags.ClickableTxt>{" "}
                &nbsp; to finish editing.
              </CmnTags.EditingStatus>
            )}
            {this.props.project !== null && (
              <iframe
                id={EMBED_LOADER_IFRAME_ID}
                name={EMBED_LOADER_IFRAME_ID}
                title={this.props.project.title}
                src={`${API_ENDPOINT}/api/v1/asset/get/3${this.props.project.proxyOrigin}`}
              ></iframe>
            )}
          </CmnTags.MainCon>
        </CmnTags.BodyCon>
      </CmnTags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(EmbedContainer));
