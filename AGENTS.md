# TradingView Local Skins

User-authorized public, free, open-source repository: a reversible local cosmetic skin layer for existing official TradingView Desktop on Windows and macOS. Preserve the user's existing TradingView data connection and every trading/chart behavior. This is a real deliverable, not a stub/demo. No permanent agent or scheduled workflow.

## Hard scope
- Cosmetic DOM/CSS only. No TradingView app/binary/ASAR patching, copied proprietary bundles, credential reading, market-data extraction, subscription bypass, analytics or telemetry.
- Do not call TradingView's application APIs, read chart/account/cookie/localStorage contents, change orders or market values, hide trading controls, labels, attribution, watermarks, disclosures or auth/consent UI.
- Keep all real screens and actions from TradingView. The chart canvas, indicators and settings remain untouched in v0.1.
- Runtime network calls are ONLY to validated loopback CDP HTTP/WebSocket endpoints. Refuse remote hosts, mismatched socket host/port, HTTP redirects, credentials in URLs and unrelated tabs.
- Never kill/restart the user's app automatically. Require explicit launch, and ask them to fully quit the app if a running instance ignored the debugging flag.
- Local debugging exposes full application capability to other local processes even though this tool only applies CSS. State this clearly. Never open firewall rules, bind publicly, use --remote-allow-origins=* or weaken sandbox/security flags.
- No startup daemon, cron, autostart or extra logins. Foreground watch mode is opt-in for a current skinning session, exits cleanly and removes its styles on Ctrl+C.
- Do not run gh, commit, push, create releases, modify external files or start TradingView from the coding child. Parent handles external actions and native testing.
- Never include user paths, chart screenshots, account metadata, private state or debugging IDs in git. Synthetic fixtures only.

## Implementation and verification
Use strict vertical TDD: one failing behavioral test, execute RED and record its reason, implement minimum behavior, execute GREEN, repeat. Test real parsers, renderer, injection lifecycle, target guards and launcher planning. Transport/OS boundaries can use synthetic fixtures. Use Node's built-in test runner and avoid runtime dependencies. Add only pinned development dependencies when actually needed. On this Windows build shell node/npm aliases are wrapped in winpty and can fail with 'stdin is not a tty'; call native node executable and npm-cli.js directly or via Python subprocess argument arrays.

Node minimum: >=22 with native fetch and WebSocket. ES modules. Keep source small and reviewable. No arbitrary eval/JS from skins: validated JSON palettes only, generate CSS internally. Prefer adding one clearly owned style + owned root attribute in an isolated execution context. Removal restores only owned elements/attributes and doesn't disturb unrelated styles.

README must distinguish Windows Desktop integration tested by parent vs macOS implementation/runner tests vs actual Mac Desktop verification, which is unavailable. Do not imply macOS Desktop already works. Document unsupported upstream DOM/native-titlebar/canvas coverage honestly and prove visible CSS selector coverage in real TradingView before claiming reskin success.
