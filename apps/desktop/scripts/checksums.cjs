const { createHash } = require('node:crypto');
const { readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const files = readdirSync('dist').filter(name => /\.(exe|dmg|AppImage|deb)$/.test(name)).sort();
if (!files.length) throw new Error('No installers found');
writeFileSync(join('dist', `SHA256SUMS-${process.platform}.txt`), files.map(name => `${createHash('sha256').update(readFileSync(join('dist', name))).digest('hex')}  ${name}`).join('\n') + '\n');
