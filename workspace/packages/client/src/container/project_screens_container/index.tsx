import React from "react";
// import { connect } from "react-redux";
// import { getAllProjects } from "../../action/creator";
// import { IProject } from "../../entity_type";
// import { TState } from "../../reducer";
import * as CmnTags from "../styled";
import Header from "../../component/header";
import SidePanel from "../../component/side_panel";
import Screen from "../../component/screens";
import { PageType } from "../../constant";

export default function ProjectScreens(): JSX.Element {
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
            <CmnTags.ProjectTitle>Acme_1</CmnTags.ProjectTitle>
            <Screen />
            <Screen />
            <Screen />
          </CmnTags.ProjectScreensContainer>
        </CmnTags.MainCon>
      </CmnTags.BodyCon>
    </CmnTags.Con>
  );
}
