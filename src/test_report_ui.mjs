import { chromium } from 'playwright-core';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_FILE = path.resolve(__dirname, '../index.html');

async function testReportUi() {
  console.log('Testing updated responsive UI and contact CRM labels...');
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

  // 1. Check stats and cards
  const statTotal = await page.$eval('#statTotal', el => el.innerText.trim());
  const cardCount = await page.$$eval('.lead-card', els => els.length);
  console.log(`- Total: ${statTotal}, Rendered Cards: ${cardCount}`);

  // 2. Check "Marcar como contactado" label
  const firstLabel = await page.$eval('.crm-label', el => el.innerText.trim());
  console.log(`- CRM Checkbox label: "${firstLabel}" (Expected: 'Marcar como contactado')`);
  if (!firstLabel.includes('contactado')) {
    throw new Error(`Label does not include 'contactado', got "${firstLabel}"`);
  }

  // 3. Check WhatsApp buttons exist
  const waButtons = await page.$$eval('a.btn-wa', els => els.length);
  console.log(`- WhatsApp action buttons present: ${waButtons}`);
  if (waButtons < 100) {
    throw new Error(`Expected >100 WhatsApp buttons, found ${waButtons}`);
  }

  // 4. Test checking contact and note persistence
  const firstCardId = await page.$eval('.lead-card', el => el.id);
  const leadId = firstCardId.replace('card_', '');
  console.log(`- Toggling contact on: ${leadId}`);

  await page.click(`#chk_${leadId}`);
  const labelAfterCheck = await page.$eval(`#card_${leadId} .crm-label`, el => el.innerText.trim());
  console.log(`- Label after check: "${labelAfterCheck}"`);
  if (!labelAfterCheck.includes('Negocio contactado')) {
    throw new Error(`Expected '✓ Negocio contactado', got "${labelAfterCheck}"`);
  }

  const testNote = 'Visita presencial: se entregó catálogo al encargado de recepción.';
  await page.fill(`#note_${leadId}`, testNote);
  await page.waitForTimeout(600);

  // Reload to verify persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const isCheckedAfter = await page.$eval(`#chk_${leadId}`, el => el.checked);
  const noteAfter = await page.$eval(`#note_${leadId}`, el => el.value);

  console.log(`- Checkbox after reload: ${isCheckedAfter}`);
  console.log(`- Note after reload: "${noteAfter}"`);

  if (!isCheckedAfter || noteAfter !== testNote) {
    throw new Error('CRM persistence test failed!');
  }

  // 5. Test Multiple Mobile Viewports (iPhone SE, iPhone 14, Android Tablet)
  const viewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 14 Pro (393x852)', width: 393, height: 852 },
    { name: 'Galaxy Fold (280x653)', width: 280, height: 653 },
    { name: 'iPad Mini (768x1024)', width: 768, height: 1024 }
  ];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(200);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    console.log(`- ${vp.name}: innerWidth=${innerWidth}, scrollWidth=${scrollWidth}`);
    if (scrollWidth > innerWidth + 1) {
      throw new Error(`Horizontal overflow detected in ${vp.name}: scrollWidth (${scrollWidth}) > innerWidth (${innerWidth})`);
    }
  }

  await browser.close();

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    throw new Error('Errors in console/page');
  }

  console.log('\nAll tests passed successfully! ✅ Zero horizontal overflow on all screen sizes.');
}

testReportUi().catch(err => {
  console.error(err);
  process.exit(1);
});
