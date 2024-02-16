import styled from 'styled-components';
import { Popover } from 'antd';

export const ConLogoImg = styled.img`
  height: 2.5rem;
`;

export const Con = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  background: ${(props) => props.theme.colors.dark.idle.background};
`;

export const LogoCon = styled.div`
  margin: 0.35rem 1.5rem;
  padding: 0.35rem 1.5rem;
  font-size: 1rem;
`;

export const RMenuCon = styled.div`
  margin: 0.25rem 1.5rem;
  padding: 0.25rem 1.5rem;
  display: flex;
`;

export const LMenuCon = styled.div`
  margin: 0rem 1.5rem;
  display: flex;
  align-items: center;

  &:hover {
    .show-on-hover {
      visibility: visible;
    }
  }

  .show-on-hover {
    visibility: hidden;
  }
`;

export const MenuItem = styled.div`
  margin: 0 0.25rem;
`;

export const CodeCon = styled.code`
  display: block;
  border: 1px solid lightgray;
  padding: 0.5rem;
  border-radius: 12px;
  position: relative;
`;

export const CanvasOptionsCon = styled.div`
  width: 180px;
`;

export const StyledPopover = styled(Popover)`
.ant-popover-inner {
    border-radius: 16px !important;
    border: 1px solid #EAEAEA !important;
    background: var(--White, #FFF) !important;
    box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.08) !important;
  }
`;

export const CanvasOption = styled.button`
  display: block;
  background-color: white;
  border: none;
  width: 100%;
  text-align: left;
  padding: 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
  color: #16023E;

  &:hover {
    background-color: #F8F8F8;
  }
`;
