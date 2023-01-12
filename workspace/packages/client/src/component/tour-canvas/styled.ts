import styled from "styled-components";
import { Mode } from "./types";

type SVGProps = {
  mode: Mode;
};

export const SVGCanvas = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  cursor: ${(p: SVGProps) => (p.mode === Mode.SelectMode ? "default" : "move")};

  image {
    cursor: pointer;
  }

  .imageHover:hover {
    outline: 2px solid lightgray;
  }

  line {
    cursor: ${(p: SVGProps) => (p.mode === Mode.SelectMode ? "pointer" : "default")};
  }
`;
