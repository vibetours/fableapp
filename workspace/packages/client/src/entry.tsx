import React, { Component } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProjectsContainer from "./container/projects_container";
import EmbedContainer from "./container/embed_load_container";
import ProjectScreens from "./container/project_screens_container";

class App extends Component {
  render() {
    console.log(">>> router");
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/projects" element={<ProjectsContainer />} />
            <Route path="/projects/:projectId/screens" element={<ProjectScreens />} />
            <Route path="/loader/project/:projectId" element={<EmbedContainer />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default App;

