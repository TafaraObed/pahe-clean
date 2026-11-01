# Pahe Clean

Hide pahe.ink's anti-adblock popup while keeping uBlock Origin or uBlock Origin Lite enabled. The script restores scrolling and runs again when you open another page on the site.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/get-it/) if you do not already have it.
2. Open [pahe-clean.user.js](https://raw.githubusercontent.com/TafaraObed/pahe-clean/main/pahe-clean.user.js) and choose Install in your userscript manager.
3. Reload pahe.ink. Keep your ad blocker enabled.

If the install link shows source code, create a new script in Violentmonkey, paste the complete file, and save it.

The script runs on `https://pahe.ink/*` and `https://www.pahe.ink/*`. It needs no extra permissions or external libraries. Its update URLs point to this repository. Tampermonkey may also work, but it has not been tested.

## How it works

The site's popup uses a closed shadow root with a rotating element name and marker. It locks scrolling and tries to restore the popup when something hides it. It can also try to attach the popup to the page body.

Pahe Clean identifies the popup host by the relationship between its name and marker. It hides that host, disables its pointer events, and restores scrolling. A slotted style element prevents the site's body fallback. The script repairs its stylesheet if the site removes it and preserves scroll locks used by normal dialogs.

Your ad blocker handles advertising requests and popunder windows. Pahe Clean hides the blocking dialog. The site's detection and telemetry code can still run. Site changes may require an update to the script.

## Tests

On 1 November 2026, seven browser regression tests passed against a captured copy of the site's loader. Live checks also passed on the homepage and an article page with uBlock Origin Lite 2026.1026.1812 enabled. Links and scrolling worked, and advertising probes remained blocked. The project owner also confirmed that the installed script worked.

The published test suite uses an authored fixture for the observed popup behavior. Captured site code, browser profiles, and request logs stay outside the repository. See [test details](docs/testing.md).

```powershell
npm ci
npx playwright install chromium
npm test
```

Node.js 20 or newer is required. Set `PAHE_CHROMIUM_PATH` to use an existing compatible Chromium browser.

## Report a problem

[Open an issue](https://github.com/TafaraObed/pahe-clean/issues) with the page URL, browser, userscript manager, ad blocker, and a description of what failed.

## License

MIT. See [LICENSE](LICENSE).
