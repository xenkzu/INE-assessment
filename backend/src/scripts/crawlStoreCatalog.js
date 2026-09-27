import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle' });
  
  // dismiss consent
  try {
    const btn = page.locator('button:has-text("Allow"), button:has-text("Reject")').first();
    if (await btn.isVisible({ timeout: 1000 })) await btn.click({ force: true });
  } catch {}

  const text = await page.innerText('body');
  console.log('Homepage text:\n', text);

  const buttons = await page.$$eval('button, [role="button"]', els => els.map(e => e.innerText.trim()));
  console.log('Homepage buttons:', buttons);

  await browser.close();
}

main().catch(console.error);
