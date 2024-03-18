/* eslint-disable no-mixed-operators */
import styled from 'styled-components';
import { Tabs } from 'antd/lib';

export const BtnGroup = styled.div`
  span {
    padding: 0.5rem 1rem;
    font-weight: 500;
    cursor: pointer;
  }

  span:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }
  span:last-child {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }

  span.sel {
    background: #7567FF;
    border: 1px solid #7567FF;
    color: white;
  }

  span.nasel {
    border: 1px solid #eaeaea;
  }
`;

export const ChartCon = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 2rem;
`;

export const KpiAndVisitorCon = styled.div`
  display: flex;
  margin: 10%;
  margin-top: 1rem;
  margin-bottom: 1rem;
  gap: 1.5rem;
  align-items: stretch;
`;

export const FunnelCon = styled.div`
  margin-top: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  .ant-tabs-tab {
    padding: 5px 8px;   
    border: none !important;
    background: transparent !important;
    border-radius: 0px !important;
    font-size: 0.9rem !important;
    font-weight: 500 !important;
  }

  .ant-tabs-tab.ant-tabs-tab-active  {
    &:after {
      z-index: -1 !important;
      width: 100% !important;
      content: " " !important;
      background: lightgray !important;
      position: absolute !important;
      left: 0px !important;
      top: 0 !important;
      height: 100% !important;
      border-radius: 8px !important;
    }
  }

  & .ant-tabs .ant-tabs-tab-btn .ant-tabs-tab-icon:not(:last-child) {
    margin-inline-end: 6px !important;
  }

  .ant-tabs-content-holder {
    border-left: none !important;
  }

  .ant-tabs-tab-btn[aria-selected=true] {
    color: #160245 !important;
  }

  .ant-tabs-tab:hover {
    color: #160245 !important;
  }

  .ant-tabs-ink-bar {
    background: none !important;
  }
`;

export const KPIHead = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  .label {
    font-size: 1.25rem;
    opacity: 0.75;
  }

  .val {
    font-size: 2rem;
    margin-left: 0.5rem;
    font-weight: 500;
  }
`;

export const KPICon = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background: radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%);
  border-radius: 16px;
  position: relative;
  padding: 1.5rem 0;
  gap: 2rem;

  .loader {
    position: absolute;
    background: #eeeeeecf;
    height: 100%;
    width: 100%;
    transform: translateY(-1.5rem);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
    font-size: 2rem;
    border-radius: 16px;
  }

  .helpcn {
    position: absolute;
    right: 0;
    top: 0;
  }
`;

export const FunnelSelectOverlay = styled.div`
  background-color: #fafafa8f;
  position: absolute;
  cursor: pointer;
  border-radius: 2px;
`;

export const FunnelSelectData = styled.div`
  width: 20%;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  padding: 0rem 0.5rem 1rem 1rem;
  align-items: center;
  justify-content: space-between;

  .con {
    width: calc(100% - 3rem);
  }

  a {
    color: #747474;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .x-sm {
    font-size: x-small;
  }

  .sm {
    font-size: small;
  }

  .conv {
    font-size: 1.15rem;
  }

  .dist-chart {
    position: relative;
    height: 145px;
    padding: 0px 2px 0;
    display: flex;
    flex-direction: column;
    justify-content: end;
  }

  .con {
    padding: 0px 8px;
    overflow: auto;

    .ann-txt {
      font-size: 0.85rem;
      line-height: 0.95rem;
      padding-top: 8px;
    }

    .sess {
      font-size: 1.5rem;
    }
  }
`;

export const SvgCon = styled.div`
  position: relative;

  .w-adj-btn {
    position: absolute;
    top: -86px;
    right: 18px;

    button  {
    }
  } 
`;

export const UserDataCon = styled.div`
  display: grid;
  grid-template-columns: 1fr 3fr;
  grid-gap: 10px;
