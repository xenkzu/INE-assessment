import { scrapeProductVariant } from '../scraper/engine.js';

async function testPiano() {
  console.log('Testing scraping Orbisk Digital Piano Arc with option "Starter bundle"...');
  const result = await scrapeProductVariant({
    url: 'https://demo.inelabteamdev.com/item/2945',
    option: 'Starter bundle',
    headed: false
  });
  console.log('Result:', result);
}

testPiano().catch(console.error);
