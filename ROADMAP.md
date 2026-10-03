# Customization roadmap

The goal is a free, local customization toolkit for the existing TradingView Desktop on Windows and macOS. Keep the actual app and data connection. No cloud account with this project, paid skin tier or bundled market-data feed.

## Available in v0.1

- Six starter palettes: Polar, Charcoal, Midnight, Forest, Amethyst and Ocean.
- Custom local JSON themes with seven editable colors and readability checks.
- Shareable palette files and a contributor guide.
- Guarded apply, replacement and removal of cosmetic application chrome.
- Foreground watch for local edits, chart reloads and newly opened eligible tabs.
- Windows launch discovery and actual Windows app verification.
- macOS launch discovery and cross-platform code tests. Actual Mac Desktop integration remains unverified.

## Proposed next, not implemented

1. **Local visual theme editor:** color pickers, preview, undo and JSON export. No terminal required for editing.
2. **Friendlier Windows/macOS launcher:** choose a theme and start an explicitly local session, with a clear stop/restore control.
3. **Community theme packs:** browse and import palette data manually, never execute downloaded code.
4. **Fine-grained chrome controls:** per-panel colors, typography, spacing, control shapes and density, gated by readability and unchanged control hit areas.
5. **Optional chart-appearance presets:** investigate the app's own appearance controls for candles, grid, labels and backgrounds, with explicit apply and exact restore. The current loader deliberately does not alter painted charts or saved chart settings.

These are directions for discussion, not shipped capabilities or delivery promises. Native-titlebar styling and arbitrary plugin scripts are not supported in v0.1.

## Every feature must preserve

Existing data access, indicators and drawings; symbol/timeframe and chart viewport unless the user deliberately changes them; order controls and financial semantics; authentication and consent; visible disclosures/attribution; reversible local changes. Never turn this project into a data scraper or an alternative trading backend.

Actual Mac Desktop apply/remove verification is a release gate before claiming native Mac compatibility. CI on macOS alone cannot satisfy it.
