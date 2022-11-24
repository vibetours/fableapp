import React, { useState } from "react";
import * as Tags from "./styled";
import VHScreenCard from "./VHScreenCard";
import OptionsMenu from "./OptionsMenu";
import DownArrow from "../../assets/screens/DownArrow.svg";
import { Collapse } from "antd";
import { IScreen } from "../../container/project_screens_container";

const { Panel } = Collapse;

function genExtra(): JSX.Element {
  return (
    <div style={{ fontSize: "0.625rem", lineHeight: "0.812rem" }}>
      Version history
    </div>
  );
}

interface Props {
  info: IScreen;
}

export default function Screen({ info }: Props): JSX.Element {
  const [showOptions, setShowOptions] = useState<boolean>(false);

  return (
    <Tags.FlexContainer>
      <Tags.CardContainer>
        <Tags.ScreenContainer>
          <Tags.Thumbnail />
          <Tags.InfoContainer>
            <Tags.ScreenTitle>{info.title}</Tags.ScreenTitle>
            <Tags.RightAlignContainer>
              <Tags.ScreensNumber>12 screens</Tags.ScreensNumber>
              <Tags.MenuIcon onClick={() => setShowOptions(!showOptions)} />
            </Tags.RightAlignContainer>
            <Tags.ScreenInfo alignSelf={"end"}>Used in 3 flows</Tags.ScreenInfo>
            <div></div>
            <Tags.ScreenInfo alignSelf={"center"}>
              Last edited 20 mins ago
            </Tags.ScreenInfo>
            <Tags.RightAlignContainer>
              <Tags.ScreenInfo>Created by {info.createdBy}</Tags.ScreenInfo>
              <Tags.CreatedByAvatar
                className="ant-avatar ant-avatar-circle ant-avatar-img"
                alt="avatar"
                src="https://joeschmoe.io/api/v1/random"
              />
            </Tags.RightAlignContainer>
          </Tags.InfoContainer>
        </Tags.ScreenContainer>
        {info.versionHistory && (
          <Tags.CollapseContainer
            collapsible="icon"
            bordered={false}
            expandIconPosition={"end"}
            expandIcon={({ isActive }) => (
              <Tags.ExpandIcon isActive={isActive}>
                <img src={DownArrow} alt={"duplicate"} />
              </Tags.ExpandIcon>
            )}
          >
            <Panel extra={genExtra()} header="" key="1">
              {info.versionHistory.map((vh) => (
                <VHScreenCard versionHistory={vh} />
              ))}
            </Panel>
          </Tags.CollapseContainer>
        )}
      </Tags.CardContainer>
      <OptionsMenu showOptions={showOptions} />
    </Tags.FlexContainer>
  );
}
