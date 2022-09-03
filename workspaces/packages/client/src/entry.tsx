import React, { Component } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import SampleContainer from "./container/sample_container";

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<SampleContainer idText="Base route" />} />
            <Route path="/sample" element={<SampleContainer idText="Elaborate route" />} />
          </Routes>
        </div>
      </Router>
    );
  }
}

export default App;
