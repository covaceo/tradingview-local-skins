# TradingView Local Skins v0.1

A free, open-source, unofficial local customization toolkit for TradingView Desktop on Windows and macOS. Use the actual installed app and its existing data connection. Start with six shareable palettes, edit colors locally, apply them reversibly, and contribute your own themes. This project is independent of and not endorsed by TradingView.

v0.1 styles application chrome only. It supplies no market data, credentials, subscriptions or API keys, and contains no telemetry. It does not patch app files or copy TradingView code. Windows app integration is verified; actual Mac app integration is not yet verified.

## Quick start

Install Node >=22 and the official TradingView Desktop app, then download this repository or clone it:

```sh
git clone https://github.com/covaceo/tradingview-local-skins.git
cd tradingview-local-skins
node src/cli.js list
node src/cli.js launch --skin polar
```

The launcher explicitly starts a local debugging session. Read the security warning below first. If TradingView is already running without debugging, quit it yourself before launching. Leave the terminal open; Ctrl+C removes the skin, but the debugging listener stays open until you fully quit TradingView.

Available starter themes: **Polar, Charcoal, Midnight, Forest, Amethyst and Ocean**. Use `--skin` with a built-in name or your own JSON file. See [SKINS.md](SKINS.md) to make and share a theme, [CONTRIBUTING.md](CONTRIBUTING.md) to contribute, and [ROADMAP.md](ROADMAP.md) for proposed customization features that are not yet implemented.

**Local debugging exposes full application capability to other local processes, including control of a logged-in app. Our cosmetic code does not make CDP read-only.** Use a trusted machine and fully quit TradingView yourself when finished to close the debugging endpoint. See [SECURITY.md](SECURITY.md).

## Install and use

Install Node >=22 and download or clone this public repository. No npm install is needed: there are no runtime or development dependencies. Run commands from the repository directory. `node src/cli.js --help` shows the CLI. The default debugging port is 9222.

```text
node src/cli.js list
node src/cli.js validate --skin skins/polar.json
```

On Windows PowerShell, explicitly launch the official installed app and enter a foreground skin session:

```powershell
node .\src\cli.js launch --skin polar --port 9222
# If discovery fails, supply the real absolute executable path:
node .\src\cli.js launch --skin charcoal --app 'C:\Synthetic Install\TradingView\TradingView.exe' --port 9222
```

The example override path is synthetic; replace it with the actual official executable. Discovery checks MSIX `TradingView.Desktop` package name/install location, then normal LocalAppData installs. No app directories are modified.

On macOS, the implemented launch command is:

```sh
node ./src/cli.js launch --skin polar --port 9222
# Explicit executable override, if required:
node ./src/cli.js launch --skin charcoal --app /Applications/TradingView.app/Contents/MacOS/TradingView --port 9222
```

macOS discovery checks `/Applications` and `~/Applications`, the known executable, and `CFBundleExecutable` via PlistBuddy. **Actual macOS TradingView integration is unverified.** These are implementation instructions, not a claim that this Desktop integration already works on a Mac.

Launch passes argument arrays without a shell: `--remote-debugging-port=PORT` and `--remote-debugging-address=127.0.0.1`. It waits up to about 15 seconds for an allowed chart, then watches in the foreground. It never kills or restarts the app, creates a profile, disables sandboxing or opens firewall rules. If an existing instance ignores the flag, fully quit TradingView yourself and retry. If you need to sign in or open a chart, do so using the official app, then use `watch`. Starting the app, opening a chart and quitting remain explicit user actions.

To use an app you have already explicitly started with loopback debugging enabled:

```text
node src/cli.js doctor --port 9222
node src/cli.js apply --skin charcoal --port 9222
node src/cli.js watch --skin polar --port 9222
node src/cli.js remove --port 9222
```

