import React from "react";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import * as Tags from "./styled";

export default function OptionsMenu(): JSX.Element {
  return (
    <Tags.OptionsMenuContainer>
      <Tags.MenuItem>
        <CopyOutlined />
        <span>Duplicate</span>
      </Tags.MenuItem>
      <Tags.MenuItem>
        <DeleteOutlined />
        <span>Delete</span>
      </Tags.MenuItem>
    </Tags.OptionsMenuContainer>
  );
}
