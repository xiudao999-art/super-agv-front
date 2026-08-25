import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const pagesDir = join(root, 'assets/styles/pages');
const imagesDir = join(root, 'assets/images');
await mkdir(imagesDir, { recursive: true });

const htmlFiles = (await readdir(root)).filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const path = join(root, file);
  let html = await readFile(path, 'utf8');
  const extraStyles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
  if (extraStyles.length) {
    await appendFile(join(pagesDir, `${basename(file, '.html')}.css`), '\n' + extraStyles.map(match => match[1].trim()).join('\n') + '\n');
    html = html.replace(/<style>[\s\S]*?<\/style>/g, '');
  }

  if (file === 'robot-dispatch-dashboard.html') {
    const hooks = '<div class="agv-legacy-hooks" hidden><aside id="sidebar"></aside><div id="scrim"></div><button id="menuBtn" type="button"></button><button id="statusInfoBtn" type="button"></button><button id="statusBtn" type="button"></button><button id="alertInfoBtn" type="button"></button><button id="alertBtn" type="button"></button></div>';
    html = html.replace(/<main\s+class="shell"\s+id="overview">\s*<header\s+class="topbar">[\s\S]*?<\/header>/, `<agv-app-shell id="overview" active-route="robot-dispatch-dashboard.html" section-title="运行总览" user-name="陈工">${hooks}`);
    html = html.replace('</main>', '</agv-app-shell>');
    html = html.replace('<section class="intro">', '<agv-page-header class="intro">').replace('</section>', '</agv-page-header>');
  }
  await writeFile(path, html);
}

const cssFiles = await readdir(pagesDir);
for (const file of cssFiles.filter(file => file.endsWith('.css'))) {
  const path = join(pagesDir, file);
  let css = await readFile(path, 'utf8');
  const matches = [...css.matchAll(/data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)/g)];
  for (const match of matches) {
    const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
    const hash = createHash('sha1').update(match[2]).digest('hex').slice(0, 12);
    const imageName = `${basename(file, '.css')}-${hash}.${extension}`;
    await writeFile(join(imagesDir, imageName), Buffer.from(match[2], 'base64'));
    css = css.replace(match[0], `../../images/${imageName}`);
  }
  await writeFile(path, css);
}

console.log(`Cleaned ${htmlFiles.length} pages and externalized page image data.`);
