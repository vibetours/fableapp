import React, { ReactElement } from "react";
import * as Tags from "./styled";
import { Avatar, Button } from "antd";
import fableLogo from "../../assets/fable-logo-2.svg";
import * as GTags from "../../common-styled";

interface IOwnProps {
  rBtnTxt?: string;
  shouldShowLogoOnLeft?: boolean;
  titleTxtOnLeft?: string;
  titleElOnLeft?: ReactElement;
}
interface IOwnStateProps {}

export default class Header extends React.PureComponent<IOwnProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Tags.LMenuCon>
          {this.props.shouldShowLogoOnLeft && (
            <img src={fableLogo} alt="fable logo solid" style={{ width: "36px", marginRight: "0.75rem" }}></img>
          )}
          {this.props.titleTxtOnLeft && <GTags.Txt className="head">{this.props.titleTxtOnLeft}</GTags.Txt>}
          {this.props.titleElOnLeft && this.props.titleElOnLeft}
        </Tags.LMenuCon>
        <Tags.RMenuCon>
          {this.props.rBtnTxt && (
            <Tags.MenuItem>
              <Button shape="round" size="middle">
                {this.props.rBtnTxt}
              </Button>
            </Tags.MenuItem>
          )}
          <Tags.MenuItem>
            <Avatar src="https://avatars.dicebear.com/api/adventurer/yen.svg" />
          </Tags.MenuItem>
        </Tags.RMenuCon>
      </Tags.Con>
    );
  }
}
