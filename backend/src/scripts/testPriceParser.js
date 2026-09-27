import { parsePrice, parseStock } from '../scraper/engine.js';

const testCases = [
  { input: '₹1,28,394 ₹98,863 28% saving', expected: 98863 },
  { input: '₹1,43,801\nMember price ₹1,27,264\n₹1 10 727\n23% saving', expected: 110727 },
  { input: 'Rs. 4,114.00', expected: 4114 },
  { input: '₹ \u200B3 \u200B0 \u200B, \u200B7 \u200B3 \u200B6', expected: 30736 },
  { input: '₹14,940', expected: 14940 },
  { input: '$118.00', expected: 118 },
  { input: '₹98,863', expected: 98863 }
];

console.log('--- TESTING PARSE PRICE ---');
for (const tc of testCases) {
  const actual = parsePrice(tc.input);
  console.log(`Input: ${JSON.stringify(tc.input)}`);
  console.log(`Expected: ${tc.expected} | Actual: ${actual} | PASS: ${actual === tc.expected}`);
}
