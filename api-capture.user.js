// ==UserScript==
// @name         API Capture - fetch/XHR response logger & exporter
// @namespace    https://apexautomationteam.com/
// @version      1.0.0
// @description  Records the JSON API responses a page already loads in your browser, then exports them as JSON or CSV.
// @author       Apex Automation Team
// @match        https://example.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // ================= SETTINGS =================
  const URL_FILTER = /\/api\/|graphql|search/i; // only responses whose URL matches are recorded
  const DEDUPE_KEY = null;                      // e.g. 'id' to skip records with a repeated id
  const MAX_RECORDS = 50000;                    // safety cap
  // ============================================

  const w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const responses = []; // { url, time, data }
  const seen = new Set();

  // ---------- helpers ----------
  function extractRecords(data, depth = 0) {
    if (Array.isArray(data)) {
      return data.length && typeof data[0] === 'object' ? data : [];
    }
    if (data && typeof data === 'object' && depth < 4) {
      for (const k of Object.keys(data)) {
        const found = extractRecords(data[k], depth + 1);
        if (found.length) return found;
      }
    }
    return [];
  }

  function flatten(obj, prefix = '', out = {}) {
    for (const [k, v] of Object.entries(obj || {})) {
      const key = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
    }
    return out;
  }

  function allRecords() {
    const rows = [];
    for (const r of responses) {
      const recs = extractRecords(r.data);
      for (const rec of (recs.length ? recs : [r.data])) rows.push(flatten(rec));
    }
    return rows;
  }

  function toCSV(rows) {
    const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
    const esc = v => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return '\ufeff' + [cols.join(',')]
      .concat(rows.map(r => cols.map(c => esc(r[c])).join(','))).join('\n');
  }

  function handle(url, data) {
    if (responses.length >= MAX_RECORDS) return;
    if (DEDUPE_KEY) {
      const recs = extractRecords(data);
      const fresh = [];
      for (const r of recs) {
        if (r && r[DEDUPE_KEY] !== undefined && !seen.has(r[DEDUPE_KEY])) {
          seen.add(r[DEDUPE_KEY]);
          fresh.push(r);
        }
      }
      if (recs.length && !fresh.length) return;
      if (recs.length) data = fresh;
    }
    responses.push({ url, time: new Date().toISOString(), data });
    updatePanel();
  }

  const matches = url => !!url && URL_FILTER.test(String(url));

  // ---------- hook fetch ----------
  if (typeof w.fetch === 'function') {
    const origFetch = w.fetch;
    w.fetch = function (...args) {
      const p = origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (matches(url)) {
          p.then(res => res.clone().json().then(d => handle(res.url || url, d))).catch(() => {});
        }
      } catch (e) { /* never break the page */ }
      return p;
    };
  }

  // ---------- hook XMLHttpRequest ----------
  if (w.XMLHttpRequest) {
    const proto = w.XMLHttpRequest.prototype;
    const origOpen = proto.open;
    const origSend = proto.send;
    proto.open = function (method, url) {
      this.__capUrl = url;
      return origOpen.apply(this, arguments);
    };
    proto.send = function () {
      this.addEventListener('load', () => {
        try {
          const url = this.responseURL || this.__capUrl;
          if (!matches(url)) return;
          if (this.responseType === 'json') handle(url, this.response);
          else if (this.responseType === '' || this.responseType === 'text') handle(url, JSON.parse(this.responseText));
        } catch (e) { /* not JSON or blocked, ignore */ }
      });
      return origSend.apply(this, arguments);
    };
  }

  // ---------- export ----------
  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  const exportJSON = () => download('api-capture-' + stamp() + '.json', JSON.stringify(responses, null, 2), 'application/json');
  const exportCSV = () => download('api-capture-' + stamp() + '.csv', toCSV(allRecords()), 'text/csv');
  const clearAll = () => { responses.length = 0; seen.clear(); updatePanel(); };

  // ---------- tiny panel ----------
  let label;
  function updatePanel() { if (label) label.textContent = 'API Capture: ' + responses.length + ' responses'; }

  function buildPanel() {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#111;color:#eee;' +
      'font:12px/1.4 system-ui,sans-serif;padding:8px 10px;border-radius:8px;box-shadow:0 2px 10px #0008;';
    label = document.createElement('div');
    box.appendChild(label);
    [['JSON', exportJSON], ['CSV', exportCSV], ['Clear', clearAll]].forEach(([t, fn]) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.style.cssText = 'margin:6px 6px 0 0;padding:2px 8px;cursor:pointer;';
      b.onclick = fn;
      box.appendChild(b);
    });
    document.body.appendChild(box);
    updatePanel();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel);
    else buildPanel();
  }
  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Export JSON', exportJSON);
    GM_registerMenuCommand('Export CSV', exportCSV);
    GM_registerMenuCommand('Clear captured data', clearAll);
  }

  // handy for debugging in DevTools: unsafeWindow.__apiCapture
  w.__apiCapture = { responses, allRecords, toCSV };
})();
