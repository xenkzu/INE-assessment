import { chromium } from 'playwright';

async function testItem(page, id) {
  await page.goto(`https://demo.inelabteamdev.com/item/${id}`, { waitUntil: 'domcontentloaded' });
  try {
    const btn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
    if (await btn.isVisible({ timeout: 500 })) await btn.click({ force: true });
  } catch {}

  const title = await page.$eval('h1', el => el.innerText).catch(() => 'Unknown');
  const options = await page.$$eval('button.opt-chip', els => els.map(e => e.innerText.trim()));

  // Unlock price
  const offerPanel = page.locator('.offer-panel');
  const box = await offerPanel.boundingBox();
  if (box) {
    for (let i = 0; i < 15; i++) {
      await page.mouse.move(box.x + 10 + (i * 12), box.y + 10);
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(1100);
  }

  const checkBtn = page.locator('button.ctl-main, button:has-text("Check today")').first();
  if (await checkBtn.count() > 0) {
    await checkBtn.click({ force: true });
    await page.waitForTimeout(3000);
  }

  const result = await page.evaluate(() => {
    const panel = document.querySelector('.offer-panel');
    if (!panel) return null;

    // Find the main visible price element: it's the <b> tag inside .offer-row with font-size or font-weight
    const boldPriceEl = panel.querySelector('.offer-row b, b.vtdmtfm, .offer-row > b') || panel.querySelector('b');
    const boldPriceText = boldPriceEl ? boldPriceEl.innerText.trim() : null;

    // Find stock pill
    const availPill = panel.querySelector('.avail-pill, .sjl-n6, [class*="avail"]');
    const stockText = availPill ? availPill.innerText.trim() : null;

    return {
      boldPriceText,
      stockText,
      rowHtml: panel.querySelector('.offer-row')?.innerHTML
    };
  });

  console.log(`[Item ${id}] ${title}`);
  console.log('Options:', options);
  console.log('Extracted Bold Price:', result?.boldPriceText);
  console.log('Extracted Stock:', result?.stockText);
  console.log('---');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const ids = ['2111', '2879', '2833', '2472', '2491', '2945'];
  for (const id of ids) {
    await testItem(page, id);
  }

  await browser.close();
}

main().catch(console.error);
