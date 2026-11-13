// Copie le site dans desktop/web et remplace Google Fonts par des polices locales,
// pour que la borne affiche les bonnes polices même sans connexion.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const web = path.join(here, 'web');
const require = createRequire(import.meta.url);

const PAGES = ['index.html', 'inscription.html', 'turbine-match.html', 'build-azito.html'];
const FONTS = [
  { pkg: '@fontsource/barlow', family: 'Barlow', weights: [400, 600] },
  { pkg: '@fontsource/barlow-condensed', family: 'Barlow Condensed', weights: [500, 700] },
];

await rm(web, { recursive: true, force: true });
await mkdir(path.join(web, 'assets', 'fonts'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(web, 'assets'), { recursive: true });

// Sur la borne, classement et inscriptions restent locaux : sans clé, aucun script n'appelle le serveur.
await writeFile(
  path.join(web, 'assets', 'js', 'config.js'),
  "// Version borne : classement et inscriptions sont enregistrés sur ce poste uniquement.\nexport const SUPABASE_URL = '';\nexport const SUPABASE_KEY = '';\n",
);

let css = '';
for (const { pkg, family, weights } of FONTS) {
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  const slug = pkg.split('/')[1];
  for (const weight of weights) {
    for (const subset of ['latin', 'latin-ext']) {
      const file = `${slug}-${subset}-${weight}-normal.woff2`;
      await cp(path.join(dir, 'files', file), path.join(web, 'assets', 'fonts', file));
      const range = subset === 'latin'
        ? 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'
        : 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
      css += `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight}; font-display: swap; src: url(../fonts/${file}) format("woff2"); unicode-range: ${range}; }\n`;
    }
  }
}
await writeFile(path.join(web, 'assets', 'css', 'fonts.css'), css);

for (const page of PAGES) {
  let html = await readFile(path.join(root, page), 'utf8');
  html = html
    .replace(/^\s*<link rel="preconnect"[^>]*>\n/gm, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="assets/css/fonts.css">');
  if (html.includes('fonts.googleapis.com')) throw new Error(`Google Fonts encore présent dans ${page}`);
  await writeFile(path.join(web, page), html);
}
for (const file of ['config.js', 'scores.js', 'inscriptions.js']) {
  const js = await readFile(path.join(web, 'assets', 'js', file), 'utf8');
  if (js.includes('supabase.co')) throw new Error(`Adresse de la base en ligne encore présente dans ${file}`);
}
console.log('Site copié dans desktop/web');
