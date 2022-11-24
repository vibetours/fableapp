import React, { useEffect, useState } from "react";
// import { connect } from "react-redux";
// import { getAllProjects } from "../../action/creator";
// import { IProject } from "../../entity_type";
// import { TState } from "../../reducer";
import axios from "axios";
import * as CmnTags from "../styled";
import Header from "../../component/header";
import SidePanel from "../../component/side_panel";
import Screen from "../../component/screens";
import { PageType } from "../../constant";

export interface VersionHistory {
  title: string;
  createdFrom: string;
  updatedBy: string;
}

export interface IScreen {
  title: string;
  createdBy: string;
  versionHistory?: Array<VersionHistory>;
}

interface Project {
  id: number;
  name: string;
  screens: Array<IScreen>;
}

export default function ProjectScreens(): JSX.Element {
  const [project, setProject] = useState<Project>();
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function fetchProject() {
      try {
        const res = await axios.get("http://localhost:3004/projects/1");
        setProject(res.data);
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchProject();
  }, []);

  return (
    <CmnTags.Con>
      <CmnTags.BodyCon>
        <CmnTags.LeftCon style={{ width: "22%", minWidth: "18rem" }}>
          <SidePanel />
        </CmnTags.LeftCon>
        <CmnTags.MainCon>
          <CmnTags.TopCon>
            <Header page={PageType.Project} />
          </CmnTags.TopCon>
          <CmnTags.ProjectScreensContainer>
            <CmnTags.ProjectTitle>{project?.name}</CmnTags.ProjectTitle>
            {project?.screens.map((screen) => (
              <Screen info={screen} />
            ))}
            {/* <Screen />
            <Screen />
            <Screen /> */}
          </CmnTags.ProjectScreensContainer>
        </CmnTags.MainCon>
      </CmnTags.BodyCon>
    </CmnTags.Con>
  );
}
