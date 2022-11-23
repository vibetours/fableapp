import React from "react";
import DeleteIcon from "../../assets/screens/DeleteIcon.svg";
import DuplicateIcon from "../../assets/screens/DuplicateIcon.svg";
import * as Tags from "./styled";

interface Props {
  showOptions: boolean;
}

export default function OptionsMenu({ showOptions }: Props): JSX.Element {
  return (
    <Tags.OptionsMenuContainer showOptions={showOptions}>
      <Tags.MenuItem>
        <img src={DuplicateIcon} alt={"duplicate"} />
        <span>Duplicate</span>
      </Tags.MenuItem>
      <Tags.MenuItem>
        <img src={DeleteIcon} alt={"delete"} />
        <span>Delete</span>
      </Tags.MenuItem>
    </Tags.OptionsMenuContainer>
  );
}
