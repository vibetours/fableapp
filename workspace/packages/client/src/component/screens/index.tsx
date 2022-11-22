import React from "react";
import * as Tags from "./styled";
import VHScreenCard from "./VHScreenCard";
import OptionsMenu from "./OptionsMenu";
import { DownOutlined } from "@ant-design/icons";
import { Collapse } from "antd";

const { Panel } = Collapse;

function genExtra(): JSX.Element {
  return (
    <div style={{ fontSize: "0.625rem", lineHeight: "0.812rem" }}>
      Version history
    </div>
  );
}

export default function Screen(): JSX.Element {
  return (
    <Tags.FlexContainer>
      <Tags.CardContainer>
        <Tags.ScreenContainer>
          <Tags.Thumbnail />
          <Tags.InfoContainer>
            <Tags.ScreenTitle>Home Screen</Tags.ScreenTitle>
            <Tags.RightAlignContainer>
              <Tags.ScreensNumber>12 screens</Tags.ScreensNumber>
              <Tags.MenuIcon />
            </Tags.RightAlignContainer>
            <Tags.ScreenInfo alignSelf={"end"}>Used in 3 flows</Tags.ScreenInfo>
            <div></div>
            <Tags.ScreenInfo alignSelf={"center"}>
              Last edited 20 mins ago
            </Tags.ScreenInfo>
            <Tags.RightAlignContainer>
              <Tags.ScreenInfo>Created by Akash</Tags.ScreenInfo>
              <Tags.CreatedByAvatar
                className="ant-avatar ant-avatar-circle ant-avatar-img"
                alt="avatar"
                src="https://joeschmoe.io/api/v1/random"
              />
            </Tags.RightAlignContainer>
          </Tags.InfoContainer>
        </Tags.ScreenContainer>
        <Tags.CollapseContainer
          collapsible="icon"
          bordered={false}
          expandIconPosition={"end"}
          expandIcon={({ isActive }) => (
            <DownOutlined rotate={isActive ? 180 : 0} />
          )}
        >
          <Panel extra={genExtra()} header="" key="1">
            <VHScreenCard />
            <VHScreenCard />
          </Panel>
        </Tags.CollapseContainer>
      </Tags.CardContainer>
      <OptionsMenu />
    </Tags.FlexContainer>
  );
}
