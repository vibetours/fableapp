import React, { useState } from "react";
import "./index.less";
import { Listbox, Transition } from "@headlessui/react";

type ProjectType = {
  name: string;
  id: number;
};

const projects: ProjectType[] = [
  {
    name: "Project 1",
    id: 1,
  },
  {
    name: "Project 2",
    id: 2,
  },
  {
    name: "Project 3",
    id: 3,
  },
];

export default function SelectProject() {
  const [selectedProject, setSelectedProject] = useState<ProjectType>(
    projects[0]
  );

  return (
    <div className="container__select">
      <div className="container__select-create">
        <div className="container__select-create-container">
          <Listbox
            value={selectedProject}
            onChange={(project) => {
              setSelectedProject(project);
            }}
            as="div"
            style={{
              width: "100%",
            }}
          >
            {({ open }) => (
              <div
                style={{
                  borderRadius: "8px",
                  border: "1.8px solid #7567ff",
                  padding: "0.8rem 1.2rem",
                }}
              >
                <Listbox.Button
                  as="div"
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    position: "relative",
                    color: "#16023e",
                    fontSize: "1.2rem",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    userSelect: "none",
                  }}
                >
                  <span>{selectedProject.name}</span>
                  <span>+</span>
                </Listbox.Button>
                <Transition
                  show={open}
                  as={React.Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options
                    style={{
                      position: "absolute",
                      listStyle: "none",
                      padding: "0",
                      backgroundColor: "white",
                      maxHeight: "9rem",
                      width: "100%",
                      left: 0,
                      top: "100%",
                      borderRadius: "8px",
                      overflow: "auto",
                      userSelect: "none",
                      border: "0px",
                      boxShadow: "0px 8px 14px -5px rgba(0, 0, 0, 0.4)",
                    }}
                  >
                    {projects.map((project) => (
                      <Listbox.Option key={project.id} value={project}>
                        {({ selected, active }) => (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "1rem",
                              color: active ? "white" : "#16023e",
                              fontWeight: selected ? 600 : 300,
                              padding: ".4rem 1.2rem",
                              backgroundColor: active ? "#16023e" : "white",
                              userSelect: "none",
                            }}
                          >
                            <span>{project.name}</span>
                            {selected ? <span>-</span> : null}
                          </div>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            )}
          </Listbox>
          <button
            onClick={() => {
              console.log("create project");
            }}
            type="button"
            style={{
              width: "52px",
              height: "52px",
              fontSize: "2.4rem",
              fontWeight: "600",
              color: "white",
              border: "none",
              backgroundColor: "#7567ff",
              borderRadius: "8px",
            }}
          >
            +
          </button>
        </div>
        <span className="container__select-create-update">
          Last updated 2 mins ago
        </span>
      </div>
      <button type="submit" className="container__select-new">
        + Create a new project
      </button>
      <div className="container__select-save">
        <button type="submit">Save screen in project</button>
        <span>or Press cmd + E</span>
      </div>
    </div>
  );
}
