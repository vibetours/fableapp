import styled, { keyframes } from 'styled-components';
import Modal from 'antd/lib/modal';
import Tabs from 'antd/lib/tabs';
import Button from 'antd/lib/button';

export const ScreenPickerContainer = styled(Modal)`    
    .ant-modal-content {
      height: 90vh;
      top: -50px;
    }

    .ant-modal-body{
      height: 100%;
    }

    .ant-modal-content .anticon {
      color: #000;
    }
  `;

export const ScreensContainer = styled.div`
  
    h2 {
      font-style: normal;
      font-weight: 700;
      font-size: 1.2rem;
      line-height: 20px;
      margin-bottom: 1rem;
    }
  `;

export const ScreenPicker = styled.div`
    display: flex;
    flex-direction: row;
    gap: 1rem;
    padding: 0.25rem;
    position: relative;
    flex-wrap: wrap;
    scrollbar-color: #7567FF #E5E7EB;
    scrollbar-width: thin;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar-track {
      padding: 2px 0;
      background-color: #e5e7eb;
      border-radius: 10px;
      border: 1px solid #F3F4F6;
    }
  
    &::-webkit-scrollbar {
      margin: 4px 0;
      height: 4px;
      width: 6px;
    }
  
    &::-webkit-scrollbar-thumb {
      border-radius: 10px;
      background-color: #646e82;
    }
  `;

export const ScreenPickerTabs = styled(Tabs)`
      height: 100%;

      .ant-tabs-content {
        height: 100%;
      }

      .ant-tabs-tabpane {
        height: 100%;
      }
  `;

export const ScreenTab = styled.div`
      height: 100%;
      display: flex;
      flex-direction: column;
  `;

const bottomToTop = keyframes`
  from {
    transform: translateY(200%);
  }

  to {
    transform: translateY(0%);
  }
`;

export const Screen = styled.div`
    background: #FFFFFF;
    border: 1px solid #EFEFEF;
    border-radius: 10px;
    padding: 0.5rem;
    width: 214px;
    height: 198px;
    flex-basis: 17%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-radius: 4px;
    transition: box-shadow 0.2s ease-in-out;
    
    &:hover {
      box-shadow: 0px 4px 15px 0px rgba(0, 0, 0, 0.10);
      cursor: pointer;
    }

    animation: ${bottomToTop} 0.3s ease-in;
  
  `;

export const ScreenThumbnail = styled.img`
    height: 7rem;
    object-fit: cover;
  `;

export const ScreenContent = styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 0.75rem;
    flex-grow: 1;
    row-gap: 0.5rem;
    overflow: auto;
    justify-content: space-between;

    .card-title{
      font-size: 1rem;
      font-weight: 500;
      height: 1.5rem;
      overflow: hidden;
    }
  `;

export const ScreenLink = styled.div`
    display: flex;
    column-gap: 0.5rem;
    height: 1.3rem; 
    overflow: hidden;
  `;

export const ScreenTitleIconCon = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  `;

export const UploadImgCont = styled.div`
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      text-align: center;
      gap: 1rem;
  `;

export const PrimaryButton = styled.button`
      background: #7567FF;
      color: white;
      border-radius: 24px;
      font-size: 0.95rem;
      border: 1px solid #7567FF;
      display: block;
      width: 90%;
      margin: 1rem auto;
      padding: 0.75rem 0;
      cursor: pointer;
  
      &:disabled {
        opacity: 0.5;
      }
  `;

export const ErrorMsg = styled.div`
    color: red;
    margin-top: 0.5rem;
    text-align: center;
  `;

export const ModalContainer = styled.div`
      
  `;

export const ModalBorderTop = styled.div`
  
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height:5px;
      display: flex;
  
      div {
          width: 40%;
          border-radius: 12px;
          z-index: 2;
          height: 5px;
  
          &:nth-child(1) {
            background-color: #ff7450;
          }
  
          &:nth-child(2) {
            background-color: #fedf64;
          }
  
          &:nth-child(3) {
            background-color: #7567ff;
          }
  
          &:not(:first-child) {
          margin-left: -18px;
          }
      }
  `;

export const InputLabel = styled.div`
      font-weight: 700;
      font-size: 1rem;
      line-height: 21px;
      color: #16023E;
      margin-bottom: 0.25rem;
      display: inline-block;
  `;

export const InputContainer = styled.div`
      position: relative;
      
      input {
          background: #FFFFFF;
          border: 1px solid #7567FF;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          padding-left: 1rem;
          padding-block: 0.7rem;
          width: calc(100% - 1rem);
      }
  `;

export const PaginationButton = styled(Button)`
      width: 12.5rem;
      padding: 1.5rem 6.8rem;  
      background-color: #7566ff !important;
      align-self: center;
      margin-top: 0.5rem;
      border-radius: 1.5rem !important;
      display:flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      bottom: 60px;
      z-index: 10;
  `;

export const Blur = styled.div`
    position: absolute;
    bottom: 0;
    width: 97%;
    height: 60px;
    position: absolute;
    filter: blur(1px);
    background-color: rgba(255,255,255, 0.45);
  `;

export const FlexColCon = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
`;

export const ScreenPickerCon = styled.div`
  position: fixed;
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  /* padding-top: 6.125rem; */
  align-items: center;
  background-color: #fff;
  z-index: 2000;
  top: 0;
  left: 0;
`;

export const CloseIcon = styled.img`
  position: absolute;
  height: 2rem;
  width: 2rem;
  top: 40px;
  right: 40px;
  cursor: pointer;
`;

export const FableLogo = styled.img`
  position: absolute;
  width: 90px;
  top: 40px;
  left: 70px;
`;

export const PolkaDotGridBg = styled.div`
  position: absolute;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  background-color: #FFFFFF;
  opacity: 0.6;
  background-image: radial-gradient(#bfbfc0 1px, #FFFFFF 1px);
  background-size: 20px 20px;
`;

export const MsgCon = styled.div`
  margin-top: 6.125rem;

  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .heading {
    color: #222;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 1.25rem;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
  }

  .sub-heading {
    color: #16023E;
    text-align: center;
    font-family: IBM Plex Sans;
    font-size: 0.875rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1.625rem; /* 185.714% */
  }
`;

export const Heading = styled.div`
  color: #222;
  text-align: center;
  font-family: IBM Plex Sans;
  font-size: 1.25rem;
  font-style: normal;
  font-weight: 700;
  line-height: normal;
`;

export const SubHeading = styled.div`
  color: #16023E;
  text-align: center;
  font-family: IBM Plex Sans;
  font-size: 0.875rem;
  font-style: normal;
  font-weight: 400;
  line-height: 1.625rem; /* 185.714% */
`;

export const ScreenCardCon = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1rem;
  padding: 1rem;

  scrollbar-color: #7567FF #E5E7EB;
  scrollbar-width: thin;
  overflow-y: auto;
  overflow-x: hidden;

  &::-webkit-scrollbar-track {
    padding: 2px 0;
    background-color: #e5e7eb;
    border-radius: 10px;
    border: 1px solid #F3F4F6;
  }

  &::-webkit-scrollbar {
    margin: 4px 0;
    height: 4px;
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: #646e82;
  }
`;

export const LoadNextCon = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: auto;
`;
