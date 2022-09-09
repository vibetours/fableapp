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
interface IOwnStateProps {}

class EmbedContainer extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount() {
    this.props.getProject(+this.props.match.params.projectId);
  }

  render() {
    return (
      <CmnTags.Con>
        <CmnTags.TopCon>
          <Header page={PageType.EmbedLoader} />
        </CmnTags.TopCon>
        <CmnTags.BodyCon>
          <CmnTags.LeftCon style={{ width: "70px", minWidth: "70px" }}>
            <SideActionPanel />
          </CmnTags.LeftCon>
          <CmnTags.MainCon style={{ padding: 0 }}>
            {this.props.project !== null && (
              <iframe
                id={EMBED_LOADER_IFRAME_ID}
                name={EMBED_LOADER_IFRAME_ID}
                title={this.props.project.title}
                src={`http://localhost:8080/api/v1/asset/get/1${this.props.project.proxyOrigin}`}
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
