import React, { ReactElement } from "react";
import * as Tags from "./styled";
import { Avatar, Button } from "antd";
import fableLogo from "../../assets/fable-logo-2.svg";
import * as GTags from "../../common-styled";
import { Link } from "react-router-dom";

interface IOwnProps {
  rBtnTxt?: string;
  shouldShowLogoOnLeft?: boolean;
  navigateToWhenLogoIsClicked?: string;
  titleTxtOnLeft?: string;
  titleElOnLeft?: ReactElement;
}

type IProps = IOwnProps;

interface IOwnStateProps {}

class Header extends React.PureComponent<IProps, IOwnStateProps> {
  render() {
    return (
      <Tags.Con>
        <Tags.LMenuCon>
          {this.props.shouldShowLogoOnLeft && (
            <Link to={this.props.navigateToWhenLogoIsClicked!}>
              <img
                src={fableLogo}
                alt="fable logo solid"
                style={{ width: "36px", marginRight: "0.75rem", cursor: "pointer" }}
              ></img>
            </Link>
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

export default Header;

