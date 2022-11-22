import React from "react";
import * as Tags from "./styled";

export default function VHScreenCard(): JSX.Element {
  return (
    <Tags.VHScreenContainer>
      <Tags.VHThumbnail />
      <Tags.InfoContainer>
        <Tags.ScreenTitle>Home Screen</Tags.ScreenTitle>
        <div></div>
        <Tags.ScreenInfo alignSelf="center">
          Created from Signup Flow
        </Tags.ScreenInfo>
        <Tags.RightAlignContainer>
          <Tags.ScreenInfo>Updated by Akash on 3rd Sep</Tags.ScreenInfo>
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
