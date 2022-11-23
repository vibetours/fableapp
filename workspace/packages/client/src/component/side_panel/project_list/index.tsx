import React from "react";
import * as Tags from "./styled";
import { useState } from "react";
import iconArrowRight from "../../../assets/side_panel/IconArrowRight.svg";
import iconAllProjects from "../../../assets/side_panel/IconAllProjects.svg";

const Projects = [
  {
    id: 1,
    name: "Active projects",
    projects: [
      {
        id: 11,
        name: "Acme_1",
        items: ["Screen", "Flow"],
      },
      {
        id: 12,
        name: "Acme_2",
        items: ["Screen", "Flow"],
      },
    ],
  },
  {
    id: 2,
    name: "Archived projects",
    projects: [
      {
        id: 21,
        name: "Acme_3",
        items: ["Screen", "Flow"],
      },
    ],
  },
];

const ProjectList = (): JSX.Element => {
  const [showAllProjects, setShowAllProjects] = useState<boolean>(false);
  const [showProject, setShowProject] = useState<number[]>([]);

  return (
    <Tags.AllProjectsCon showProjects={showAllProjects}>
      <Tags.ProjectsBtn
        onClick={() => {
          setShowAllProjects(!showAllProjects);
        }}
      >
        <Tags.RightArrow
          showProjects={showAllProjects}
          src={iconArrowRight}
          alt={"illustration right arrow"}
        />
        <img src={iconAllProjects} alt={"illustration"} />
        <p>All Projects</p>
      </Tags.ProjectsBtn>
      <Tags.ProjectsCon showProjects={showAllProjects}>
        {Projects.map((project) => {
          return (
            <Tags.ProjectCon>
              <Tags.ProjectBtn
                onClick={() => {
                  if (showProject.includes(project.id)) {
                    setShowProject(
                      showProject.filter((id) => id !== project.id)
                    );
                  } else {
                    setShowProject([...showProject, project.id]);
                  }
                }}
              >
                <div>
                  <Tags.RightArrow
                    showProjects={showProject.includes(project.id)}
                    src={iconArrowRight}
                    alt={"illustration right arrow"}
                  />
                  <p>{project.name}</p>
                </div>
              </Tags.ProjectBtn>
              <Tags.ProjectItems
                showProjects={showProject.includes(project.id)}
              >
                {project.projects.map((pr) => {
                  return (
                    <Tags.ProjectItem>
                      <Tags.ProjectItemBtn
                        onClick={() => {
                          if (showProject.includes(pr.id)) {
                            setShowProject(
                              showProject.filter((id) => id !== pr.id)
                            );
                          } else {
                            setShowProject([...showProject, pr.id]);
                          }
                        }}
                      >
                        <div>
                          <Tags.RightArrow
                            showProjects={showProject.includes(pr.id)}
                            src={iconArrowRight}
                            alt={"illustration right arrow"}
                          />
                          <p>{pr.name}</p>
                        </div>
                      </Tags.ProjectItemBtn>
                      <Tags.ProjectItemList
                        showProjects={showProject.includes(pr.id)}
                      >
                        {pr.items.map((item) => {
                          return (
                            <li>
                              <span>{item}</span>
                            </li>
                          );
                        })}
                      </Tags.ProjectItemList>
                    </Tags.ProjectItem>
                  );
                })}
              </Tags.ProjectItems>
            </Tags.ProjectCon>
          );
        })}
        {/* <Tags.ProjectCon>
          <Tags.ProjectBtn onClick={()=> setShowActiveProjects(!showActiveProjects)}>
            <div>
              <Tags.RightArrow showProjects={showActiveProjects} src={iconArrowRight} />
              <p>Active projects</p>
            </div>
          </Tags.ProjectBtn>
          <Tags.ProjectItems showProjects={showActiveProjects}>
            <Tags.ProjectItem>
              <Tags.ProjectItemBtn onClick={()=> setShowProject1(!showProject1)}>
                <div>
                  <Tags.RightArrow src={iconArrowRight} showProjects={showProject1} />
                  <p>Project 1</p>
                </div>
              </Tags.ProjectItemBtn>
              <Tags.ProjectItemList showProjects={showProject1}>
                <li>
                  <span>Screen</span>
                </li>
                <li>
                  <span>Flow</span>
                </li>
              </Tags.ProjectItemList>
            </Tags.ProjectItem>
            <Tags.ProjectItem>
              <Tags.ProjectItemBtn onClick={()=> setShowProject2(!showProject2)}>
                <div>
                  <Tags.RightArrow src={iconArrowRight} showProjects={showProject2} />
                  <p>Project 2</p>
                </div>
              </Tags.ProjectItemBtn>
              <Tags.ProjectItemList showProjects={showProject2}>
                <li>
                  <span>Screen</span>
                </li>
                <li>
                  <span>Flow</span>
                </li>
              </Tags.ProjectItemList>
            </Tags.ProjectItem>
          </Tags.ProjectItems>
        </Tags.ProjectCon> */}
      </Tags.ProjectsCon>
    </Tags.AllProjectsCon>
  );
};

export default ProjectList;
