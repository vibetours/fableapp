import styled from "styled-components";

export const ColCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
`;

export const RowCon = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
`;

export const HeaderCon = styled.div`
  width: 100%;
  height: 75px;
`;

export const Txt = styled.div`
  &.head {
    font-size: ${(props) => props.theme.typography.size.heading};
    font-weight: bold;
  }

  &.subhead {
    opacity: 0.65;
    line-height: 1.05rem;
    margin-top: 0.25rem;
  }

  &.subsubhead {
    opacity: 0.65;
    line-height: 0.85rem;
    font-size: 0.85rem;
  }

  &.title {
    font-size: ${(props) => props.theme.typography.size.heading3};
    font-weight: 600;
  }

  &.link {
    &:hover {
      text-decoration: underline;
      cursor: pointer;
    }
  }

  &.faded {
    opacity: 0.65;
  }
`;

export const BodyCon = styled.div`
  width: 100%;
  overflow-y: auto;
  padding: 0.25rem 2rem;
  display: flex;
  flex-direction: column;

  &.centered {
    justify-content: center;
    align-items: center;
  }
`;
