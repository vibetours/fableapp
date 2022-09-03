# Fable

Checkout [Notion](https://www.notion.so/sharefable/Product-Tech-a081d6960f134016b67f34b8382684ae) for engineering
details.

# To setup

- The project is setup as [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
- `cd workspaces`
- `yarn` command from **inside `workspaces` dir**
- `cd packages/client && yarn brand-asset-gen`
- Any package specific installation to be done inside the package `app/workspaces/packages/...`

# Fix Info

- _.yarnrc.yaml_ is added to address [this issue](https://github.com/facebook/create-react-app/issues/11793) for
  `packages/client`
- [antd](https://ant.design/components/overview/) is used a component lib. In order to brand override css properties,
  use the script `yarn brand-asset-gen`. This is required because `create-react-app` does not support less/saas without
  ejecting and `antd` override is supported from less files. [Read more here](https://medium.com/@aksteps/customising-ant-design-antd-theme-without-using-react-eject-or-any-unreliable-libraries-782c53cbc03b).

