const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const styles = readFileSync(resolve(__dirname, '../styles.css'), 'utf8');
const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const shopCss = styles.slice(styles.indexOf('/* Two-product storefront'));

test('storefront uses design-system colors, radii and category tags', () => {
  assert.doesNotMatch(shopCss, /#[0-9a-f]{3,8}|rgba?\(/i);
  assert.doesNotMatch(shopCss, /border-radius:[0-9.]+px/);
  assert.match(shopCss, /\.shop-page\{background:var\(--white\)!important\}/);
  assert.match(shopCss, /\.shop-page \.btn--cta\{[^}]*background:var\(--ground-500\)/);
  assert.match(shopCss, /\.product-options \.booking-slots \.chip\.is-selected\{[^}]*background:var\(--ink\)/);
  assert.equal([...html.matchAll(/class="product-badge tag--cat tag--exp"/g)].length, 2);
  assert.match(html, /styles\.css\?v=20260831-shopds2/);
});