`doctor` reports only the count of eligible chart pages and local readiness; it does not read account, authentication or chart contents. `apply` replaces the one owned stylesheet and exits, leaving it until `remove`, reload or app exit. `watch` validates local file edits, discovers new chart tabs, recovers reloads and reapplies only absent/different owned CSS. Invalid edits retain the last valid skin and produce a retry notice. The first failed discovery is an actionable error. After a session starts, temporary unavailable charts/endpoints are retried until you stop it.

`apply`, `watch` and `remove` support optional `--target ID`; otherwise they handle all eligible chart tabs. Target IDs are session-specific CDP metadata, so obtain them locally if needed; this tool does not print them. Run one skinning session per app. Ctrl+C/SIGTERM requests guarded removal of styles from charts touched by that watch session. If the endpoint disappears, cleanup reports its limits and recommends `remove` or reload. Forced process termination cannot guarantee cleanup. Stopping this tool leaves the app and its debugging endpoint running until you fully quit it yourself.

Copy either file in [skins](skins/) and edit its seven colors. See [SKINS.md](SKINS.md) and [skin.schema.json](skin.schema.json). Skins are strict JSON palettes; arbitrary CSS, URLs and JavaScript are rejected.

## Coverage and verification status

The selector map in [src/css.js](src/css.js) scopes known top/left/right/bottom layout regions and conservative painted chrome descendants, including `#drawing-toolbar`. Toolbar theme tokens preserve separate financial red/green semantics: there is no broad child text color rule or manipulation of display, positioning, pointer events or stacking.

The native titlebar lives in an excluded local app shell. Chart canvases, axes, studies, indicators and settings are outside v0.1. No center-area selector, application API or chart-setting write is used. Auth/consent UI, trading controls, labels, attribution, disclosures and watermarks must remain visible and usable. Upstream DOM/theme-token changes or opaque nested panels can limit coverage. Missing selectors are reported; the CLI never claims an entire app reskin succeeded.

Applying reports bounded counts for each region: matching elements, those with visible geometry, and those whose computed background matches the skin. These counts are structural CSS evidence; they cannot prove the element is unobscured or that every nested panel changed. **A parent native visual check is required before claiming visible reskin success.** No screenshots or chart/account state belong in this repository.

Windows Desktop 3.4.1.8194: verified in the actual installed app. All six starter themes visibly recolored painted toolbar/sidebar chrome. Applying, replacing, reconnecting and removing preserved the symbol/timeframe, study versions and inputs/styles, drawings, viewport, price-scale configuration and every captured chart-canvas byte. Existing studies remained enabled without errors. Repeated apply kept one owned stylesheet; removal restored the original painted UI colors and removed all owned DOM state. A real foreground watch session reapplied and cleaned up on its abort signal. The listener was independently verified bound to `127.0.0.1`, not a public interface. Private screenshots and state evidence remain outside this repository. These are Windows observations, not a guarantee for future app builds.

macOS: discovery/argument planning has synthetic boundary tests. Actual Mac Desktop testing is unavailable. CI on macOS tests Node code, not TradingView integration.

## Tests

```text
node --test
# Or:
npm test
```

The tests execute the actual palette parser, renderer, injection program and orchestration. OS/WebSocket boundaries and the small DOM fixture are synthetic. No tests launch TradingView, contact its servers or read a real profile. The CI matrix runs Node 22/24 on Windows, macOS and Ubuntu; Ubuntu checks code only and has no supported Desktop launcher.

The implementation was also tested under a restricted Windows build sandbox using `node --test --experimental-test-isolation=none`, because that sandbox blocked spawning test workers. The normal native Windows verification successfully ran the standard `node --test` command above. No isolation override is required for ordinary use.

Use your installed native Node executable directly if your shell wraps the `node` alias. RED/GREEN TAP receipts are local and ignored under `.qa/`. There is no autostart, scheduled job, daemon, permanent agent or extra login.

Our code is under [MIT](LICENSE). TradingView and its app assets remain the property of their owners; no license to them is granted here.
