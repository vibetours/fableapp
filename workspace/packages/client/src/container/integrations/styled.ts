import styled from 'styled-components';

export const IntegrationCardCon = styled.div`
  padding: 1rem;
  margin: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 60%;

  .err-msg {
    margin-bottom: 2rem;
    border-left: 4px solid #ff7450;
    padding-left: 1rem;

    h3 {
      margin: 0.5rem 0;
    }
    p {
      margin: 0;
      margin-block-start: 0;
      margin-block-end: 0;

      &:last-child {
        margin-bottom: 0.5rem;
      }
    }
  }

  a {
    color: black;
    text-decoration: underline dotted;
    font-style: italic;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const WebhookConfCon = styled.div`
  padding: 1.5rem;

  .header-con {
    display: flex;
    flex-direction: row;
    gap: 0.75rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e4e8eb;

    img {
      height: 48px;
    }
  }

    h3 {
      margin: 0;
    }
    p {
      margin: 0;
      margin-block-start: 0;
      margin-block-end: 0;
      color: #73738c;
    }

    .body-con {
      margin-top: 1rem;
      padding-top: 1rem;
    }
`;

export const CobaltConfigWrapper = styled.div`
  button {
    background-color: #7567FF;
  }
`;
