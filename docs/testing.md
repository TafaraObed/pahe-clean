# Testing

## Regression suite

`npm test` runs seven Chromium tests against the authored fixture in `tests/fixtures/overlay.js`. They cover:

- A control that shows the blocking overlay without the userscript.
- Suppression through watchdog retries, with buttons and scrolling still usable.
- Rotating and replacement overlay hosts.
- Normal dialog scroll locks and closing behavior.
- Unrelated custom elements and link navigation.
- A removed or cleared stylesheet.
- Existing overflow settings and exclusion of other sites.

The suite fulfills page documents locally and aborts other requests. It does not contact pahe.ink.

To test a locally captured copy of the site's loader, set `PAHE_REAL_LOADER` to its absolute file path before running `npm test`. The archived loader used during development has the marker `data-cb1c4d2da-h`. A newer capture may need a different marker in the tests. Site code is not included in this repository.

## Recorded live check

The development check on 1 November 2026 used uBlock Origin Lite 2026.1026.1812 with six filtering rulesets enabled. It confirmed:

- The blocking host was visible before script injection.
- The host stayed hidden after 12 seconds of watchdog retries.
- Pointer events no longer intercepted page clicks.
- The page scrolled to 600 pixels.
- Clicking a homepage article link loaded another page, where document-start injection suppressed the overlay again.
- Advertising probes failed with `ERR_BLOCKED_BY_CLIENT`.

The automated check injected the script directly. The project owner later confirmed that the installed userscript worked. Tests did not check every menu or control on the site.

## Run a live check

Download the Chromium ZIP from the [official uBlock Origin Lite release](https://github.com/uBlockOrigin/uBOL-home/releases/tag/2026.1026.1812) and extract it into `research/ubol`. The file `research/ubol/manifest.json` must exist.

```powershell
npm run test:live
```

This check contacts the real site and uses the separate profile `.test-profiles/ubol`. It saves screenshots and request results under `research/evidence`. Git ignores both directories. It does not open a personal browser profile.
