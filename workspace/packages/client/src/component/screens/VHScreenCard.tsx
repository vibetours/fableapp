import React from "react";
import * as Tags from "./styled";
import { VersionHistory } from "../../container/project_screens_container";

interface Props {
  versionHistory: VersionHistory;
}

export default function VHScreenCard({ versionHistory }: Props): JSX.Element {
  return (
    <Tags.VHScreenContainer>
      <Tags.VHThumbnail />
      <Tags.InfoContainer>
        <Tags.ScreenTitle>{versionHistory.title}</Tags.ScreenTitle>
        <div></div>
        <Tags.ScreenInfo alignSelf="center">
          Created from {versionHistory.createdFrom}
        </Tags.ScreenInfo>
        <Tags.RightAlignContainer>
          <Tags.ScreenInfo>
            Updated by {versionHistory.updatedBy} on 3rd Sep
          </Tags.ScreenInfo>
          <Tags.CreatedByAvatar
            className="ant-avatar ant-avatar-circle ant-avatar-img"
            alt="avatar"
            src="https://joeschmoe.io/api/v1/random"
          />
        </Tags.RightAlignContainer>
      </Tags.InfoContainer>
    </Tags.VHScreenContainer>
  );
}
