// ==UserScript==
// @name         Pahe Clean
// @namespace    local.pahe-clean
// @homepageURL  https://github.com/TafaraObed/pahe-clean
// @supportURL   https://github.com/TafaraObed/pahe-clean/issues
// @downloadURL  https://raw.githubusercontent.com/TafaraObed/pahe-clean/main/pahe-clean.user.js
// @updateURL    https://raw.githubusercontent.com/TafaraObed/pahe-clean/main/pahe-clean.user.js
// @version      0.3.0
// @description  Suppress Pahe's AntiAdBlock Core overlay while keeping your ad blocker enabled.
// @match        https://pahe.ink/*
// @match        https://www.pahe.ink/*
// @run-at       document-start
// @grant        none
// @inject-into  content
// @noframes
// @license      MIT
// ==/UserScript==

(() => {
  'use strict';
  if (!/^(?:www\.)?pahe\.ink$/.test(location.hostname) || window.top !== window.self) return;

  const styleId = 'pahe-clean-style';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  // The site's fallback refuses to attach a closed shadow root to a body
  // containing a slotted child. An inert style element preserves page layout.
  style.setAttribute('slot', 'pahe-clean-guard');
  const rules = new Set();
  const scrollStyles = new WeakMap();
  let found = false;
  let queued = false;

  function ensureStyle() {
    if (style.getAttribute('slot') !== 'pahe-clean-guard') style.setAttribute('slot', 'pahe-clean-guard');
    const parent = document.body || document.documentElement;
    for (const element of [document.documentElement, document.body]) {
      if (element && !scrollStyles.has(element)) {
        const value = element.style.getPropertyValue('overflow');
        scrollStyles.set(element, {
          value: value === 'hidden' ? '' : value,
          priority: element.style.getPropertyPriority('overflow'),
        });
      }
    }
    if (parent && style.parentNode !== parent) parent.appendChild(style);
  }

  function suppressHost(element) {
    if (!element.localName.includes('-')) return;
    for (const attribute of element.attributes) {
      const match = /^data-([a-z][a-z0-9]{5,24})-h$/.exec(attribute.name);
      if (!match || attribute.value !== '1') continue;
      const scope = match[1];
      // Match the relationship between the rotating scope and host tag,
      // rather than a particular day's IDs or arbitrary custom elements.
      if (element.localName !== `${scope.slice(0, 4)}-${scope.slice(4)}`) continue;
      const selector = `${element.localName}[${attribute.name}="1"]`;
      rules.add(selector);
      found = true;
    }
  }

  function repair() {
    queued = false;
    ensureStyle();
    for (const parent of [document.documentElement, document.body]) {
      if (!parent) continue;
      for (const child of parent.children) suppressHost(child);
    }
    const css = [...rules].map(selector => `${selector}{opacity:0!important;pointer-events:none!important;content-visibility:hidden!important;}`).join('\n');
    if (style.textContent !== css) style.textContent = css;
    // Preserve scroll locks belonging to genuine page dialogs.
    const modal = document.querySelector(':modal') || [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
      .find(element => element.checkVisibility());
    if (found && !modal) {
      for (const element of [document.documentElement, document.body]) {
        if (element?.style.getPropertyValue('overflow') === 'hidden') {
          const previous = scrollStyles.get(element);
          if (previous?.value) element.style.setProperty('overflow', previous.value, previous.priority);
          else element.style.removeProperty('overflow');
        }
      }
    }
  }

  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(repair);
  });
  observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'open', 'aria-modal', 'slot'] });
  repair();
})();
