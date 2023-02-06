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

export interface TxtProp {
  color?: string
}

export const Txt = styled.div`
  color: ${(props: TxtProp) => (props.color ? props.color : '#16023E')};
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

  &.markeditable {
    cursor: text;
  }

  &.markeditable:hover {
    box-shadow: 0 0 0 1px black;
    background: #D0D0FF;
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
  width: 230px;
  position: fixed;
  left: 0;
  top: 0;
`;

export const MainCon = styled.div`
  height: 100%;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  margin-left: 230px;
`;

export const HeaderCon = styled.div`
  width: 100%;
  /* height: 75px; */
  border-bottom: 1px solid #E0E0E0;
`;

export const PreviewAndActionCon = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  box-shadow: 0 0 3px 1px #ddd;
  background: #fff;
  border-radius: 20px;
`;

export const EmbedCon = styled.div`
  width: 77%;
  background: #fcfcfc;
  border-radius: 20px;
  padding: 1rem;
`;

export const EditPanelCon = styled.div`
  height: 100%;
  width: 23%;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-left: 1px solid #ddd;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
`;

export const PopoverMenuItem = styled.div`
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  border-radius: 8px;
  &:hover {
    background: #eaeaea;
  }
`;
