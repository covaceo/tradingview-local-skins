# Skin format

Every file is a strict JSON object, at most 16 KiB UTF-8. All four top-level keys and all seven palette keys are required; unknown keys, including prototype keys, are rejected. Version must be exactly `1`.

```json
{
  "version": 1,
  "id": "my-polar",
  "name": "My Polar",
  "palette": {
    "background": "#101722",
    "surface": "#182234",
    "border": "#41516a",
    "text": "#e2e8f0",
    "muted": "#aab8cd",
    "accent": "#609cff",
    "hover": "#263750"
  }
}
```

`id` is 1–40 characters: a lowercase ASCII letter followed by lowercase letters, digits or hyphens. `name` is 1–60 ASCII characters, starting with a letter/digit; remaining characters may also contain spaces, periods, underscores and hyphens. All colors use exactly six hex digits with a leading `#`. No alpha, shorthand, CSS expressions, URLs, control characters or scripts are allowed.

| Token | Chrome use |
| --- | --- |
| background | Layout and selected painted chrome backgrounds |
| surface | Supported pane/active-toolbar theme tokens |
| border | Region borders and toolbar divider token |
| text | Supported ordinary toolbar text tokens |
| muted | Supported disabled toolbar text token |
| accent | Supported active toolbar text token |
| hover | Supported toolbar hover token |

The runtime additionally requires WCAG relative-luminance contrast of at least 4.5 for `text` and 3 for `muted` against `background`, `surface` and `hover`. The JSON Schema describes structure; these contrast checks run in the parser. Tokens depend on upstream theme usage and are not a guarantee of visible coverage.

```text
node src/cli.js validate --skin path/to/my-skin.json
node src/cli.js watch --skin path/to/my-skin.json --port 9222
```

Edit a local copy while watch runs. Invalid files are rejected before they replace the previous valid stylesheet. Chart canvas palettes, financial up/down colors and chart settings are never taken from skin files.
