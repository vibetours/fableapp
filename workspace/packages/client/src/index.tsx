import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { ConfigProvider as AntDesignThemeConfigProvider } from 'antd';
import { init as sentryInit } from '@fable/common/dist/sentry';
import App from './container/app';
import reportWebVitals from './reportWebVitals';
import config from './store-config';
import packageJSON from '../package.json';
import { LOCAL_STORE_TIMELINE_ORDER_KEY } from './utils';

export const APP_CLIENT_ENDPOINT = process.env.REACT_APP_CLIENT_ENDPOINT as string;

function addReditusTrackingScript(): void {
  const script = document.createElement('script');
  script.innerHTML = '(function (w, d, s, p, t) { w.gr = w.gr || function () { w.gr.q = w.gr.q || []; w.gr.q.push(arguments); }; p = d.getElementsByTagName(s)[0]; t = d.createElement(s); t.async = true; t.src = "https://app.getreditus.com/gr.js?_ce=90"; p.parentNode.insertBefore(t, p); })(window, document, "script"); gr("track", "pageview");';
  document.head.appendChild(script);
}

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

  if (window.location.pathname.includes('/p/')) {
    sentryInit('client-preview', packageJSON.version);
  } else {
    sentryInit('client', packageJSON.version);
    addChargebeeScript();
    addReditusTrackingScript();
    import('@fable/common/dist/amplitude').then((res) => {
      res.initAmplitude();
    }).catch((error) => {
      console.log("Couldn't load Amplitude Script ", error);
    });

    import('./user-guides').then((res) => {
      res.removeOldGuides();
      res.upsertAllUserGuides();
    }).catch((error) => {
      console.log("Couldn't load UserGuide Script ", error);
    });
  }
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
  export interface DefaultTheme extends FableTheme { }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
