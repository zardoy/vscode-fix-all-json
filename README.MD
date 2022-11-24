# Fix All JSON

Simple & fast VSCode extension for fixing almost all annoying JSON (and even JSONC!) problems on typing / save.

- supports virtual workspaces and web
- simple and fast as it uses the errors you see
- [On-Type Fixes](#on-type-fixes)

### Enabling Fixing on Save

To enable problems auto fixing on save (which is super useful), ensure you have the following in your `settings.json` (`> Preferences: Open User Settings (JSON)`):

```json
"editor.codeActionsOnSave": {
  "source.fixAll": true
}
```

## What fixes

All these fixes are configurable and can be disabled in settings:

| Error Message                                   | Action                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| Expected comma                                  | Insert missing comma                                 |
| Colon expected                                  | Insert missing colon                                 |
| Trailing comma                                  | Remove trailing comma                                |
| Comments are not permitted in JSON. (json only) | Remove the whole comment (**disabled by default**)   |
| Property keys must be doublequoted              | Remove quotes (if have `'` or **`**) and doublequote |

> Note: missing commas just placed before the error range. Its assumed you have autoformatter enabled to handle the "right positioning"

Note 2: this extension though doesn't do value *autoquoting*, there is [vscode-fix-json](https://github.com/oliversturm/vscode-fix-json) for this.

> Sometimes builtin JSON extension can be slow. In these cases you need to wait until errors are updated before fixing the file! We can do absolutely nothing about it.

## Why not Prettier?

[Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) as formatter does great work on fixing trailing semicolons and quotes problems, however this extension is much faster and has more fixes.

## Additional Features

### On-Type Fixes

- Insert missing comma on `Enter` (or `Ctrl+Enter`, enabled by default with `fixAllJson.insertMissingCommaOnEnter`)
- Insert missing double quotes on `:` (enabled by default with `fixAllJson.insertMissingDoubleQuotesOnColon`)
<!-- - Replace `"` with `\"` within strings (disabled by default with `fixAllJson...`) -->
<!-- - Replace `Enter` with `\n` within strings (disabled by default with `fixAllJson...`) -->
<!-- - Replace `Tab` with `\t` within strings (disabled by default with `fixAllJson...`) -->
