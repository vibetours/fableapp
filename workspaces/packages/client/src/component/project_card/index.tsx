import React from "react";
import * as Tags from "./styled";
import { IProject } from "../../entity_type";
import { LinkOutlined } from "@ant-design/icons";
import "./index.css";
import { Button } from "antd";

interface IOwnProps {
  project: IProject;
}
interface IOwnStateProps {
  showActions: boolean;
}

export default class ProjectCard extends React.PureComponent<IOwnProps, IOwnStateProps> {
  constructor(props: IOwnProps) {
    super(props);
    this.state = {
      showActions: false,
    };
  }
  render() {
    return (
      <Tags.CardCon
        onMouseOut={() => this.setState({ showActions: false })}
        onMouseOver={() => {
          this.setState({ showActions: true });
        }}
      >
        <Tags.CardImageCon
          style={{
            backgroundImage: `url("${this.props.project.thumbnail}")`,
          }}
          className={this.state.showActions ? "blur-bg" : ""}
        ></Tags.CardImageCon>
        {this.state.showActions && (
          <Tags.ActionBtnsCon>
            <Button
              size="middle"
              style={{
                marginBottom: "10px",
              }}
              type="primary"
            >
              Share Demo URL
            </Button>
            <Button type="default" size="middle">
              Edit Project
            </Button>
          </Tags.ActionBtnsCon>
        )}
        <Tags.CardDescCon>
          <Tags.TextMain>{this.props.project.displayName}</Tags.TextMain>
          <Tags.TextLink>
            {this.props.project.origin} <LinkOutlined />
          </Tags.TextLink>
          <Tags.TextSecondary>
            Created by <b>Akash</b> & last updated on <b>1st Sep</b>
          </Tags.TextSecondary>
        </Tags.CardDescCon>
      </Tags.CardCon>
    );
  }
}
