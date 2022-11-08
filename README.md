# Fable

### [Common Project Information](https://github.com/sharefable)

## General

The project is setup as [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). Here is the app structure
- `workspace/packages/client` contains the frontend code for Fable app
- `workspace/packages/ext` contains the code for browser extension
- `workspace/packages/scripts` contains the code for common scripts that are served via cdn
- `workspace/packages/common` contains common code used across all the projects

Checkout all the `*/packages.json > scripts` to understand how dev / staging / prod builds are done.

## Guideline

Please follow the following guideline while writing code
- **Fully typed systems.** Try to type (Typescript) everything as much as possible. That also means, avoid using `any` as much as possible
- **Don't add unnecessary dependencies.** Don't add packages for trivial functionalities, you might want to copy paste from 3rd part packages code to fable repository if you want.
- **60fps.** Try to be as close to 60fps as possible across different systems (low powered windows / linux / mac).
- **No useless rerender**. While writing react, it's easy to writie code where the render function gets called multiple time, although react has little impact of this by using virtual DOM, but more often than not, there are additional functionality resides inside `render` function. These functaionality could get invoked unnecessarily multiple time for multiple rerender.

## `client`
- Use `create-react-app` to generate the project and is [not ejected](https://stackoverflow.com/a/48309071).
- It follows [container ↔︎ component](https://blog.openreplay.com/understanding-the-container-component-pattern-with-react-hooks) design pattern for react

## `scripts`

Scripts contains scripts that would be served from api server origin. Scripts like service worker and service worker installer that are not built as part of client because those are injected while the root asset gets uploaded to server.


# Fix Info

- _.yarnrc.yaml_ is added to address [this issue](https://github.com/facebook/create-react-app/issues/11793) for
  `packages/client`
- [antd](https://ant.design/components/overview/) is used a component lib. In order to brand override css properties,
  use the script `yarn brand-asset-gen`. This is required because `create-react-app` does not support less/saas without
  ejecting and `antd` override is supported from less files. [Read more here](https://medium.com/@aksteps/customising-ant-design-antd-theme-without-using-react-eject-or-any-unreliable-libraries-782c53cbc03b).
- Service worker might not work after Clear Cache & Hard Reload action of browser. Apparently this is part ofspecification.

# Reading

- [Service worker lifecycle](https://web.dev/service-worker-lifecycle/)
