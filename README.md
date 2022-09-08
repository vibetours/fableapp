# Fable

### To setup the projects checkout [Common Project Information](https://github.com/sharefable/dev-docs/blob/master/README.md)

## General

The project is setup as [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/). Here is the app structure
- `workspace/packages/client` contains the frontend code for falbe app
- `workspace/packages/ext` contains the code for browser extension
- `workspace/packages/scripts` contains the code for common scripts that are served via cdn

## Scripts

Scripts contains common script that would be served from api server origin. Scripts like service worker and service worker installer that are not built as part of client goes here.

To build and use those scripts, go to `workspace/packages/script` dir and
- Build using `yarn build`
- Upload in s3 using `yarn s3cp`. Change aws profile in `script/package.json` case the profile name is something else.


# Fix Info

- _.yarnrc.yaml_ is added to address [this issue](https://github.com/facebook/create-react-app/issues/11793) for
  `packages/client`
- [antd](https://ant.design/components/overview/) is used a component lib. In order to brand override css properties,
  use the script `yarn brand-asset-gen`. This is required because `create-react-app` does not support less/saas without
  ejecting and `antd` override is supported from less files. [Read more here](https://medium.com/@aksteps/customising-ant-design-antd-theme-without-using-react-eject-or-any-unreliable-libraries-782c53cbc03b).
- Service worker might not work after Clear Cache & Hard Reload action of browser. Apparently this is part of
  specification. There might be a fix to way around this, but it was not investigated.

# Reading

- [Service worker lifecycle](https://web.dev/service-worker-lifecycle/)
