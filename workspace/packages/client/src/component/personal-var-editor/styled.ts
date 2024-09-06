import styled from 'styled-components';

export const VarEditorCon = styled.div<{showAsPopup: boolean, showEditor: boolean}>`
  position: relative;
  top: 0;
  height: 100%;
  .popup-btn {
    display: ${props => (props.showAsPopup ? 'block' : 'none')};
    border-radius: 0.25rem;
    font-size: 1.5rem;
    padding: 0.375rem 0.5rem;
    background-color: white;
    color: black;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
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
    padding: 1rem;
    box-shadow: ${props => (props.showAsPopup ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' : '')};
    border-radius: 0.5rem;
    margin-top: ${props => (props.showAsPopup ? '0rem' : '1.5rem')};
    code {
      background-color: rgba(0,0,0,0.1);
      padding: 0.125rem 0.5rem;
      border-radius: 0.125rem;
    }
    .demo-url {
      font-size: 0.75rem;
      justify-content: center;
      code {
        margin-left: 0.25rem;
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
      max-height: 360px;
      overflow-y: auto;

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
            border-radius: 0.25rem;
          }
        }
      }
    }

    .errors { 
      padding: 0rem 1rem 0 1rem;

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

      .btns {
        border-radius: 0.25rem;
      }
    }
  }
`;
