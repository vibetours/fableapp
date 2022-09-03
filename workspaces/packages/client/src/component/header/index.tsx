import React from "react";
import * as Tags from "./styled";
import { Avatar, Button } from "antd";

interface IOwnProps {}
interface IOwnStateProps {}

export default class Header extends React.PureComponent<IOwnProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Tags.LogoCon>Fable</Tags.LogoCon>
        <Tags.MenuCon>
          <Tags.MenuItem>
            <Button shape="round" size="middle">
              Record a Demo
            </Button>
          </Tags.MenuItem>
          <Tags.MenuItem>
            <Avatar src="https://joeschmoe.io/api/v1/random" />
          </Tags.MenuItem>
        </Tags.MenuCon>
      </Tags.Con>
    );
  }
}
