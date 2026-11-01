const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const userscript = fs.readFileSync(path.join(__dirname, '../pahe-clean.user.js'), 'utf8');
const loaderPath = process.env.PAHE_REAL_LOADER || path.join(__dirname, 'fixtures/overlay.js');
const loader = fs.readFileSync(loaderPath, 'utf8');

async function loadFixture(page, { enabled = true, real = true } = {}) {
  await page.route('**/*', route => route.request().isNavigationRequest()
    ? route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head></head><body>
      <main style="height:3000px"><h1>Pahe navigation fixture</h1>
      <a id="browse" href="/page/2/">Next page</a><button id="action" onclick="this.textContent='Clicked'">Test button</button>
      <dialog id="legitimate"><p>Normal site dialog</p></dialog></main>
      ${real ? `<script>${loader}</script>` : ''}</body></html>` })
    : route.abort());
  // Captured loaders may skip automation. Use a normal browser identity
  // and the loader's force flag so the control must produce an overlay.
  await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  if (enabled) await page.addInitScript({ content: userscript });
  await page.goto('https://pahe.ink/#aabc_force');
}

const host = '[data-cb1c4d2da-h="1"]';

test('control: the overlay blocks the page without the userscript', async ({ page }) => {
  await loadFixture(page, { enabled: false });
  await expect(page.locator(host)).toBeAttached({ timeout: 20000 });
  await expect(page.locator(host)).toHaveCSS('opacity', '1');
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
});

test('suppress a closed-shadow overlay and survive its watchdog', async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator(host)).toBeAttached({ timeout: 20000 });
  await expect(page.locator(host)).toHaveCSS('opacity', '0');
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
  await page.waitForTimeout(4000); // Real loader retries on a 400 ms watchdog.
  await expect(page.locator(host)).toHaveCSS('opacity', '0');
  await page.locator('#action').click();
  await expect(page.locator('#action')).toHaveText('Clicked');
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(500);
});

test('rotating hosts and replacement hosts remain suppressed', async ({ page }) => {
  await loadFixture(page, { real: false });
  const addHost = async () => page.evaluate(() => {
    const element = document.createElement('cafe-01234');
    element.setAttribute('data-cafe01234-h', '1');
    element.attachShadow({ mode: 'closed' }).innerHTML = '<div style="position:fixed;inset:0">Blocking overlay</div>';
    document.documentElement.append(element);
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
  });
  await addHost();
  await expect(page.locator('cafe-01234')).toHaveCSS('opacity', '0');
  await page.locator('#action').click();
  await page.evaluate(() => document.querySelector('cafe-01234').remove());
  await addHost();
  await expect(page.locator('cafe-01234')).toHaveCSS('opacity', '0');
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
});

test('real modal keeps its own scroll lock', async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator(host)).toHaveCSS('opacity', '0', { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelector('#legitimate').showModal();
    document.documentElement.style.overflow = 'hidden';
  });
  await expect(page.locator('#legitimate')).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.waitForTimeout(600);
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden');
  await page.evaluate(() => document.querySelector('#legitimate').close());
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden');
});

test('unrelated custom elements and ordinary browsing remain functional', async ({ page }) => {
  await loadFixture(page, { real: false });
  await page.evaluate(() => {
    const element = document.createElement('video-player');
    element.setAttribute('data-cafe01234-h', '1');
    element.textContent = 'Normal player';
    document.body.append(element);
  });
  await expect(page.locator('video-player')).toHaveCSS('opacity', '1');
  await page.locator('#browse').click();
  await expect(page).toHaveURL('https://pahe.ink/page/2/');
});

test('restores its stylesheet if the site removes or clears it', async ({ page }) => {
  await loadFixture(page);
  await expect(page.locator(host)).toHaveCSS('opacity', '0', { timeout: 20000 });
  await page.evaluate(() => document.getElementById('pahe-clean-style').textContent = '');
  await expect(page.locator(host)).toHaveCSS('opacity', '0');
  await page.evaluate(() => document.getElementById('pahe-clean-style').remove());
  await expect(page.locator('#pahe-clean-style')).toBeAttached();
  await expect(page.locator(host)).toHaveCSS('opacity', '0');
});

test('preserves preexisting overflow settings and does nothing on other sites', async ({ page }) => {
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html style="overflow:scroll!important"><body><button>Normal page</button></body></html>' }));
  await page.goto('https://pahe.ink/');
  await page.addScriptTag({ content: userscript });
  await page.evaluate(() => {
    const host = document.createElement('cafe-01234');
    host.setAttribute('data-cafe01234-h', '1');
    document.documentElement.append(host);
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
  });
  await expect(page.locator('html')).toHaveCSS('overflow', 'scroll');
  await page.goto('https://example.org/');
  await page.addScriptTag({ content: userscript });
  await expect(page.locator('#pahe-clean-style')).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('overflow', 'scroll');
});
