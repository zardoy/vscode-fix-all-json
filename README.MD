# Fix All JSON

Simple VSCode extension for fixing almost all annoying JSON (and even JSONC!) problems.

- supports virtual workspaces and web
- small and no dependencies
- simple and fast as it uses prepared diagnostics

<!-- TODO about code fixes -->

## What fixes

All these fixes are configurable and can be disabled in settings:

| Error Message                                   | Action                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| Expected comma                                  | Insert missing comma                                 |
| Trailing comma                                  | Remove trailing comma                                |
| Comments are not permitted in JSON. (json only) | Remove the whole comment!                            |
| Property keys must be doublequoted              | Remove quotes (if have `'` or **`**) and doublequote |

## Why not Prettier?

[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) as formatter does great work on fixing trailing semicolons and quotes problems, however this extension is much faster (see above), also it fixes more problems.
