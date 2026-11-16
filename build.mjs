import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { pages } from './src/pages.mjs';
import { controls, contours, ink } from './src/logo.mjs';

const { values } = parseArgs({ options: { 'pages-base': { type: 'string' } } });
const pagesBase = values['pages-base'];
if (pagesBase && !/^\/[a-z0-9][a-z0-9._-]*\/$/i.test(pagesBase)) {
  throw new Error('Pass the repository path with leading and trailing slashes, for example /harvard-ai-group/.');
}
const output = pagesBase ? 'docs' : 'dist';
const assets = join(output, 'assets');

await mkdir(assets, { recursive: true });
await cp('src/assets', assets, { recursive: true });
for (const file of ['site.css', 'site.js', 'sculpture.js', 'logo.mjs']) {
  await cp(`src/${file}`, join(assets, file));
}

const xy = ([x, y]) => `${x.toFixed(4)},${(-y).toFixed(4)}`;
const paths = contours.map(points => {
  const curves = points.map((_, i) => `C${controls(points, i).slice(1).map(xy).join(' ')}`);
  return `<path d="M${xy(points[0])}${curves.join('')}Z"/>`;
});
const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1.05 -1.14 2.14 2.18"`;
await writeFile(join(assets, 'mark.svg'), `${mark} fill="${ink}">${paths.join('')}</svg>`);
await writeFile(join(assets, 'mark-outline.svg'), `${mark} fill="none" stroke="#fff" stroke-width=".005">${paths.join('')}</svg>`);

for (const [route, page] of Object.entries(pages)) {
  const directory = join(output, route.slice(1));
  const html = pagesBase ? page.replace(/\b(href|src)="\/(?!\/)/g, `$1="${pagesBase}`) : page;
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), html);
}

if (pagesBase) await writeFile(join(output, '.nojekyll'), '');
console.log(`Built ${Object.keys(pages).length} pages in ${output}.`);
