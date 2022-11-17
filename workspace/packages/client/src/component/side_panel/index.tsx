import React from "react";
import * as Tags from "./styled";
import FableLogo from "./fableLogo.svg";
import "./index.css";
import { FaPen, FaRegStickyNote } from "react-icons/fa";
import { FiSettings } from "react-icons/fi";

interface IOwnProps {}
interface IOwnStateProps {}

export default class SidePanel extends React.Component<
  IOwnProps,
  IOwnStateProps
> {
  constructor(props: IOwnProps) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div className={"container"}>
        <div className={"logo"}>
          <img src={FableLogo} alt={"Fable logo"} />
        </div>
        <div className="nav">
          <div className="navItems">
            <FaPen />
            <p>Edit page</p>
          </div>
          <div
            style={{
              color: "white",
              backgroundColor: "#7567ff",
            }}
            className="navItems"
          >
            <FaRegStickyNote />
            <p>All Projects</p>
            {/* <ul
              style={{
                position: "absolute",
                backgroundColor: "rgba(117, 103, 255,0.2)",
                top: "100%",
                left: 0,
                width: "100%",
                height: "4rem",
              }}
            >
              <li>Active projects</li>
              <li>Archived projects</li>
            </ul> */}
          </div>
          <div className="navItems">
            <FaPen />
            <p>Integrations</p>
          </div>
          <div className="navItems">
            <FaPen />
            <p>Analytics</p>
          </div>
          <div className="navItems">
            <FaPen />
            <p>User management</p>
          </div>
        </div>
        <div className={"footer"}>
          <div className="footerItem">
            <img
              alt="user profile pic"
              src="	https://joeschmoe.io/api/v1/random"
            />
            <p>User name</p>
          </div>
          <div className="footerItem">
            <FiSettings />
            <p>Settings</p>
          </div>
        </div>
      </div>
    );
  }
}
