// extract_details.mjs
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const RAW_FILE = path.join(DATA_DIR, 'discovered_raw.json');
const EXTRACTED_FILE = path.join(DATA_DIR, 'extracted_leads.json');

async function extractAllDetails() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error('Error: discovered_raw.json does not exist. Run discovery first.');
    return;
  }

  const rawPlaces = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
  console.log(`Loaded ${rawPlaces.length} raw discovered places.`);

  // Load existing extractions
  let extractedMap = new Map();
  if (fs.existsSync(EXTRACTED_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(EXTRACTED_FILE, 'utf-8'));
      existing.forEach(p => extractedMap.set(p.canonicalUrl, p));
      console.log(`Loaded ${extractedMap.size} previously extracted leads.`);
    } catch (e) {}
  }

  // Rank and prioritize candidates:
  // 1. Core Santa Cruz del Valle & Real del Valle
  // 2. Has phone in feed or web in feed
  // 3. High rating
  const sortedCandidates = [...rawPlaces].sort((a, b) => {
    const aIsCore = a.searchZone.includes('Santa Cruz') ? 3 : (a.searchZone.includes('Real del Valle') ? 2 : 1);
    const bIsCore = b.searchZone.includes('Santa Cruz') ? 3 : (b.searchZone.includes('Real del Valle') ? 2 : 1);
    if (aIsCore !== bIsCore) return bIsCore - aIsCore;

    const aHasPhone = a.feedPhone ? 2 : 0;
    const bHasPhone = b.feedPhone ? 2 : 0;
    if (aHasPhone !== bHasPhone) return bHasPhone - aHasPhone;

    const aRating = a.rating || 0;
    const bRating = b.rating || 0;
    return bRating - aRating;
  });

  // Pick top 160 candidates that are not already extracted
  const targetCandidates = sortedCandidates.slice(0, 160);
  const toProcess = targetCandidates.filter(p => !extractedMap.has(p.href));
  console.log(`Target candidates selected: ${targetCandidates.length}, remaining to process: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log('All candidates already extracted!');
    return;
  }

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

  const CONCURRENCY = 3;
  let index = 0;

  async function worker() {
    while (index < toProcess.length) {
      const myIndex = index++;
      const raw = toProcess[myIndex];
      try {
        console.log(`[${myIndex + 1}/${toProcess.length}] Extracting: "${raw.title}" (${raw.searchZone})`);
        const result = await extractPlaceData(context, raw);
        if (result) {
          extractedMap.set(result.canonicalUrl, result);
          if (extractedMap.size % 5 === 0) {
            fs.writeFileSync(EXTRACTED_FILE, JSON.stringify(Array.from(extractedMap.values()), null, 2), 'utf-8');
            console.log(`Checkpoint saved: ${extractedMap.size} leads in database.`);
          }
        }
      } catch (err) {
        console.warn(`Failed extracting "${raw.title}":`, err.message);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  await browser.close();

  fs.writeFileSync(EXTRACTED_FILE, JSON.stringify(Array.from(extractedMap.values()), null, 2), 'utf-8');
  console.log(`\nExtraction completed! Total leads in extracted_leads.json: ${extractedMap.size}`);
}

async function extractPlaceData(context, raw) {
  const page = await context.newPage();
  try {
    await page.goto(raw.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2200);

    const data = await page.evaluate(() => {
      const name = document.querySelector('h1')?.innerText?.trim() || '';

      // Rating
      const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
      let rating = null;
      if (ratingEl) {
        const parsed = parseFloat(ratingEl.innerText.replace(',', '.'));
        if (!isNaN(parsed)) rating = parsed;
      }

      // Review count
      let numResenas = 0;
      const bodyText = document.body.innerText || '';
      const matchReviews = bodyText.match(/(\d[\d,.]*)\s*(?:reseñas?|opiniones?)/i);
      if (matchReviews) {
        numResenas = parseInt(matchReviews[1].replace(/[,.]/g, ''), 10);
      } else {
        const ariaBtn = document.querySelector('button[aria-label*="reseña" i], button[aria-label*="opinión" i]');
        if (ariaBtn) {
          const m = ariaBtn.getAttribute('aria-label').match(/(\d[\d,.]*)/);
          if (m) numResenas = parseInt(m[1].replace(/[,.]/g, ''), 10);
        }
      }

      // Category
      const catBtn = document.querySelector('button[jsaction*="pane.rating.category"]');
      const category = catBtn ? catBtn.innerText.trim() : '';

      // Address
      const addressBtn = document.querySelector('button[data-item-id="address"]');
      let address = addressBtn ? addressBtn.innerText.trim() : '';
      address = address.replace(/^[\s\uE000-\uF8FF\n]+/, '').trim();

      // Phone
      let phone = '';
      const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
      if (phoneBtn) {
        const dataId = phoneBtn.getAttribute('data-item-id') || '';
        const idMatch = dataId.match(/phone:tel:(\+?\d+)/);
        if (idMatch) {
          phone = idMatch[1];
        } else {
          phone = phoneBtn.innerText.replace(/^[\s\uE000-\uF8FF\n]+/, '').trim();
        }
      }
      if (!phone) {
        const phoneMatch = bodyText.match(/(?:(?:\+?52\s*)?(?:33|37|38)\s*\d{2}\s*\d{2}\s*\d{4}|\d{2}\s*\d{4}\s*\d{4})/);
        if (phoneMatch) phone = phoneMatch[0].trim();
      }

      // Website
      const webBtn = document.querySelector('a[data-item-id="authority"]');
      let website = webBtn ? webBtn.href : '';
      if (!website) {
        const webAnchor = Array.from(document.querySelectorAll('a[aria-label*="Sitio web" i]')).find(a => a.href);
        if (webAnchor) website = webAnchor.href;
      }

      // Reviews text
      const reviewElements = Array.from(document.querySelectorAll('div[data-review-id], div.MyEned, span.wiI7pd'));
      const sampleReviews = [];
      const seenReviews = new Set();
      for (const el of reviewElements) {
        const t = el.innerText.trim();
        if (t.length > 15 && !seenReviews.has(t)) {
          seenReviews.add(t);
          sampleReviews.push(t);
          if (sampleReviews.length >= 6) break;
        }
      }

      // Photos count
      const photoEls = Array.from(document.querySelectorAll('button[aria-label*="Foto" i], img[src*="googleusercontent"]'));
      const photosCount = photoEls.length;

      return {
        name,
        category,
        rating,
        numResenas,
        address,
        phone,
        website,
        sampleReviews,
        photosCount
      };
    });

    await page.close();

    const finalName = data.name || raw.title;
    const finalRating = data.rating || raw.rating || 0;
    const finalPhone = cleanPhone(data.phone || raw.feedPhone || '');
    const finalWebsite = cleanWebsite(data.website || raw.feedWebsite || '');
    const finalAddress = data.address || raw.feedLines?.find(l => /\d/.test(l) && (l.includes('de Mayo') || l.includes('Av') || l.includes('Calle') || l.includes('Col') || l.includes('Jal'))) || '';

    // Zone & municipality refinement
    const zoneInfo = refineZoneAndMunicipality(finalAddress, raw.searchZone, raw.searchMunicipality);

    return {
      canonicalUrl: raw.href,
      name: finalName,
      category: data.category || inferCategory(finalName, raw.searchQuery),
      rating: finalRating,
      numResenas: data.numResenas || inferResenas(raw.feedLines),
      phone: finalPhone,
      phoneDisplay: formatPhoneDisplay(finalPhone),
      address: finalAddress,
      zona: zoneInfo.zone,
      municipio: zoneInfo.municipality,
      website: finalWebsite,
      tieneWeb: !!finalWebsite,
      webType: classifyWeb(finalWebsite),
      sampleReviews: data.sampleReviews,
      photosCount: data.photosCount,
      searchQuery: raw.searchQuery
    };

  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

function cleanPhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('52') && clean.length === 12) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+') && clean.length === 10) {
    clean = '+52' + clean;
  }
  return clean;
}

function formatPhoneDisplay(phone) {
  if (!phone) return 'Sin teléfono';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('52') && digits.length === 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

function cleanWebsite(url) {
  if (!url) return '';
  if (url.includes('google.com/url?q=')) {
    try {
      const u = new URL(url);
      return u.searchParams.get('q') || url;
    } catch (e) {}
  }
  return url;
}

function classifyWeb(url) {
  if (!url) return 'Sin web';
  const u = url.toLowerCase();
  if (u.includes('instagram.com')) return 'Instagram';
  if (u.includes('facebook.com')) return 'Facebook';
  if (u.includes('doctoralia') || u.includes('fresha') || u.includes('agendapro') || u.includes('booksy') || u.includes('wa.me')) {
    return 'Plataforma de citas';
  }
  return 'Web propia';
}

function inferCategory(name, query) {
  const n = (name + ' ' + query).toLowerCase();
  if (n.includes('barber') || n.includes('barberia')) return 'Barbería';
  if (n.includes('dental') || n.includes('dentista') || n.includes('ortodoncia')) return 'Clínica dental';
  if (n.includes('uña') || n.includes('nail') || n.includes('pestaña') || n.includes('lash') || n.includes('ceja')) return 'Estudio de belleza y uñas';
  if (n.includes('fisio') || n.includes('rehabilit') || n.includes('podolog')) return 'Fisioterapia y salud';
  if (n.includes('spa') || n.includes('estetica') || n.includes('dermatolog') || n.includes('facial')) return 'Clínica estética y Spa';
  if (n.includes('salon') || n.includes('peluquer')) return 'Salón de belleza';
  return 'Estudio / Clínica';
}

function inferResenas(lines) {
  if (!lines || !Array.isArray(lines)) return 0;
  for (const l of lines) {
    const m = l.match(/\((\d[\d,.]*)\)/);
    if (m) return parseInt(m[1].replace(/[,.]/g, ''), 10);
  }
  return 0;
}

function refineZoneAndMunicipality(address, defaultZone, defaultMuni) {
  const text = (address || '').toLowerCase();
  
  let zone = defaultZone;
  let municipality = defaultMuni;

  if (text.includes('santa cruz del valle')) {
    zone = 'Santa Cruz del Valle';
    municipality = 'Tlajomulco de Zúñiga';
  } else if (text.includes('real del valle') || text.includes('valle dorado')) {
    zone = 'Real del Valle / Valle Dorado';
    municipality = 'Tlajomulco de Zúñiga';
  } else if (text.includes('hacienda santa fe') || text.includes('santa fe') || text.includes('chulavista')) {
    zone = 'Hacienda Santa Fe / Chulavista';
    municipality = 'Tlajomulco de Zúñiga';
  } else if (text.includes('las pintas') || text.includes('las pintitas')) {
    zone = 'Las Pintas / Adolf Horn';
    municipality = text.includes('salto') ? 'El Salto' : 'San Pedro Tlaquepaque';
  } else if (text.includes('toluquilla') || text.includes('el vergel')) {
    zone = 'Toluquilla / El Vergel';
    municipality = 'San Pedro Tlaquepaque';
  } else if (text.includes('san sebastián') || text.includes('san sebastian') || text.includes('gavilanes')) {
    zone = 'San Sebastián el Grande';
    municipality = 'Tlajomulco de Zúñiga';
  } else if (text.includes('nueva galicia') || text.includes('punto sur') || text.includes('san agustín') || text.includes('palomar')) {
    zone = 'Nueva Galicia / Punto Sur';
    municipality = 'Tlajomulco de Zúñiga';
  } else if (text.includes('sauz') || text.includes('miravalle')) {
    zone = 'El Sauz / Miravalle';
    municipality = 'Guadalajara Sur';
  }

  return { zone, municipality };
}

extractAllDetails().catch(console.error);
