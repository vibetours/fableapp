import React from "react";
import { connect } from "react-redux";
import { getAllProjects } from "../../action/creator";
import { IProject } from "../../entity_type";
import { TState } from "../../reducer";
import * as CmnTags from "../styled";
import Header from "../../component/header";
import SidePanel from "../../component/side_panel";
import ProjectCard from "../../component/project_card";
import { PageType } from "../../constant";

// Properties which inturns calls dispatcher
interface IDispatchProps {
  getProjects: () => void;
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    getProjects: () => dispatch(getAllProjects()),
  };
};

// Subset of properties that will be used by this comp of all the state properties
interface IAppStateProps {
  projects: Array<IProject>;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  projects: state.project.projects,
});

// Component own property which needs to be passed by the parent when mounted
interface IOwnProps {}
type IProps = IOwnProps & IAppStateProps & IDispatchProps;

// Component's local state
interface IOwnStateProps {}

class Projects extends React.PureComponent<IProps, IOwnStateProps> {
  componentDidMount() {
    this.props.getProjects();
  }

  render() {
    return (
      <CmnTags.Con>
        <CmnTags.BodyCon>
          <CmnTags.LeftCon style={{ width: "25%", minWidth: "18rem" }}>
            <SidePanel />
          </CmnTags.LeftCon>
          <CmnTags.MainCon>
            <CmnTags.TopCon>
              <Header page={PageType.Project} />
            </CmnTags.TopCon>
            <CmnTags.Title1>All Active Projects</CmnTags.Title1>
            <CmnTags.ProjectCardCon>
              {this.props.projects.map((project) => (
                <ProjectCard project={project} />
              ))}
            </CmnTags.ProjectCardCon>
            <CmnTags.Title1
              style={{
                marginTop: "1.5rem",
                color: "gray",
              }}
            >
              Archived Projects
            </CmnTags.Title1>
          </CmnTags.MainCon>
        </CmnTags.BodyCon>
      </CmnTags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(Projects);
