import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/item/2945', { waitUntil: 'networkidle' });
  
  // Dismiss cookie
  try {
    const btn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
    if (await btn.isVisible({ timeout: 1000 })) await btn.click({ force: true });
  } catch {}

  const title = await page.$eval('h1', el => el.innerText).catch(() => 'No H1');
  const options = await page.$$eval('button.opt-chip', els => els.map(e => e.innerText.trim()));
  console.log('Title:', title);
  console.log('Options on page:', options);

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
  await checkBtn.click({ force: true });

  await page.waitForTimeout(4000);

  const panelHtml = await page.$eval('.offer-panel', el => el.innerHTML);
  console.log('--- PANEL HTML ---');
  console.log(panelHtml);

  const panelText = await page.$eval('.offer-panel', el => el.innerText);
  console.log('--- PANEL TEXT ---');
  console.log(panelText);

  await browser.close();
}

main().catch(console.error);
