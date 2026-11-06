import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_FILE = path.resolve(__dirname, '../informe-leads-gdl-sur.html');

async function testReportUi() {
  console.log('Testing HTML report UI with Playwright...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-gpu']
  });

  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', err => errors.push(`PageError: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`ConsoleError: ${msg.text()}`);
  });

  await page.goto(`file:///${HTML_FILE.replace(/\\/g, '/')}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // 1. Check title and 4 stats
  const statTotal = await page.$eval('#statTotal', el => el.innerText.trim());
  const statZones = await page.$eval('#statZones', el => el.innerText.trim());
  const statReviews = await page.$eval('#statReviews', el => el.innerText.trim());
  const statRating = await page.$eval('#statRating', el => el.innerText.trim());

  console.log('Stats Check:');
  console.log(`- Total: ${statTotal} (Expected: 194)`);
  console.log(`- Zonas: ${statZones} (Expected: 8)`);
  console.log(`- Reseñas: ${statReviews}`);
  console.log(`- Rating: ${statRating}`);

  if (parseInt(statTotal) < 100) {
    throw new Error(`Total leads (${statTotal}) is less than required 100 leads`);
  }

  // 2. Check cards rendered
  const cardCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Rendered cards: ${cardCount}`);
  if (cardCount !== parseInt(statTotal)) {
    throw new Error(`Rendered cards (${cardCount}) does not match statTotal (${statTotal})`);
  }

  // 3. Test Search filtering
  console.log('\nTesting Search Filter...');
  await page.fill('#searchInput', 'Santa Cruz');
  await page.waitForTimeout(300);
  const filteredCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Search 'Santa Cruz' yielded: ${filteredCount} cards`);
  if (filteredCount === 0 || filteredCount >= cardCount) {
    throw new Error(`Search filter failed, count was ${filteredCount}`);
  }

  // Clear search
  await page.fill('#searchInput', '');
  await page.waitForTimeout(300);

  // 4. Test Chart bar click filtering
  console.log('\nTesting Chart Bar Click...');
  const firstBar = await page.$('.chart-bar-row');
  const barLabel = await firstBar.$eval('.chart-bar-label', el => el.innerText.trim());
  await firstBar.click();
  await page.waitForTimeout(400);
  const barFilteredCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Clicking bar '${barLabel}' filtered cards to: ${barFilteredCount}`);

  // Reset zone filter
  await page.selectOption('#zoneFilter', '');
  await page.waitForTimeout(300);

  // 5. Test CRM Checkbox & Notes Persist across reload
  console.log('\nTesting CRM Checkbox and Note Persistence...');
  const firstCardId = await page.$eval('.lead-card', el => el.id);
  const leadId = firstCardId.replace('card_', '');
  console.log(`- Interacting with lead: ${leadId}`);

  // Check the checkbox
  await page.click(`#chk_${leadId}`);
  // Type a test note
  const testNote = 'Llamada realizada: contestó el Dr. Leonardo, agendar demo el próximo martes.';
  await page.fill(`#note_${leadId}`, testNote);
  await page.waitForTimeout(600); // Wait for debounce save

  // Reload page
  console.log('- Reloading page to verify persistence from localStorage...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const isCheckedAfter = await page.$eval(`#chk_${leadId}`, el => el.checked);
  const noteAfter = await page.$eval(`#note_${leadId}`, el => el.value);

  console.log(`- Checkbox after reload: ${isCheckedAfter} (Expected: true)`);
  console.log(`- Note after reload: "${noteAfter}" (Expected match)`);

  if (!isCheckedAfter || noteAfter !== testNote) {
    throw new Error('CRM persistence across reload failed!');
  }

  // 6. Test Theme Toggle
  console.log('\nTesting Theme Toggle...');
  const initialTheme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`- Initial theme: ${initialTheme}`);
  await page.click('#themeToggle');
  await page.waitForTimeout(300);
  const toggledTheme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`- Toggled theme: ${toggledTheme}`);
  if (initialTheme === toggledTheme) {
    throw new Error('Theme toggle failed to change data-theme attribute');
  }

  // 7. Test Mobile Viewport
  console.log('\nTesting Mobile Viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mobileCardVisible = await page.$eval('.lead-card', el => el.offsetHeight > 0);
  console.log(`- Mobile card rendered properly: ${mobileCardVisible}`);

  await browser.close();

  if (errors.length > 0) {
    console.error('Errors found during UI test:', errors);
    throw new Error('UI test encountered console/page errors');
  }

  console.log('\nALL UI AND INTEGRITY TESTS PASSED SUCCESSFULLY! ✅');
}

testReportUi().catch(err => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
