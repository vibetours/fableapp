# Fable

Checkout [Notion](https://www.notion.so/sharefable/Product-Tech-a081d6960f134016b67f34b8382684ae) for engineering
details.

# To setup

- The project is setup as [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
- `cd workspaces`
- `yarn` command from **inside `workspaces` dir**
- `cd packages/client && yarn brand-asset-gen`
- Any package specific installation to be done inside the package `app/workspaces/packages/...`

## Scripts

Scripts contains common script that would be served from appserver origin (in local that's http://localhost:8080). The
client gets served from a different origin (in local http://localhost:3000). So we really can't serve the common script
files from http://localhost:3000 since scirpt files contain service-worker and that needs to be loaded from same domain
as the app server.

- Build using `yarn build`
- Upload in s3 using `yarn s3cp`. Change aws profile in `script/package.json` case the profile name is something else.


# Fix Info

- _.yarnrc.yaml_ is added to address [this issue](https://github.com/facebook/create-react-app/issues/11793) for
  `packages/client`
- [antd](https://ant.design/components/overview/) is used a component lib. In order to brand override css properties,
  use the script `yarn brand-asset-gen`. This is required because `create-react-app` does not support less/saas without
  ejecting and `antd` override is supported from less files. [Read more here](https://medium.com/@aksteps/customising-ant-design-antd-theme-without-using-react-eject-or-any-unreliable-libraries-782c53cbc03b).

