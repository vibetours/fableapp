import React from "react";
import * as Tags from "./styled";
import { Button } from "antd";
import { EditOutlined } from "@ant-design/icons";

interface IOwnProps {
  activateIcons: boolean;
  toggleEditing: () => void;
}
interface IOwnStateProps {}

export default class SideActionPanel extends React.PureComponent<IOwnProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Button
          size="large"
          type="default"
          icon={<EditOutlined />}
          disabled={this.props.activateIcons}
          onClick={this.props.toggleEditing}
        ></Button>
      </Tags.Con>
    );
  }
}
