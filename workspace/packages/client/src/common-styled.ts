import styled from 'styled-components';

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

export const Txt = styled.div`
  color: #16023E;
  &.head {
    font-size: ${(props) => props.theme.typography.size.heading};
    font-weight: bold;
  }

  &.editable {
    cursor: text;
  }

    &.editable:hover {
      box-shadow: 0 0 0 1px blue;
    }

  &.subhead {
    opacity: 0.65;
    line-height: 1.1rem;
    margin-top: 0.25rem;
    white-space: pre-line;
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

  &.title2 {
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

  &.oneline {
    display: inline-block;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &.emph {
    font-weight: bold;
  }

  span.kb-key {
    background: lightgray;
    color: #000;
    padding: 0 4px;
    border-radius: 4px;
    font-style: italic;
  }
`;

export const BodyCon = styled.div`
  overflow-y: hidden;
  padding: 0.25rem 2rem;
  display: flex;
  flex-direction: column;

  &.centered {
    justify-content: center;
    align-items: center;
  }
`;

export const SidePanelCon = styled.div`
  height: 100%;
  /* width: 30%; */
  max-width: 285px;
  min-width: 230px;
`;

export const MainCon = styled.div`
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

export const HeaderCon = styled.div`
  width: 100%;
  height: 75px;
`;
