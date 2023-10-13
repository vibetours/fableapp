import React from 'react';
import styled from 'styled-components';

const Con = styled.div`
  position: fixed;

  .help-bubble .help-bubble-outer-dot {
    margin: 1px;
    display: block;
    text-align: center;
    opacity: 1;
    background-color: rgba(117,103,255,0.5);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    animation: help-bubble-pulse 1.5s linear infinite;
  }

  .help-bubble {
    display: block;
    position: absolute;
    z-index: 2;
    cursor: pointer;
    left: 1rem;
    top: 4px;
  }

  .help-bubble::after {
    content: "";
    background-color: rgba(117,103,255,1);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    position: absolute;
    display: block;
    top: 1px;
    left: 1px;
  }

  .help-bubble .help-bubble-inner-dot {
    background-position: absolute;
    display: block;
    text-align: center;
    opacity: 1;
    background-color: rgba(117,103,255,0.5);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    -webkit-animation: help-bubble-pulse 1.5s linear infinite;
    -moz-animation: help-bubble-pulse 1.5s linear infinite;
    -o-animation: help-bubble-pulse 1.5s linear infinite;
    animation: help-bubble-pulse 1.5s linear infinite;
  }

  .help-bubble .help-bubble-inner-dot:after {
    content: "";
    background-position: absolute;
    display: block;
    text-align: center;
    opacity: 1;
    background-color: rgba(117,103,255,0.5);
    width: 12px;
    height: 12px;
    border-radius: 50%;
    -webkit-animation: help-bubble-pulse 1.5s linear infinite;
    -moz-animation: help-bubble-pulse 1.5s linear infinite;
    -o-animation: help-bubble-pulse 1.5s linear infinite;
    animation: help-bubble-pulse 1.5s linear infinite;
  }

  @keyframes help-bubble-pulse{
    0% {
      transform: scale(1);
      opacity: .75;
    }
    25% {
      transform:scale(1);
      opacity:.75;
    }
    100% {
      transform:scale(2.5);
      opacity:0
    }
  }
`;

export default function FocusBubble(): JSX.Element {
  return (
    <Con>
      <a className="help-bubble">
        <span className="help-bubble-outer-dot">
          <span className="help-bubble-inner-dot" />
        </span>
      </a>
    </Con>
  );
}