`;

export const UserDataMailCon = styled.div`
  height: fit-content;
  padding: 8px;
  padding-left: 20px;
  cursor: pointer;
  border-radius: 5px;
  border-bottom: 1px solid #ddd;

  &:hover{
    background-color: color-mix(in srgb, #b0a6c9 10%, white);
  }

  &.active{
    background-color: color-mix(in srgb, #b0a6c9 20%, white);
    border-bottom: none;
  }
`;

export const UserDataTxt = styled.div`
  font-size: 1rem;
  color: #160245;

  &.subtext{
    font-weight: 400;
  }  

  &.active{
    color: #160245;
    font-weight: 600;
  }

  &.title{
    padding-left: 20px;
  }

  &.anntext{
    font-weight: 400;
    line-height: 1.15;
    margin-right: 1.5rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* number of lines to show */
            line-clamp: 2; 
    -webkit-box-orient: vertical;
    color: #616161;
  }
`;

export const UserDataTimeline = styled.div`
  background: radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%);
  border-radius: 5px;
  padding: 10px 0 10px 20px;
`;

export const UserMetaInf = styled.div`
  flex: 0 2 240px;
  border-radius: 16px;
  background: radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%);
  height: fit-content;
  padding: 16px;

  & > p  {
    line-height: 1rem;
    font-size: 0.85rem;

    &:not(:last-child) {
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #d3dfe4;
    }

    & > span:nth-child(1) {
      font-weight: 500;
      margin-bottom: 6px;
    }

    & > span {
      display: block;
    }
  }
`;

export const LoaderCon = styled.div`
  position: absolute;
  background: #eeeeeecf;
  height: 100%;
  width: 100%;
  transform: translateY(-1.5rem);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
  font-size: 2rem;
  border-radius: 16px;
`;

export const TimelineCon = styled.div`
  a {
    color: #160245;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  .ant-timeline-item {
    padding-bottom: 8px !important;

    .ant-timeline-item-head {
      background-color: #bdbdbd !important;
      border-color: #bdbdbd !important;
      color: #bdbdbd !important;
    }

    .ant-timeline-item-label {
      line-height: 1rem;
      font-size: 0.85rem;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      direction: rtl;
      text-align: right;
    }
  }
`;

export const AnnTimeSpent = styled.span<{val: number, maxVal: number, hueRotation: number}>`
  -webkit-filter: hue-rotate(240deg) brightness(100%);
  /* filter: hue-rotate(240deg) brightness(100%); */
  font-size: 12px;
  color: #616161;
  padding: 2px 2px 2px 2px;
  /* -webkit-transition: filter 0.3s ease-out;
  transition: filter 0.3s ease-out;  */
  position: relative;
  font-size: 11px;
  font-weight: 500;
  font-family: "IBM Plex Mono", monospace;

  &:hover {
    cursor: pointer;
    filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(90%)`};
  }

  &:after {
    position: absolute;
    content: '';
    left: 0;
    bottom: -4px;
    width: ${props => `calc(10px + ${Math.round((props.val - 1) / (props.maxVal - 1) * 100)}px)`};
    background: #b0a6c9;
    filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(100%)`};
    height: 8px;
    border-radius: 2px;
  }
`;

export const AnalyticsTabs = styled(Tabs)`
  .ant-tabs-tab {
    padding-bottom: 5px;

    &:hover{
      color: #160245;
    }
  }

  .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #160245;
  }

  .ant-tabs-ink-bar {
    background: #160245;
  }
`;

export const LinkTxt = styled.span`
  font-size: 0.85rem;
  line-height: 0.95rem;
  padding-top: 8px;
  margin-right: 30px;
  color: #747474;
`;

export const SessionsInfoCon = styled.div`
  display: flex;
  float: right;
  gap: 20px;
  margin: 0 10px;
`;

export const SessionInfo = styled.div`
  color: #858585;
  font-size: 14px;
`;

export const Colored = styled.span<{hueRotation: number}>`
  background-color: #b0a6c9;
  color: white;
  border-radius: 4px;
  padding: 2px 5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: break-word;
  filter: ${props => `hue-rotate(${props.hueRotation}deg) brightness(85%) contrast(150%)`};
`;

export const TimelineLabelTooltip = styled.div`
  font-size: 0.8rem;
  line-height: 1.05rem;

  div {
    margin: 0.5rem 0;
  }

  .hlpr {
    opacity: 0.75;
  }
`;

export const TabsWithVisibilityCtrl = styled(Tabs)<{hidden?: boolean}>`
  .ant-tabs-nav {
    visibility: ${props => (props.hidden ? 'hidden' : 'visible')};
  }
`;

export const ActivityInfo = styled.span`
  font-weight: 500;
  font-family: "IBM Plex Mono", monospace;
`;
