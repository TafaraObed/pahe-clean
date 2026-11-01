// Authored fixture for the observed closed-shadow overlay behavior.
// Set PAHE_REAL_LOADER to a local captured loader to test that code instead.
(() => {
  let host;
  let escalated = false;
  function show() {
    host = document.createElement('cb1c-4d2da');
    host.setAttribute('data-cb1c4d2da-h', '1');
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'closed' });
    shadow.innerHTML = '<div style="position:fixed;inset:0;z-index:2147483647;background:#111e;color:white">Disable your ad blocker to continue</div>';
    host.style.setProperty('display', 'block', 'important');
    host.style.setProperty('visibility', 'visible', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
  }
  show();
  new MutationObserver(() => {
    if (!host.isConnected) show();
  }).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(() => {
    if (escalated || getComputedStyle(host).opacity !== '0') return;
    escalated = true;
    if ([...document.body.children].some(child => child.hasAttribute('slot'))) {
      host.remove();
    } else {
      const fallback = document.body.attachShadow({ mode: 'closed' });
      fallback.innerHTML = '<slot></slot><div style="position:fixed;inset:0;z-index:2147483647">Blocking fallback</div>';
    }
  }, 400);
})();
