// Build step for Vercel (runs on every deploy, see vercel.json "buildCommand").
//
// One source, two sites. The article pages in /articles are the single source of
// truth. This script derives everything cloudsecurityzero.com needs from them:
//
//   1. Every article in data/articles.json whose source_url is on the old
//      cloudsecurityzero.wordpress.com blog is a Cloud Security Zero post.
//   2. For each one it writes csz/p/<wordpress-slug>.html, a Cloud Security Zero
//      branded page served at https://cloudsecurityzero.com/YYYY/MM/DD/<slug>/
//      (the same path the WordPress blog used, so old links and rankings carry over).
//   3. The tonyfergusson.com copy of each post gets a canonical link pointing at
//      the cloudsecurityzero.com version, so Google treats that one as the original.
//   4. It writes csz/blog/index.html, csz/sitemap.xml, csz/robots.txt,
//      sitemap.xml and robots.txt (tonyfergusson.com).
//
// The repo files are only changed inside the build container; nothing here is
// committed. No dependencies: plain Node.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const CSZ = 'https://cloudsecurityzero.com';
const TF = 'https://tonyfergusson.com';
const WP = 'https://cloudsecurityzero.wordpress.com/';
const MONTHS = 'January February March April May June July August September October November December'.split(' ');

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const niceDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${MONTHS[+m - 1]} ${y}`; };

const data = JSON.parse(readFileSync('data/articles.json', 'utf8'));

// ---- 1. Which posts belong to Cloud Security Zero
const posts = data.articles
  .filter(a => (a.source_url || '').startsWith(WP))
  .map(a => {
    const path = a.source_url.slice(WP.length).replace(/\/?$/, '/');          // 2017/04/17/slug/
    const wpSlug = path.split('/').filter(Boolean).pop();
    return { ...a, path, wpSlug, cszUrl: `${CSZ}/${path}`, file: `articles/${a.slug}.html` };
  })
  .filter(p => existsSync(p.file))
  .sort((a, b) => b.date.localeCompare(a.date));

// ---- shared Cloud Security Zero chrome
const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const ICON = `<link rel="icon" type="image/svg+xml" href="/csz/favicon.svg">`;
const CSS = `*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{--fog:#FFFFFF;--paper:#F4EFE8;--ink:#222222;--night:#222222;--steel:#6B6158;--espresso:#644832;--sand:#C5B6A1;--rule:#E3DBD0}
body{font-family:"Montserrat",system-ui,sans-serif;font-size:17px;line-height:1.6;color:var(--ink);background:var(--fog)}
a{color:inherit}
a:focus-visible{outline:2px solid var(--espresso);outline-offset:3px;border-radius:2px}
.wrap{max-width:1080px;margin:0 auto;padding:0 2rem}
header{background:var(--night);color:var(--fog)}
header .wrap{display:flex;justify-content:space-between;align-items:center;padding-top:1.25rem;padding-bottom:1.25rem}
.mark{display:flex;align-items:center;gap:.75rem;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:.04em;text-transform:uppercase}
.mark img{width:30px;height:30px;display:block}
header nav{display:flex;gap:1.75rem}
header nav a{text-decoration:none;font-size:14px;opacity:.78}
header nav a:hover{opacity:1}
main{padding:clamp(3rem,7vw,5rem) 0 clamp(4rem,8vw,6rem)}
.col{max-width:720px}
h1{font-weight:700;font-size:clamp(30px,4.4vw,46px);line-height:1.1;letter-spacing:-.015em;margin-bottom:1.25rem}
.meta{color:var(--steel);font-size:15px;margin-bottom:2.5rem;padding-bottom:1.5rem;border-bottom:1px solid var(--rule)}
.body{font-size:17px;line-height:1.85;color:#3A3633}
.body p{margin-bottom:1.4rem}
.body h2,.body h3{font-weight:600;color:var(--ink);margin:2.2rem 0 .8rem;font-size:22px}
.body h3{font-size:19px}
.body a{text-underline-offset:3px;text-decoration-color:var(--espresso);text-decoration-thickness:2px}
.body ul,.body ol{margin:0 0 1.4rem 1.4rem}
.body li{margin-bottom:.5rem}
.body strong{font-weight:600;color:var(--ink)}
.body table{border-collapse:collapse;margin:0 0 1.4rem}
.body td{padding:.35rem 1.25rem .35rem 0;border-bottom:1px solid var(--rule)}
.note{margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--rule);font-size:15px;color:var(--steel)}
.note a{text-underline-offset:3px;text-decoration-color:var(--espresso);text-decoration-thickness:2px}
.back{display:inline-block;margin-bottom:2rem;font-size:15px;text-decoration:none;color:var(--steel)}
.back:hover{color:var(--ink)}
.year{font-weight:600;font-size:20px;margin:2.5rem 0 .5rem}
.list{list-style:none}
.list li{border-top:1px solid var(--rule)}
.list li:last-child{border-bottom:1px solid var(--rule)}
.list a{display:flex;justify-content:space-between;gap:1.5rem;padding:1rem 0;text-decoration:none}
.list a:hover span:first-child{text-decoration:underline;text-decoration-color:var(--espresso);text-decoration-thickness:2px;text-underline-offset:4px}
.list .d{color:var(--steel);font-size:14px;white-space:nowrap;padding-top:2px;font-variant-numeric:tabular-nums}
.lede{color:var(--steel);max-width:52ch;margin-bottom:1rem}
footer{background:var(--night);color:#A39B91;font-size:14px}
footer .wrap{display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;padding-top:1.75rem;padding-bottom:1.75rem}
footer nav{display:flex;gap:1.5rem}
footer a{text-decoration:none}
footer a:hover{color:var(--fog)}
@media(max-width:820px){.wrap{padding:0 1.25rem}header nav{display:none}}`;

const shell = ({ title, desc, canonical, jsonld, content }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:site_name" content="Cloud Security Zero">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
${ICON}
${FONT}
<style>
${CSS}
</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<header>
  <div class="wrap">
    <a class="mark" href="/" aria-label="Cloud Security Zero, home">
      <img src="/csz/mark-white.svg" alt="" width="30" height="30">
      Cloud Security Zero
    </a>
    <nav aria-label="Main">
      <a href="/#approach">Approach</a>
      <a href="/#services">What we do</a>
      <a href="/blog/">Blog</a>
      <a href="/#contact">Contact</a>
    </nav>
  </div>
</header>
<main>
  <div class="wrap">
${content}
  </div>
</main>
<footer>
  <div class="wrap">
    <span>© ${new Date().getFullYear()} Cloud Security Zero · Trust is a decision · Independent, non-profit</span>
    <nav aria-label="Elsewhere">
      <a href="${TF}/">tonyfergusson.com</a>
      <a href="https://www.linkedin.com/in/tonyfergusson/" target="_blank" rel="noopener">LinkedIn</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;

const ORG = { '@type': 'Organization', name: 'Cloud Security Zero', url: `${CSZ}/` };
const TONY = { '@type': 'Person', name: 'Tony Fergusson', url: `${TF}/`, sameAs: ['https://www.linkedin.com/in/tonyfergusson/', `${TF}/`] };

// ---- 2 + 3. Per-post pages, and canonical on the tonyfergusson.com copies
mkdirSync('csz/p', { recursive: true });
for (const p of posts) {
  let src = readFileSync(p.file, 'utf8');
  const desc = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  const bodyMatch = src.match(/<div class="article-body">([\s\S]*?)<div class="source-note">/);
  if (!bodyMatch) { console.warn(`skip ${p.slug}: no article body`); continue; }
  const body = bodyMatch[1].trim();
  const hasMan = /MAN Energy/.test(body);

  const content = `    <article class="col">
      <a class="back" href="/blog/">← All posts</a>
      <h1>${esc(p.title)}</h1>
      <p class="meta">Tony Fergusson · <time datetime="${p.date}">${niceDate(p.date)}</time>${p.format && p.format !== 'Article' ? ` · ${esc(p.format)}` : ''}</p>
      <div class="body">
        ${body}
      </div>
      <p class="note">From the Cloud Security Zero archive, first published ${niceDate(p.date)}.${hasMan ? ' MAN Energy Solutions is now Everllence.' : ''} More of Tony's writing is at <a href="${TF}/articles/">tonyfergusson.com</a>.</p>
    </article>`;
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, datePublished: p.date,
    url: p.cszUrl, mainEntityOfPage: p.cszUrl, author: TONY, publisher: ORG, description: desc.replace(/&[a-z]+;/g, ' ')
  };
  writeFileSync(`csz/p/${p.wpSlug}.html`, shell({ title: `${p.title} | Cloud Security Zero`, desc: desc.replace(/&hellip;|…/g, '…'), canonical: p.cszUrl, jsonld, content }));

  // tonyfergusson.com copy: canonical -> cloudsecurityzero.com, and point the source note there
  if (!src.includes('rel="canonical"')) {
    src = src.replace('</title>', `</title>\n<link rel="canonical" href="${p.cszUrl}">`);
  }
  src = src.split(`${WP}${p.path}`).join(p.cszUrl).split(`${WP}${p.path.replace(/\/$/, '')}`).join(p.cszUrl);
  writeFileSync(p.file, src);
}

// ---- 4a. Blog index
const byYear = {};
for (const p of posts) (byYear[p.date.slice(0, 4)] ||= []).push(p);
const yearsHtml = Object.keys(byYear).sort((a, b) => b - a).map(y => `      <h2 class="year">${y}</h2>
      <ul class="list">
${byYear[y].map(p => `        <li><a href="/${p.path}"><span>${esc(p.title)}</span><span class="d">${niceDate(p.date).replace(/ \d{4}$/, '')}</span></a></li>`).join('\n')}
      </ul>`).join('\n');
mkdirSync('csz/blog', { recursive: true });
writeFileSync('csz/blog/index.html', shell({
  title: 'Blog | Cloud Security Zero',
  desc: 'The Cloud Security Zero blog by Tony Fergusson: Zero Trust, Black Cloud and going dark, VPN, and secure cloud transformation, from 2016 onwards.',
  canonical: `${CSZ}/blog/`,
  jsonld: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Cloud Security Zero', url: `${CSZ}/blog/`, author: TONY, publisher: ORG },
  content: `    <section class="col">
      <h1>The Cloud Security Zero blog</h1>
      <p class="lede">Writing on Zero Trust, going dark and secure cloud transformation, from the blog Tony Fergusson started in 2016.</p>
      <p class="lede">Newer articles and talks are on <a href="${TF}/articles/">tonyfergusson.com</a>.</p>
${yearsHtml}
    </section>`
}));

// ---- 4b. Sitemaps and robots
const today = new Date().toISOString().slice(0, 10);
const urlset = urls => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${u}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
writeFileSync('csz/sitemap.xml', urlset([[`${CSZ}/`, today], [`${CSZ}/blog/`, today], ...posts.map(p => [p.cszUrl, p.date])]));
writeFileSync('csz/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${CSZ}/sitemap.xml\n`);

// tonyfergusson.com: home, top-level pages, and every static article page except the Cloud Security Zero ones
const idx = readFileSync('articles/index.html', 'utf8');
const staticPages = [...(idx.split('const staticPages = [')[1] || '').split('];')[0].matchAll(/'([^']+)'/g)].map(m => m[1]);
const cszSlugs = new Set(posts.map(p => p.slug));
const dateOf = Object.fromEntries(data.articles.map(a => [a.slug, a.date]));
const tfUrls = [[`${TF}/`, today], [`${TF}/articles/`, today]];
for (const f of ['speaking.html', 'gallery.html']) if (existsSync(f)) tfUrls.push([`${TF}/${f}`, null]);
for (const s of staticPages) if (!cszSlugs.has(s) && existsSync(`articles/${s}.html`)) tfUrls.push([`${TF}/articles/${s}.html`, dateOf[s] || null]);
writeFileSync('sitemap.xml', urlset(tfUrls));
writeFileSync('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${TF}/sitemap.xml\n`);

console.log(`Cloud Security Zero: ${posts.length} posts, blog index, sitemaps written. tonyfergusson.com sitemap: ${tfUrls.length} URLs.`);
