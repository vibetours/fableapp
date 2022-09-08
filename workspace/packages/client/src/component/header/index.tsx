import React from "react";
import * as Tags from "./styled";
import { Avatar, Button } from "antd";
import { PageType } from "../../constant";

interface IOwnProps {
  page: PageType;
}
interface IOwnStateProps {}

export default class Header extends React.PureComponent<IOwnProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Tags.LogoCon>Fable</Tags.LogoCon>
        <Tags.MenuCon>
          <Tags.MenuItem>
            <Button shape="round" size="middle">
              {this.props.page === PageType.Project ? "Record a Demo" : "Create Demo Link"}
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
