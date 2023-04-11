import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { Auth0Provider } from '@auth0/auth0-react';
import { ThemeProvider } from 'styled-components';
import AntDesignThemeConfigProvider from 'antd/lib/config-provider';
import App from './container/app';
import reportWebVitals from './reportWebVitals';
import config from './store-config';
import packageJSON from '../package.json';
import Auth0Config from './component/auth/auth0-config.json';

const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

const theme = {
  colors: {
    component: {
      primary: '#7567ff',
    },
    dark: {
      idle: {
        background: '#160245',
        color: '#d0d0ff',
      },
      selection: {
        background: '#7567ff',
        color: '#fff',
      },
    },
    light: {
      selection: {
        background: '#160245',
      },
    },
    link: {
      color: '#7567ff',
    },
  },
  typography: {
    size: {
      heading: '1.25rem',
      heading3: '1.1rem',
    },
  },
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

console.log(`Version: ${packageJSON.version}`);

root.render(
  <Auth0Provider
    domain={Auth0Config.domain}
    clientId={Auth0Config.clientId}
    useRefreshTokens
    cacheLocation="localstorage"
    authorizationParams={{
      audience: Auth0Config.audience,
      redirect_uri: `${APP_CLIENT_ENDPOINT}/cb/auth`,
      scope: Auth0Config.scope,
    }}
  >
    <Provider store={config}>
      <ThemeProvider theme={theme}>
        <AntDesignThemeConfigProvider theme={{
          token: {
            colorPrimary: theme.colors.component.primary,
            colorBorder: theme.colors.component.primary,
            colorLink: theme.colors.component.primary,
            colorLinkHover: theme.colors.dark.idle.background,
            fontSize: 16,
          }
        }}
        >
          <App />
        </AntDesignThemeConfigProvider>
      </ThemeProvider>
    </Provider>
  </Auth0Provider>
);

type FableTheme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends FableTheme {}
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
