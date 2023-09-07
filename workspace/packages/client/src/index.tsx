import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import AntDesignThemeConfigProvider from 'antd/lib/config-provider';
import { init as sentryInit } from '@fable/common/dist/sentry';
import { initAmplitude } from '@fable/common/dist/amplitude';
import App from './container/app';
import reportWebVitals from './reportWebVitals';
import config from './store-config';
import packageJSON from '../package.json';
import { LOCAL_STORE_TIMELINE_ORDER_KEY } from './utils';
import { upsertAllUserGuides } from './user-guides';

export const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

function addChargebeeScript(): void {
  const script = document.createElement('script');
  script.setAttribute('src', 'https://js.chargebee.com/v2/chargebee.js');
  document.head.appendChild(script);
}

if (document.location.pathname !== '/aboutblank') {
  console.log(`Version: ${packageJSON.version}`);

  try {
    // Fails with https://stackoverflow.com/q/63195318 for incognito mode
    localStorage.removeItem(LOCAL_STORE_TIMELINE_ORDER_KEY);
  } catch (e) {
    console.log((e as Error).stack);
  }

  sentryInit('client', packageJSON.version);
  initAmplitude();
  upsertAllUserGuides();
  addChargebeeScript();
}

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

root.render(
  <Provider store={config}>
    <ThemeProvider theme={theme}>
      <AntDesignThemeConfigProvider theme={{
        token: {
          colorPrimary: theme.colors.component.primary,
          colorBorder: theme.colors.component.primary,
          colorLink: theme.colors.component.primary,
          colorLinkHover: theme.colors.dark.idle.background,
          fontSize: 14,
          borderRadius: 2
        }
      }}
      >
        <App />
      </AntDesignThemeConfigProvider>
    </ThemeProvider>
  </Provider>
);

type FableTheme = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends FableTheme {}
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
