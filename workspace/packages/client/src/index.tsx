import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { ConfigProvider as AntDesignThemeConfigProvider } from 'antd';
import { init as sentryInit } from '@fable/common/dist/sentry';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import App from './container/app';
import reportWebVitals from './reportWebVitals';
import config from './store-config';
import packageJSON from '../package.json';
import { LOCAL_STORE_TIMELINE_ORDER_KEY } from './utils';
import Player from './container/player';
import PreviewForCta from './container/preview-for-cta';
import RedirectFromP from './container/redirect-from-p';
import { IFRAME_BASE_URL, LIVE_BASE_URL } from './constants';

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

  if (window.location.pathname.includes('/embed/')
    || window.location.pathname.includes('/live/')
    || window.location.pathname.includes('/p/')) {
    sentryInit('client-preview', packageJSON.version);
  } else {
    sentryInit('client', packageJSON.version);
    addChargebeeScript();
    addReditusTrackingScript();
    import('@fable/common/dist/amplitude').then((res) => {
      res.initProductAnalytics();
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
        background: '#160245',
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

const urlSearchParams = new URLSearchParams(window.location.search);
const staging = !!urlSearchParams.get('staging');
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/demos" />
  },
  { path: '/onboarding',
    async lazy() {
      const Onboarding = await import('./container/onboarding').then(module => module.default);
      return { Component: Onboarding };
    },
    children: [
      {
        path: 'extension-installed',
        async lazy() {
          const PinExt = await import('./component/onboarding/pages/pin-ext').then(module => module.default);
          return { Component: () => <PinExt title="Onboarding - Extension installed | Fable" /> };
        }
      },
      {
        path: 'create-interactive-demos',
        async lazy() {
          const ToursPage = await import('./component/onboarding/pages/tours').then(module => module.default);
          return { Component: () => <ToursPage title="Onboarding - Create stunning interactive demos | Fable" /> };
        }
      },
      {
        path: 'go-to-app',
        async lazy() {
          const ProductTours = await import('./component/onboarding/pages/product-tours')
            .then(module => module.default);
          return { Component: () => <ProductTours title="Onboarding - Go to the app | Fable" /> };
        }
      }
    ]
  },
  {
    path: '/aboutblank',
    element: <div />
  },
  {
    path: '/tours',
    element: <Navigate to="/demos" />
  },
  {
    path: 'form/:formId',
    async lazy() {
      const Form = await import('./container/form').then(module => module.default);
      return { Component: Form };
    },
  },
  {
    path: 'embed/tour/:tourId',
    element: <Player staging={staging} title="Fable" />
  },
  {
    path: 'embed/tour/:tourId/:screenRid/:annotationId',
    element: <Player staging={staging} title="Fable" />
  },
  {
    path: 'embed/demo/:tourId',
    element: <Player staging={staging} title="Fable" />
  },
  {
    path: 'embed/demo/:tourId/:screenRid/:annotationId',
    element: <Player staging={staging} title="Fable" />
  },
  {
    path: 'p/tour/:tourId',
    element: <RedirectFromP />
  },
  {
    path: 'p/tour/:tourId/:screenRid/:annotationId',
    element: <RedirectFromP />
  },
  {
    path: 'p/demo/:tourId',
    element: <RedirectFromP />
  },
  {
    path: 'p/demo/:tourId/:screenRid/:annotationId',
    element: <RedirectFromP />
  },
  {
    path: '/live/demo/:tourId',
    element: <PreviewForCta title="Fable" />
  },
  {
    path: 'preptour',
    async lazy() {
      const PrepTour = await import('./container/create-tour/prep-tour').then(module => module.default);
      return { Component: () => <PrepTour title="Creating demo | Fable" /> };
    },
  },
  {
    path: 'invite/:id',
    async lazy() {
      const Invite = await import('./container/invite').then(module => module.default);
      return { Component: () => <Invite /> };
    },
  },
  {
    path: 'aslp',
    async lazy() {
      const AppSumoLandingPage = await import('./container/appsumo-landing-page').then(module => module.default);
      return { Component: () => <AppSumoLandingPage title="Fable <> AppSumo" /> };
    }
  },
  {
    path: '/',
    async lazy() {
      const ProtectedRoutes = await import('./container/protected-routes').then(module => module.default);
      return { Component: ProtectedRoutes };
    },
    children: [
      {
        path: 'integrations',
        async lazy() {
          const Integrations = await import('./container/integrations').then(module => module.default);
          return { Component: () => <Integrations title="Integrations | Fable" /> };
        },
      },
      {
        path: 'settings',
        async lazy() {
          const Settings = await import('./container/settings').then(module => module.default);
          return { Component: () => <Settings title="Settings | Fable" /> };
        },
      },
      {
        path: 'healthcheck',
        async lazy() {
          const HealthCheck = await import('./container/healthcheck').then(module => module.default);
          return { Component: HealthCheck };
        },
      },
      {
        path: 'cb/auth',
        async lazy() {
          const AuthCB = await import('./container/auth-cb').then(module => module.default);
          return { Component: AuthCB };
        },
      },
      {
        path: 'user-details',
        async lazy() {
          const IAMDetails = await import('./container/org/iam-details').then(module => module.default);
          return { Component: () => <IAMDetails title="User details | Fable" /> };
        },
      },
      {
        path: 'organization-details',
        async lazy() {
          const NewOrgCreation = await import('./container/org/new-org-creation').then(module => module.default);
          return { Component: () => <NewOrgCreation title="Organization details | Fable" /> };
        },
      },
      {
        path: 'organization-join',
        async lazy() {
          const DefaultOrgAssignment = await import('./container/org/default-org-assignment').then(module => module.default);
          return { Component: () => <DefaultOrgAssignment title="Organization available | Fable" /> };
        }
      },
      {
        path: 'demos',
        async lazy() {
          const Tours = await import('./container/tours').then(module => module.default);
          return { Component: () => <Tours title="Interactive demos | Fable" /> };
        },
      },
      {
        path: 'users',
        async lazy() {
          const UserManagement = await import('./container/user-management').then(module => module.default);
          return { Component: () => <UserManagement title="User Management | Fable" /> };
        },
      },
      {
        path: 'billing',
        async lazy() {
          const Billing = await import('./container/billing').then(module => module.default);
          return { Component: () => <Billing title="Billing & Subscription | Fable" /> };
        }
      },
      {
        path: 'tour/:tourId',
        async lazy() {
          const TourEditor = await import('./container/tour-editor').then(module => module.default);
          return { Component: () => <TourEditor title="Demo editor | Fable" /> };
        },

        children: [
          {
            path: ':screenId',
            element: <Outlet />,
            children: [
              {
                path: ':annotationId',
                element: <Outlet />,
              }
            ]
          },
        ]
      },
      {
        path: 'demo/:tourId',
        async lazy() {
          const TourEditor2 = (await import('./container/tour-editor')).default;
          return { Component: () => <TourEditor2 title="Demo editor | Fable" /> };
        },
        children: [
          {
            path: ':screenId',
            element: <Outlet />,
            children: [
              {
                path: ':annotationId',
                element: <Outlet />,
              }
            ]
          },
        ]
      },
      {
        path: 'a/demo/:tourId',
        async lazy() {
          const Analytics = await import('./container/analytics').then(module => module.default);
          return { Component: () => <Analytics /> };
        }
      },
      {
        path: 'a/demo/:tourId/:activeKey',
        async lazy() {
          const Analytics = await import('./container/analytics').then(module => module.default);
          return { Component: () => <Analytics /> };
        }
      },
      {
        path: 'create-interactive-demo',
        async lazy() {
          const CreateTour = await import('./container/create-tour').then(module => module.default);
          return { Component: () => <CreateTour title="Create interactive demo | Fable" /> };
        },
      },
      {
        path: 'login',
        async lazy() {
          const Login = await import('./component/auth/login').then(module => module.default);
          return { Component: () => <Login title="Login | Fable" /> };
        },
      },
      {
        path: 'logout',
        async lazy() {
          const Logout = await import('./component/auth/logout').then(module => module.default);
          return { Component: () => <Logout title="Logout | Fable" /> };
        },
      },
      {
        path: 'preview/demo/:tourId',
        async lazy() {
          const PublishPreview = await import('./container/publish-preview').then(module => module.default);
          return { Component: () => <PublishPreview title="Preview | Fable" /> };
        },
      },
      {
        path: 'preview/tour/:tourId',
        async lazy() {
          const PublishPreview = await import('./container/publish-preview').then(module => module.default);
          return { Component: () => <PublishPreview title="Preview | Fable" /> };
        },
      }
    ]
  }
]);

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
        <App router={router} />
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
