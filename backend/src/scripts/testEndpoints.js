async function testLiveEndpoints() {
  const BASE_URL = 'https://ine-assessment-de8i.onrender.com';
  console.log('Testing live endpoints on:', BASE_URL);

  // 1. Health
  try {
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    console.log('[1. Health Check]:', healthRes.status, await healthRes.json());
  } catch (e) {
    console.error('[1. Health Check Error]:', e.message);
  }

  // 2. Tracked products
  try {
    const trackedRes = await fetch(`${BASE_URL}/api/products/tracked`);
    console.log('[2. Tracked Products]:', trackedRes.status, await trackedRes.json());
  } catch (e) {
    console.error('[2. Tracked Products Error]:', e.message);
  }

  // 3. Search Catalog
  try {
    const searchRes = await fetch(`${BASE_URL}/api/products/search?q=foam`);
    console.log('[3. Search Catalog]:', searchRes.status, await searchRes.text());
  } catch (e) {
    console.error('[3. Search Catalog Error]:', e.message);
  }

  // 4. CSV Export
  try {
    const csvRes = await fetch(`${BASE_URL}/api/export/csv`);
    console.log('[4. CSV Export]:', csvRes.status, await csvRes.text());
  } catch (e) {
    console.error('[4. CSV Export Error]:', e.message);
  }
}

testLiveEndpoints();
