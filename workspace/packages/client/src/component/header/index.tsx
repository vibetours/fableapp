import React from "react";
import * as Tags from "./styled";
import { Avatar, Button } from "antd";
import { PageType } from "../../constant";

interface IOwnProps {
  from: PageType;
}
interface IOwnStateProps {}

export default class Header extends React.PureComponent<IOwnProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Tags.LogoCon></Tags.LogoCon>
        <Tags.MenuCon>
          <Tags.MenuItem>
            <Button shape="round" size="middle">
              {this.props.from === PageType.Screen ? "Record a screen" : "Create demo link"}
            </Button>
          </Tags.MenuItem>
          <Tags.MenuItem>
            <Avatar src="https://avatars.dicebear.com/api/adventurer/yen.svg" />
          </Tags.MenuItem>
        </Tags.MenuCon>
      </Tags.Con>
    );
  }
}
