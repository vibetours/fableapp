import styled from 'styled-components';

export const VarEditorCon = styled.div<{showAsPopup: boolean, showEditor: boolean}>`
  position: relative;
  top: 0;
  height: 100%;

  .heading {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .heading-h4 {
      padding: 0;
      margin: 0;
    }

    .close-btn {
      cursor: pointer;
      background-color: none;
      background: none;
      outline: none;
      border: none;
      font-size: 1.2rem;
      padding: 0.25rem 0.5rem;

      &:hover {
        background-color: rgba(0,0,0,0.1);
        border-radius: 100%;
        transition: background-color 200ms;
      }
    }
  }
  .popup-btn {
    display: ${props => (props.showAsPopup ? 'block' : 'none')};
    border-radius: 0.25rem;
    font-size: 1.5rem;
    padding: 0.375rem 0.5rem;
    background-color: white;
    color: black;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;

  }

  .loading-state {
    text-align: center;
  }
  .pers-var-editor {
    display: ${props => (props.showEditor ? 'flex' : 'none')};
    flex-direction: column;
    gap: 1.5rem;
    position: ${props => (props.showAsPopup ? 'absolute' : 'static')};
    width: ${props => (props.showAsPopup ? '360px' : '300px')};
    background-color: white;
    top: 48px;
    right: 0px;
    padding: 1.5rem;
    box-shadow: ${props => (props.showAsPopup ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : '')};
    border-radius: 1rem;
    margin-top: ${props => (props.showAsPopup ? '0rem' : '1.5rem')};
    box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;

    code {
      background-color: rgba(0,0,0,0.1);
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
    }
    .demo-url {
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 1rem;
      width: 100%;

      .demo-url-title {
        font-size: 1rem;
      }

      code {
        display: flex;
        overflow-x: auto;
        width: 70%;
        
        .url-code {
          font-family: "IBM Plex Mono", monospace !important;
          font-weight: 500;
        }
      }
    }

    .typ-reg {
      code {
        font-size: 0.8rem;
      }
    }
    .typ-h1 {
      font-weight: 600;
    }
    .per-var-input-con {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      max-height: 180px;
      overflow-y: auto;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      .pers-var-input {
        width: ${props => (props.showAsPopup ? '90%' : '100%')};
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        
        .pervar-label {
          display: flex;
          align-items: center;
          gap: 1rem;

          code {
            font-size: 0.8rem;
          }
        }
      }
    }

    .errors { 
      padding: 0rem 1rem 0 1rem;
      height: 80px;
      overflow-y: auto;

      .error {
        margin-bottom: 0.25rem;
        font-size: 0.8rem;
      }

      &.error:first-child {
        border-top: 2px solid rgba(0,0,0,0.2);
      }
    }

    .bottom-btns {
      display: flex;
      align-items: center;
      justify-content: right;
      gap: 1rem;
    }
  }
`;
