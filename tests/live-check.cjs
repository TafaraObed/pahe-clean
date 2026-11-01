// Opt-in network check. Uses a separate profile; never opens your personal profile.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const extension = path.resolve('research/ubol');
  const context = await chromium.launchPersistentContext(path.resolve('.test-profiles/ubol'), {
    executablePath: process.env.PAHE_CHROMIUM_PATH,
    headless: true,
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 20000 });
    const blocker = await worker.evaluate(async () => ({
      name: chrome.runtime.getManifest().name,
      version: chrome.runtime.getManifest().version,
      rulesets: await chrome.declarativeNetRequest.getEnabledRulesets(),
    }));
    if (!blocker.rulesets.length) throw new Error('uBOL has no active rulesets');
    const page = await context.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    const requests = [];
    page.on('requestfailed', request => requests.push({ url: request.url(), error: request.failure()?.errorText }));
    await page.goto('https://pahe.ink/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const getHosts = () => page.evaluate(() => [...document.documentElement.children].filter(e =>
      e.localName.includes('-') && [...e.attributes].some(a => /^data-[a-z][a-z0-9]{5,24}-h$/.test(a.name))
    ).map(e => ({ tag: e.localName, attrs: e.getAttributeNames(), opacity: getComputedStyle(e).opacity,
      pointerEvents: getComputedStyle(e).pointerEvents, closed: !e.shadowRoot })));
    await page.waitForFunction(() => [...document.documentElement.children].some(e =>
      e.localName.includes('-') && [...e.attributes].some(a => /^data-[a-z][a-z0-9]{5,24}-h$/.test(a.name))
    ), { timeout: 30000 });
    fs.mkdirSync('research/evidence', { recursive: true });
    await page.screenshot({ path: 'research/evidence/live-before.png' });
    const before = await getHosts();
    await page.addScriptTag({ content: fs.readFileSync('pahe-clean.user.js', 'utf8') });
    await page.waitForFunction(() => document.getElementById('pahe-clean-style') &&
      [...document.documentElement.children].filter(e => e.localName.includes('-')).every(e => getComputedStyle(e).opacity === '0'));
    await page.waitForTimeout(12000); // Exercise the real visibility watchdog and fallback.
    const after = await getHosts();
    const state = await page.evaluate(() => ({
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflow: getComputedStyle(document.body).overflow,
      guardInBody: document.getElementById('pahe-clean-style')?.parentElement === document.body,
      title: document.title,
    }));
    if (!after.length || after.some(e => e.opacity !== '0' || e.pointerEvents !== 'none')) throw new Error('Overlay returned');
    if (state.htmlOverflow === 'hidden' || state.bodyOverflow === 'hidden') throw new Error('Scrolling is locked');
    await page.evaluate(() => window.scrollTo(0, 600));
    const scrollY = await page.evaluate(() => window.scrollY);
    if (scrollY < 500) throw new Error('Page did not scroll');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'research/evidence/live-after.png' });
    // A userscript manager injects on each new document. Check real navigation
    // with document-start injection as well as the late-injection rescue above.
    await page.addInitScript({ content: fs.readFileSync('pahe-clean.user.js', 'utf8') });
    const articleLink = page.locator('h2.post-box-title a').first();
    const expectedArticle = await articleLink.getAttribute('href');
    await articleLink.click();
    await page.waitForURL(expectedArticle, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('pahe-clean-style')?.textContent.includes('content-visibility'));
    await page.waitForTimeout(5000);
    const article = { url: page.url(), hosts: await getHosts() };
    if (!article.hosts.length || article.hosts.some(e => e.opacity !== '0')) throw new Error('Article overlay not suppressed');
    await page.screenshot({ path: 'research/evidence/live-article-after.png' });
    const result = { checkedAt: new Date().toISOString(), blocker, before, after, state, scrollY, article, failedRequests: requests };
    fs.writeFileSync('research/evidence/live-result.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
