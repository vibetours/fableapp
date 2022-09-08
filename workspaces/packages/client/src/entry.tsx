import React, { Component } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProjectsContainer from "./container/projects_container";
import ProxyContainer from "./container/proxy_load_container";

class App extends Component {
  render() {
    console.log(">>> router");
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/projects" element={<ProjectsContainer />} />
            <Route path="/loader/project/:projectId" element={<ProxyContainer />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default App;
