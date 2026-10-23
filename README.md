# Userscript API Capture

**Capture the data a web page already loads, straight from your browser, using a userscript.**

Most modern sites don't put their data in the HTML. The page calls a JSON API in the background (`fetch` / `XMLHttpRequest`) and draws the result on screen. If data is visible on your screen, a userscript manager such as **Tampermonkey** can see that response and record or modify it. This repo explains the technique and includes a ready-to-edit, generic capture script.

> Built by [Apex Automation Team](https://apexautomationteam.com/). Watch real automation builds running on the **[Sample Works page](https://apexautomationteam.com/sample-works/)**, including network-hooking and API-extraction samples such as [Collabstr Automation](https://apexautomationteam.com/sample-works/?p=p2) and [Modash Influencer Extractor](https://apexautomationteam.com/sample-works/?p=p3).

---

## At a glance

| | |
|---|---|
| **Type** | Browser userscript / guide for browser-side API capture |
| **Runs in** | Chrome, Edge, Firefox, Safari (with a userscript manager) |
| **Manager** | [Tampermonkey](https://www.tampermonkey.net/) (others: Violentmonkey, Greasemonkey) |
| **Language** | JavaScript (no build step, no dependencies) |
| **Hooks** | `window.fetch` and `XMLHttpRequest` |
| **Output** | JSON (raw responses) and CSV (flattened records, Excel friendly) |
| **Included** | `scripts/api-capture.user.js` |

## How it works

```
Page loads  ->  page calls  fetch()/XHR  ->  server returns JSON  ->  page renders it
                                   ^                  |
                          userscript wraps these      |
                          functions at document-start +--> copy of the JSON is stored, you export it
```

1. The script runs at `document-start`, before the page's own code.
2. It wraps `fetch` and `XMLHttpRequest`. The page still gets its normal response; the script only keeps a **copy** of responses whose URL matches your filter.
3. A small panel (bottom right) shows how many responses were captured and offers **JSON**, **CSV** and **Clear** buttons. The same actions are in the Tampermonkey menu.
4. For CSV, the script finds the first array of objects in each response, flattens nested keys (`a.b`), and builds a clean table.

## Quick start

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. **Chrome / Edge only:** open `chrome://extensions/` (or `edge://extensions/`) and switch **Developer mode ON**. Without this, userscripts will not run.
3. Open `scripts/api-capture.user.js`, copy it into a new Tampermonkey script (Dashboard > `+`), and edit:
   - `@match` to the site you are allowed to capture from
   - `URL_FILTER` to match the API URLs you see in DevTools (Network tab, Fetch/XHR filter)
   - optional `DEDUPE_KEY` (for example `'id'`) to skip repeated records
4. Open the site, scroll or navigate as you normally would, then click **CSV** or **JSON**.

### Finding the right `URL_FILTER`

Open DevTools (`F12`) > **Network** > **Fetch/XHR**, use the page normally, and look for the request that returns the data you see. Put a distinctive part of its URL in `URL_FILTER`:

```js
const URL_FILTER = /\/api\/v2\/products|graphql/i;
```

## Configuration

| Setting | Default | Meaning |
|---|---|---|
| `URL_FILTER` | `/\/api\/\|graphql\|search/i` | Only responses whose URL matches are recorded |
| `DEDUPE_KEY` | `null` | Field name used to drop repeated records (for example `id`) |
| `MAX_RECORDS` | `50000` | Safety cap on stored responses |

Debug in the console: `unsafeWindow.__apiCapture.responses`, `.allRecords()`, `.toCSV(rows)`.

## Tampermonkey vs. no-code tools

| Method | Easy? | Risk | Output |
|---|---|---|---|
| Tampermonkey / userscripts | No | Higher | Messy until cleaned |
| No-code tools (Apify, Phantombuster) | Yes | Lower | Clean Excel / CSV |

Userscripts are free and flexible, but they break when a site changes. For scheduled, repeatable collection, hosted tools or a custom build are usually more stable.

## Where to find userscripts

| Source | Notes |
|---|---|
| [Greasy Fork](https://greasyfork.org/en) | Largest catalogue; quality is mixed and many scripts are outdated |
| [OpenUserJS](https://openuserjs.org/) | Free and open source; smaller catalogue |
| [GitHub](https://github.com/) | Search `userscript` plus your topic; actively maintained scripts are easier to find. Use the **Raw** button to install |
| [awesome-userscripts](https://github.com/awesome-scripts/awesome-userscripts) | Curated list, mostly general browsing enhancements rather than data extraction |

Tips: always read a script before installing it, check the last update date, and expect that a script written for a site's old layout will stop working.

## Known limitations

- Only **JSON** responses are captured; binary, HTML and WebSocket traffic are ignored.
- Responses fetched by a **Web Worker** or inside a cross-origin iframe are not seen unless the script also runs there.
- The CSV export uses the first array of objects found in each response (up to 4 levels deep). Unusual shapes may need a small tweak in `extractRecords`.
- Some sites sign or encrypt API traffic; capturing the response still works, but replaying the request yourself may not.
- Sites change often. Re-check `URL_FILTER` when something stops capturing.

## Responsible use

Only capture data you have the right to access and use. Check the target site's terms of service and robots rules, respect rate limits (work at a human pace), and follow privacy laws such as GDPR and CCPA when personal data is involved. Prefer an official API or a data export feature when one exists. Social platforms in particular restrict automated collection and may restrict accounts that do it. The authors accept no liability for misuse.

## More from Apex Automation Team

Automation, web scraping, QA and back-office systems. See builds in action on the **[Sample Works page](https://apexautomationteam.com/sample-works/)** or write to [contact@apexautomationteam.com](mailto:contact@apexautomationteam.com).

## License

Add your preferred license (for example MIT) before publishing.
