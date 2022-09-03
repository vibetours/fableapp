import React, { Component } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ProjectsContainer from "./container/projects_container";

class App extends Component {
  render() {
    console.log(">>> router");
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/projects" element={<ProjectsContainer />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default App;
