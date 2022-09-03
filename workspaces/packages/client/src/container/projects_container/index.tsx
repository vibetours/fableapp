import React from "react";
import { connect } from "react-redux";
import { getAllProjects } from "../../action/creator";
import { IProject } from "../../entity_type";
import { TState } from "../../reducer";
import * as Tags from "./styled";
import Header from "../../component/header";
import SidePanel from "../../component/side_panel";

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
      <Tags.Con>
        <Tags.TopCon>
          <Header />
        </Tags.TopCon>
        <Tags.BodyCon>
          <Tags.LeftCon>
            <SidePanel />
          </Tags.LeftCon>
        </Tags.BodyCon>
      </Tags.Con>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(Projects);
