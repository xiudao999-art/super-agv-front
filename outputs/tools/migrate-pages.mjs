import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const pagesDir = join(root, 'assets/styles/pages');
await mkdir(pagesDir, { recursive: true });

const files = (await readdir(root)).filter(file => file.endsWith('.html')).sort();
const symbols = new Map();

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function migratePageHeader(html) {
  const start = html.search(/<section\s+class="page-head"/);
  if (start < 0) return html;
  const openEnd = html.indexOf('>', start);
  const close = html.indexOf('</section>', openEnd);
  if (close < 0) return html;
  return html.slice(0, start)
    + html.slice(start, openEnd + 1).replace(/^<section/, '<agv-page-header')
    + html.slice(openEnd + 1, close)
    + '</agv-page-header>'
    + html.slice(close + 10);
}

function migrateTabs(html) {
  let cursor = 0;
  while (true) {
    const start = html.indexOf('<div class="tabs"', cursor);
    if (start < 0) return html;
    const openEnd = html.indexOf('>', start);
    const close = html.indexOf('</div>', openEnd);
    if (close < 0) return html;
    const opening = html.slice(start, openEnd + 1).replace('<div', '<agv-tabs');
    html = html.slice(0, start) + opening + html.slice(openEnd + 1, close) + '</agv-tabs>' + html.slice(close + 6);
    cursor = start + opening.length + 11;
  }
}

for (const file of files) {
  const path = join(root, file);
  let html = await readFile(path, 'utf8');
  const pageName = basename(file, '.html');

  for (const match of html.matchAll(/<symbol\s+id="([^"]+)"[\s\S]*?<\/symbol>/g)) {
    if (!symbols.has(match[1])) symbols.set(match[1], match[0]);
  }

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (styleMatch) {
    let css = styleMatch[1].trim() + '\n';
    css = css.replace(/--ref-image:\s*url\(['"]data:image\/[\s\S]*?['"]\);/g, "--ref-image:url('../../../facility-map-clean.png');");
    await writeFile(join(pagesDir, `${pageName}.css`), css);
    html = html.replace(styleMatch[0], '');
  }

  const links = `\n  <link rel="stylesheet" href="assets/styles/pages/${pageName}.css">\n  <link rel="stylesheet" href="assets/styles/tokens.css">\n  <link rel="stylesheet" href="assets/styles/base.css">\n  <link rel="stylesheet" href="assets/styles/components.css">\n  <script type="module" src="assets/components/register.js"></script>`;
  html = html.replace(/<\/title>/, `</title>${links}`);
  html = html.replace(/\s*<svg\s+aria-hidden="true"\s+width="0"[\s\S]*?<\/svg>/, '');
  html = html.replace(/<use\s+href="#([^"\/]+)"\s*\/>/g, '<use href="assets/icons.svg#$1"/>');

  html = html.replace(/\s*<aside\s+class="sidebar"[\s\S]*?<\/aside>/, '');
  html = html.replace(/\s*<div\s+class="scrim"\s+id="scrim"[^>]*><\/div>/, '');

  const heading = stripTags(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '运行总览');
  const escapedHeading = heading.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const hooks = `<div class="agv-legacy-hooks" hidden><aside id="sidebar"></aside><div id="scrim"></div><button id="menuBtn" type="button"></button><button id="statusInfoBtn" type="button"></button><button id="statusBtn" type="button"></button><button id="alertInfoBtn" type="button"></button><button id="alertBtn" type="button"></button></div>`;
  html = html.replace(/<main\s+class="shell">\s*<header\s+class="topbar">[\s\S]*?<\/header>/, `<agv-app-shell active-route="${file}" section-title="${escapedHeading}" user-name="陈工">${hooks}`);
  html = html.replace('</main>', '</agv-app-shell>');
  html = migratePageHeader(html);
  html = migrateTabs(html);

  await writeFile(path, html);
}

const sprite = `<svg xmlns="http://www.w3.org/2000/svg"><defs>${[...symbols.values()].join('')}</defs></svg>\n`;
await writeFile(join(root, 'assets/icons.svg'), sprite);
console.log(`Migrated ${files.length} pages and collected ${symbols.size} icons.`);
