import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_FILE = path.resolve(__dirname, '../index.html');

async function testPipelineUi() {
  console.log('Testing Status Select and CRM Pipeline Filters...');
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

  // 1. Verify card status selects exist
  const statusSelects = await page.$$eval('.crm-status-select', els => els.length);
  console.log(`- Card status selects found: ${statusSelects} (Expected: 194)`);
  if (statusSelects !== 194) {
    throw new Error(`Expected 194 status selects, found ${statusSelects}`);
  }

  // 2. Test changing status of lead_1 to 'confirmada'
  console.log('- Changing status of lead_1 to "confirmada"...');
  await page.selectOption('#status_lead_1', 'confirmada');
  await page.waitForTimeout(300);

  const cardClass = await page.$eval('#card_lead_1', el => el.className);
  console.log(`- Card class after change: "${cardClass}"`);
  if (!cardClass.includes('card-status-confirmada')) {
    throw new Error(`Expected 'card-status-confirmada' in class, got "${cardClass}"`);
  }

  // 3. Test changing status of lead_2 to 'en_proceso'
  console.log('- Changing status of lead_2 to "en_proceso"...');
  await page.selectOption('#status_lead_2', 'en_proceso');
  await page.waitForTimeout(300);

  // 4. Test filtering by status
  console.log('- Filtering by status: "confirmada"...');
  await page.selectOption('#statusFilter', 'confirmada');
  await page.waitForTimeout(300);

  const confirmadaCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Rendered cards with status 'confirmada': ${confirmadaCount}`);
  if (confirmadaCount !== 1) {
    throw new Error(`Expected exactly 1 confirmed card, found ${confirmadaCount}`);
  }

  // 5. Test persistence across reload
  console.log('- Reloading page to test persistence of pipeline state...');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const statusAfterReload = await page.$eval('#status_lead_1', el => el.value);
  console.log(`- Status of lead_1 after reload: "${statusAfterReload}" (Expected: 'confirmada')`);
  if (statusAfterReload !== 'confirmada') {
    throw new Error(`Persistence failed: expected 'confirmada', got "${statusAfterReload}"`);
  }

  // 6. Test reset filter to all
  await page.selectOption('#statusFilter', '');
  await page.waitForTimeout(300);
  const totalCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Total cards after resetting status filter: ${totalCount}`);
  if (totalCount !== 194) {
    throw new Error(`Expected 194 cards, got ${totalCount}`);
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    throw new Error('Errors in console/page');
  }

  console.log('\nAll status select and filter tests passed successfully! ✅');
}

testPipelineUi().catch(err => {
  console.error(err);
  process.exit(1);
});
