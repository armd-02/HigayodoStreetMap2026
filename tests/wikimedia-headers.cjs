const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({ window: {}, fetch: async () => ({ ok: true, json: async () => ({}) }) });
vm.runInContext(fs.readFileSync('lib/wikimedialib.js', 'utf8') + '\nthis.media = new WikimediaLib();', context);
assert.match(context.media.fetchHeaders['User-Agent'], /Higayodo-Street-Map-2026/);
console.log('PASS: Wikimedia API and image requests include an identifying User-Agent');
