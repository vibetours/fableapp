# Fable

> Open-source platform for creating interactive product demos and walkthroughs

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Version](https://img.shields.io/badge/version-2.1.9-green.svg)](https://github.com/sharefable/app)

[Live Demo](https://sharefable.com) | [Documentation](https://github.com/sharefable)

---

## Tech Stack

**Frontend Framework:**
- React 18.2 with TypeScript 4.8
- Redux + Redux Thunk for state management
- React Router v6 for routing
- Styled Components 5.3 for CSS-in-JS styling

**UI & Components:**
- Ant Design 5.8 - Component library
- Lexical 0.12.2 - Rich text editor
- CodeMirror v6 - Code editor
- Framer Motion 10.3 - Animations
- Recharts 2.12 - Charts and visualizations

**Build Tools:**
- Create React App 5.0.1 (not ejected)
- Webpack 5 (for browser extension)
- TypeScript for type safety
- Yarn Workspaces for monorepo management

**Key Integrations:**
- Auth0 - Authentication
- Sentry - Error tracking & monitoring
- Amplitude & PostHog - Analytics
- Chargebee - Billing & subscriptions
- Anthropic SDK - AI-powered features

---

## Project Structure

This project is organized as a Yarn Workspace monorepo:

```
workspace/packages/
├── client/         Main React web application
│   ├── src/
│   │   ├── container/      Redux-connected container components
│   │   ├── component/      Presentational UI components
│   │   ├── action/         Redux actions and action creators
│   │   ├── reducer/        Redux reducers
│   │   ├── hooks/          Custom React hooks
│   │   ├── analytics/      Analytics utilities
│   │   ├── user-guides/    User onboarding flows
│   │   └── types.ts        Global TypeScript type definitions
│   └── package.json
│
├── common/         Shared libraries and type definitions
│   ├── src/               TypeScript source files
│   └── dist/              Compiled JavaScript outputs
│
├── ext-tour/       Browser extension for recording demos
│   └── Chrome extension with Webpack build
```

---

## Prerequisites

- **Node.js** - v16.x or higher recommended
- **Yarn** - Latest version with workspace support

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone git@github.com:sharefable/app.git
cd app
```

### 2. Install Dependencies

```bash
yarn install
```

This will install dependencies for all packages in the monorepo.

### 3. Configure Environment

Create or modify the environment configuration in `workspace/packages/env.json`:

```json
{
  "local": {
    "REACT_APP_API_ENDPOINT": "http://localhost:8080",
    "REACT_APP_JOB_ENDPOINT": "http://localhost:8081",
    "REACT_APP_CLIENT_ENDPOINT": "http://localhost:3000",
    "REACT_APP_DATA_CDN": "your-cdn-url",
    "REACT_APP_ENVIRONMENT": "local",
    "REACT_APP_AUTH0_DOMAIN": "your-auth0-domain",
    "REACT_APP_AUTH0_CLIENT_ID": "your-auth0-client-id",
    "REACT_APP_AUTH0_AUD": "backend",
    "DISABLE_ESLINT_PLUGIN": true
  }
}
```

**Note:** For database and backend setup, please check the [Fable API](https://github.com/sharefable) and Jobs repositories.

### 4. Set Up Auth0

1. Create an Auth0 account at [auth0.com](https://auth0.com)
2. Create a new application (Single Page Application)
3. Configure your callback URLs:
   - Allowed Callback URLs: `http://localhost:3000/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
4. Copy your Domain and Client ID to `env.json`

### 5. Start Development Server

```bash
cd workspace/packages/client
yarn start-local
```

The application will open at `http://localhost:3000`

---

## Development

**Script Naming Convention:**
- Scripts follow the pattern `yarn-{{prefix}}`
- `local` - Local development with local backend
- `dev` - Development environment with staging backend
- `staging` - Staging environment build
- `prod` - Production environment build

### Development Guidelines

Please follow these guidelines when contributing code:

1. **Fully Typed Systems**
   - Type everything with TypeScript as much as possible
   - Minimize usage of `any` type
   - Define proper interfaces and types

2. **Performance First**
   - Target 60fps across different systems (Windows/Linux/Mac)
   - Avoid unnecessary re-renders in React components
   - Be mindful of render function side effects

3. **Minimal Dependencies**
   - Don't add packages for trivial functionality
   - Consider copy-pasting small utilities instead of adding dependencies
   - Keep bundle size optimized

4. **Code Quality**
   - Use ESLint with Airbnb config
   - Follow the container/component pattern
   - Write clean, maintainable code

### Customizing Ant Design Theme

To override Ant Design CSS properties without ejecting Create React App:

```bash
yarn brand-asset-gen
```

This generates CSS overrides from Less files. [Read more about this approach](https://medium.com/@aksteps/customising-ant-design-antd-theme-without-using-react-eject-or-any-unreliable-libraries-782c53cbc03b).

---

## Architecture Overview

### State Management

**Redux Architecture:**
- Single Redux store with combined reducers
- Redux Thunk middleware for async operations
- Redux DevTools enabled in development
- Container components connect to Redux store
- Action creators handle API calls and side effects

### Routing Structure

Key application routes:

```
/                          → Dashboard (redirects to /demos)
/demos                     → Demo list and management
/tour/:tourId              → Demo editor
/embed/demo/:tourId        → Embedded demo player
/hub/:demoHubRid           → Demo hub editor
/analytics/demo/:tourId    → Analytics dashboard
/settings                  → User settings
/integrations              → Third-party integrations
```

Most routes use React lazy loading for code splitting and optimized bundle sizes.

---

## Configuration

### Environment Variables

The `env.json` file supports multiple environment profiles:

**Available Environments:**
- `local` - Local development
- `dev` - Development with staging backend
- `staging` - Staging environment
- `prod` - Production environment

**Key Environment Variables:**

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_ENDPOINT` | Backend API server URL |
| `REACT_APP_JOB_ENDPOINT` | Jobs service URL |
| `REACT_APP_CLIENT_ENDPOINT` | Frontend application URL |
| `REACT_APP_DATA_CDN` | CDN for demo assets |
| `REACT_APP_AUTH0_DOMAIN` | Auth0 tenant domain |
| `REACT_APP_AUTH0_CLIENT_ID` | Auth0 application client ID |
| `REACT_APP_ENVIRONMENT` | Current environment name |
| `REACT_APP_CHARGEBEE_SITE` | Chargebee site identifier |
| `REACT_APP_AMPLITUDE_KEY` | Amplitude analytics key (deprecated) |
| `REACT_APP_POSTHOG_KEY` | PostHog analytics key |
| `GENERATE_SOURCEMAP` | Enable sourcemap generation (staging/prod) |

### Third-Party Integration Setup

**Auth0:**
- Configure application in Auth0 dashboard
- Set callback URLs and CORS settings
- Add domain and client ID to `env.json`

**Sentry:**
- Configure in CI/CD workflow
- Sourcemaps uploaded automatically during deployment
- DSN configured in application code

**Analytics (Amplitude/PostHog):**
- Add API keys to `env.json`
- Events tracked via `analytics/` utilities

---

## Deployment

### Build Process

The project uses Create React App for building:

```bash
# Staging build
cd workspace/packages/client
yarn build-staging

# Production build
yarn build-prod
```

Builds are output to `workspace/packages/client/build/`

### CI/CD Pipeline

Automated deployment via **GitHub Actions:**

**Workflow Steps:**
1. **Lint & Quality Checks** - ESLint and code duplication detection
2. **Build Common Package** - TypeScript compilation
3. **Build Extension** - Webpack bundle for browser extension
4. **Build Client** - Create React App production build
5. **Upload Sourcemaps** - Send sourcemaps to Sentry for error tracking
6. **Clean Sourcemaps** - Remove sourcemaps from production bundle
7. **Deploy to AWS** - Upload to S3 and invalidate CloudFront cache

**Deployment Targets:**
- **Staging:** Deploys on push to `develop` branch
- **Production:** Deploys on push to `master` branch with manual approval

**Infrastructure:**
- AWS S3 for static file hosting
- AWS CloudFront for CDN distribution
- Sourcemaps stored in Sentry only (not public)

---

## Browser Extension

### Building the Extension

```bash
cd workspace/packages/ext-tour
yarn build
```

The extension is built using Webpack and outputs to `dist/`

### Installing for Development

1. Build the extension (see above)
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `workspace/packages/ext-tour/dist` directory

### Using the Extension

The browser extension allows you to:
- Record user interactions on any website
- Capture screenshots and video
- Create demo tours directly from browsing sessions
- Sync recordings with the Fable platform

**Extension ID** is configured per environment in `env.json` (`REACT_APP_EXTENSION_ID`)

---

## License

This project is licensed under the **Apache License 2.0**.

See [LICENSE](LICENSE) file for details.

Copyright © 2025 Fable. All rights reserved.

---

## Acknowledgments

For a complete list of dependencies and open-source libraries used in this project, please refer to:
- [`workspace/packages/client/package.json`](workspace/packages/client/package.json)
- [`workspace/packages/common/package.json`](workspace/packages/common/package.json)
- [`workspace/packages/ext-tour/package.json`](workspace/packages/ext-tour/package.json)

---

## Support

For questions, issues, or feature requests:

**[Open an issue on GitHub](https://github.com/sharefable/app/issues)**

---

## Additional Resources

- [Common Project Information](https://github.com/sharefable)
- [Yarn Workspaces Documentation](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
- [Create React App Documentation](https://create-react-app.dev/)
- [Redux Documentation](https://redux.js.org/)
- [Ant Design Documentation](https://ant.design/)
