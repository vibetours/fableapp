# Fable

Checkout [Notion](https://www.notion.so/sharefable/Product-Tech-a081d6960f134016b67f34b8382684ae) for engineering
details.

# To setup

- The project is setup as [yarn workspaces](https://classic.yarnpkg.com/lang/en/docs/workspaces/)
- `cd workspaces`
- `yarn` command from **inside `workspaces` dir**
- Any package specific installation to be done inside the package `app/workspaces/packages/...`

# Fix Info

- _.yarnrc.yaml_ is added to address [this issue](https://github.com/facebook/create-react-app/issues/11793) for
  `packages/client`

