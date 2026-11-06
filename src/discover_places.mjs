// discover_places.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEARCH_QUERIES } from './zones_and_queries.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const RAW_FILE = path.join(DATA_DIR, 'discovered_raw.json');

async function runDiscovery() {
  console.log(`Starting discovery across ${SEARCH_QUERIES.length} target queries in GDL Sur...`);

  // Load existing if any
  let discovered = [];
  if (fs.existsSync(RAW_FILE)) {
    try {
      discovered = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
      console.log(`Loaded ${discovered.length} existing places from ${RAW_FILE}`);
    } catch (e) {
      discovered = [];
    }
  }

  const seenUrls = new Set(discovered.map(p => cleanPlaceUrl(p.href)));

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      '--lang=es-419,es',
      '--window-size=1366,768',
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext({
    locale: 'es-419',
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  let queryIndex = 0;
  for (const q of SEARCH_QUERIES) {
    queryIndex++;
    console.log(`[${queryIndex}/${SEARCH_QUERIES.length}] Query: "${q.query}" (${q.zone})`);

    try {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(q.query)}?hl=es`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      // Scroll feed 3-4 times
      for (let s = 0; s < 4; s++) {
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollTop += 1800;
        });
        await page.waitForTimeout(1200);
      }

      // Extract places from feed
      const placesInFeed = await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return [];
        const items = Array.from(feed.querySelectorAll('div.Nv2PK'));
        return items.map(it => {
          const a = it.querySelector('a.hfpxzc');
          if (!a || !a.href) return null;

          const title = a.getAttribute('aria-label') || it.querySelector('div.qBF1Pd')?.innerText?.trim() || '';
          const href = a.href;

          // Rating
          const ratingSpan = it.querySelector('span.MW4etd')?.innerText?.trim() || '';
          let rating = null;
          if (ratingSpan) {
            const parsed = parseFloat(ratingSpan.replace(',', '.'));
            if (!isNaN(parsed)) rating = parsed;
          }

          // Full text lines
          const fullText = it.innerText || '';
          const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

          // Find website link if present
          let website = '';
          const webAnchor = Array.from(it.querySelectorAll('a')).find(anch => {
            const h = anch.href;
            return h && !h.includes('/maps/') && !h.includes('google.com/search');
          });
          if (webAnchor) {
            website = webAnchor.href;
          }

          // Phone detection from text
          let phone = '';
          const phoneMatch = fullText.match(/(?:(?:\+?52\s*)?(?:33|37|38)\s*\d{2}\s*\d{2}\s*\d{4}|\d{2}\s*\d{4}\s*\d{4})/);
          if (phoneMatch) {
            phone = phoneMatch[0].trim();
          }

          return {
            title,
            href,
            rating,
            fullText,
            lines,
            website,
            phone
          };
        }).filter(Boolean);
      });

      let newlyAdded = 0;
      for (const p of placesInFeed) {
        const canonical = cleanPlaceUrl(p.href);
        if (!seenUrls.has(canonical) && p.title) {
          seenUrls.add(canonical);
          discovered.push({
            title: p.title,
            href: canonical,
            rating: p.rating,
            feedPhone: p.phone,
            feedWebsite: p.website,
            feedLines: p.lines,
            searchZone: q.zone,
            searchMunicipality: q.municipality,
            searchQuery: q.query
          });
          newlyAdded++;
        }
      }

      console.log(`   Found ${placesInFeed.length} places, +${newlyAdded} new (Total: ${discovered.length})`);

      // Incremental checkpoint
      fs.writeFileSync(RAW_FILE, JSON.stringify(discovered, null, 2), 'utf-8');

    } catch (err) {
      console.warn(`   Error on query "${q.query}":`, err.message);
    }

    // Brief pause between queries
    await page.waitForTimeout(1000);
  }

  await browser.close();
  console.log(`\nDiscovery finished! Total unique places collected: ${discovered.length}`);
}

function cleanPlaceUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    // Google maps place URL path up to /data= or standard place
    const match = url.match(/https:\/\/www\.google\.com\/maps\/place\/[^/]+\/data=![^?&]+/);
    if (match) return match[0];
    return `${u.origin}${u.pathname}`;
  } catch (e) {
    return url.split('?')[0];
  }
}

runDiscovery().catch(console.error);
