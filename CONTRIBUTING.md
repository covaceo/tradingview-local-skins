# Contributing

This is a free, unofficial local customization project for TradingView Desktop. Contributions are welcome. No payment, account with this project or hosted service is required.

## Share a theme

1. Copy a JSON file from `skins/`. Choose a new ID and name, then edit the seven palette colors.
2. Run `node src/cli.js validate --skin skins/your-theme.json`. The parser checks the format and text contrast.
3. Test apply and remove on your own explicitly debug-enabled app. State your operating system and Desktop build. Never call a Node/macOS CI result a real Mac app test.
4. Open a pull request with only your palette. If adding it to the built-in list, update `BUILTINS` and the starter-theme test together.

Do not upload private chart screenshots, trades, account data, Pine source, credentials, cookies, local paths or debugging IDs. Use synthetic illustrations for public examples. Themes must be original or submitted with permission and compatible with this project's MIT license.

## Code changes

Run `node --test`. Add a failing behavioral regression before changing runtime behavior. Verify real apply/reapply/remove and preserved chart behavior when touching selectors or the loader. Keep Windows/macOS code portable and distinguish fixture tests from native app proof.

Skins are data, not scripts. Do not add arbitrary CSS/JS execution, remote theme downloads that auto-run code, non-loopback debugging, app/binary patching, credential access, market-data extraction, order manipulation or subscription bypass. Preserve financial red/green semantics, controls, disclosures and attribution.

See [ROADMAP.md](ROADMAP.md) for proposed capabilities. Open an issue to discuss a feature before broad implementation. For a possible vulnerability, use the private reporting method in [SECURITY.md](SECURITY.md), not a public issue containing account state.
