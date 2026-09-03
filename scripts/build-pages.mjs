import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs');
// Publish only these browser assets, never repository metadata or internal notes.
const files = [
  'index.html', 'pony.html', 'tour.html', 'admin.html', 'account-admin.html', 'developer-policy-92f7c6a4.html', 'app.js', 'admin.js', 'account-admin.js', 'booking-rules.js',
  'tokens.css', 'components.css', 'styles.css', 'admin.css', 'admin-reference.css', '.nojekyll',
  'assets/logo/mascot.png', 'assets/logo/pony-land.png', 'assets/logo/logo_color.svg',
  'assets/characters/pony-rider.png', 'assets/characters/cowboy-child.png',
  'assets/pony/cover.jpg', 'assets/pony/gallery-01.jpg', 'assets/pony/gallery-02.jpg',
  'assets/tour/cover.jpg', 'assets/tour/gallery-01.jpg', 'assets/tour/gallery-02.jpg',
];

function verifyDirectory(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = prefix + entry.name;
    if (entry.isDirectory()) verifyDirectory(join(directory, entry.name), path + '/');
    else if (!entry.isFile() || !files.includes(path)) {
      throw new Error('Unexpected public file; review before publishing: ' + path);
    }
  }
}

mkdirSync(output, { recursive: true });
verifyDirectory(output);
for (const file of files) {
  const target = join(output, file);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, file), target);
}
verifyDirectory(output);
console.log('Prepared ' + files.length + ' public website files in docs/.');
