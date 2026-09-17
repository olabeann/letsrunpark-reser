import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'docs');
// Publish only these browser assets, never repository metadata or internal notes.
const files = [
  'busan.html', 'jeju.html', 'admin-reservations.html', 'admin-operations.html', 'admin-settlement.html', 'admin-program-edit.html', 'admin-program-sessions.html',
  'booking.html', 'cart.html', 'checkout.html', 'complete.html', 'reservations.html', 'ticket.html', 'demo-controls.js',
  'index.html', 'admin.html', 'account-admin.html', 'error.html', 'payment-failed.html', 'app.js', 'admin.js', 'settlement.js', 'xlsx-export.js', 'account-admin.js', 'booking-rules.js', 'developer-policy.js',
  'tokens.css', 'components.css', 'styles.css', 'admin.css', 'admin-reference.css', 'empty-states.css', 'empty-states.html', 'empty-states.js', 'error.css', '.nojekyll',
  'assets/logo/cowboy-malma.png', 'assets/logo/logo_color.svg',
  'assets/icons/discount-proof-alert.svg',
  'assets/characters/pony-rider.png', 'assets/characters/cowboy-child.png',
  'assets/pony/cover.jpg', 'assets/pony/gallery-02.jpg',
  'assets/tour/cover.jpg',
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

// Shared markup keeps IDs and policies consistent; each screen has a real HTML entry.
const template = readFileSync(join(root, 'index.html'), 'utf8');
for (const page of ['booking', 'cart', 'checkout', 'complete', 'reservations', 'ticket']) {
  const titles = { booking: '체험 예약', cart: '장바구니', checkout: '예약 내용 확인', complete: '예약 완료', reservations: '예약 조회', ticket: '티켓 상세' };
  let html = template.replace('class="shop-page"', 'data-screen="' + page + '" class="shop-page"')
    .replace(/<title>[^<]*<\/title>/, '<title>' + titles[page] + ' | 렛츠런파크</title>');
  if (page !== 'booking') html = html.replace('class="booking-stage is-visible" data-booking-step="1"', 'class="booking-stage" data-booking-step="1" hidden');
  writeFileSync(join(root, page + '.html'), html);
}
const adminTemplate = readFileSync(join(root, 'admin.html'), 'utf8');
for (const view of ['reservations', 'operations', 'settlement', 'program-edit', 'program-sessions']) {
  writeFileSync(join(root, 'admin-' + view + '.html'), adminTemplate.replace('<body', '<body data-screen="' + view + '"'));
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
