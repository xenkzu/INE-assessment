import { scrapeProductVariant } from '../scraper/engine.js';

// Parse command line arguments if provided (e.g. --url=https://... --option="Regular")
const args = process.argv.slice(2);
let targetUrl = 'https://demo.inelabteamdev.com/item/2111';
let targetOption = 'Regular';

args.forEach((arg) => {
  if (arg.startsWith('--url=')) targetUrl = arg.split('=')[1];
  if (arg.startsWith('--option=')) targetOption = arg.split('=')[1];
});

console.log('===========================================================');
console.log('👀 OBSERVABLE HEADED SCRAPER RUN (DEMONSTRATION MODE)');
console.log('===========================================================');
console.log(`🎯 Target URL:    ${targetUrl}`);
console.log(`🏷️  Target Option: ${targetOption}`);
console.log(`🌐 Browser:       Chromium (Headed / Visible UI)`);
console.log('-----------------------------------------------------------');
console.log('Starting execution... please watch the browser window.\n');

async function runHeadedDemo() {
  const result = await scrapeProductVariant({
    url: targetUrl,
    option: targetOption,
    headed: true,
    maxRetries: 3
  });

  console.log('\n===========================================================');
  console.log('🏁 HEADED SCRAPE COMPLETED');
  console.log('===========================================================');
  console.log(`Outcome:        ${result.outcome.toUpperCase()}`);
  console.log(`Price Extracted: ${result.price !== null ? '₹' + result.price : 'N/A'}`);
  console.log(`Stock Status:   ${result.stock || 'N/A'}`);
  console.log(`Retry Count:    ${result.retryCount}`);
  console.log(`Duration:       ${(result.durationMs / 1000).toFixed(2)}s`);
  if (result.errorMessage) {
    console.log(`Error Message:  ${result.errorMessage}`);
  }
  console.log('===========================================================\n');
}

runHeadedDemo();
