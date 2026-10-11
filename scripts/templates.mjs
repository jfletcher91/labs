// HTML templates for the public site. All dynamic text goes through esc().

export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Only allow http(s), mailto, relative and in-page links.
export const safeUrl = (u) => {
  const s = String(u ?? "").trim();
  return /^(https?:|mailto:|#|\/|\.{1,2}\/|[a-z0-9-]+(\/|\.html|$))/i.test(s) && !/^javascript:/i.test(s) ? s : "#";
};

export const formatDate = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return isNaN(d) ? esc(iso) : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
};

const ICONS = {
  layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />',
  layout: '<rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 9h18M9 21V9" />',
  spark: '<circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8" />',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />',
  leader: '<circle cx="12" cy="8" r="4" /><path d="M4 21v-1a7 7 0 0 1 14 0v1" /><path d="m19 4 2 2-2 2" />',
  growth: '<path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 6-6" /><path d="M16 8h4v4" />',
  rocket: '<path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1Z" /><path d="M12 15 9 12a22 22 0 0 1 2-4A12.9 12.9 0 0 1 22 2c0 2.7-.8 7.5-6 11a22.4 22.4 0 0 1-4 2Z" /><path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" />',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" />',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6" />',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />',
  globe: '<circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />',
};
export const ICON_NAMES = Object.keys(ICONS);

const VISUALS = {
  bars: '<div class="pv-bars"><i></i><i></i><i></i><i></i><i></i></div>',
  orbit: '<div class="pv-orbit"><i></i><i></i><i></i></div>',
  stack: '<div class="pv-stack"><i></i><i></i><i></i></div>',
};
const VISUAL_CLASS = { bars: "pv-1", orbit: "pv-2", stack: "pv-3" };
const BADGE_CLASS = { blue: "", violet: " badge-violet", pink: " badge-pink" };

const SOCIAL = {
  linkedin: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45Z"/></svg>',
  x: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" /></svg>',
  github: '<svg viewBox="0 0 24 24" class="fill" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"/></svg>',
};
const SOCIAL_LABEL = { linkedin: "LinkedIn", x: "X", instagram: "Instagram", github: "GitHub" };

const BRAND_MARK = `<svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
          <defs>
            <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#38bdf8" />
              <stop offset="1" stop-color="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M20 3 35 11.5v17L20 37 5 28.5v-17Z" fill="none" stroke="url(#bm)" stroke-width="2.5" />
          <path d="M25.5 15.5a7 7 0 1 0 0 9" fill="none" stroke="url(#bm)" stroke-width="3" stroke-linecap="round" />
        </svg>`;

const initials = (name) =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();

const heading = (text, highlight) => `${esc(text)}${highlight ? ` <span class="gradient-text">${esc(highlight)}</span>` : ""}`;

/* ---------------- Layout ---------------- */

// base: relative path back to the site root ("", "../", "../../")
export function layout({ site, base, title, description, canonical, ogImage, ogType = "website", body, home = false, rss = true }) {
  const s = site.settings;
  const root = s.siteUrl.replace(/\/?$/, "/");
  const nav = (hash) => (home ? hash : `${base}${hash}`);
  const gc = s.goatcounterCode && /^[a-z0-9-]+$/i.test(s.goatcounterCode)
    ? `\n  <script data-goatcounter="https://${esc(s.goatcounterCode)}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#05060f" />
  <link rel="canonical" href="${esc(canonical)}" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:site_name" content="Colletti Labs" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogImage || root + "assets/og-image.png")}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage || root + "assets/og-image.png")}" />
  ${rss ? `<link rel="alternate" type="application/rss+xml" title="Colletti Labs Blog" href="${esc(root)}blog/feed.xml" />` : ""}
  <link rel="icon" href="${base}assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="${base}css/styles.css" />
</head>
<body${home ? "" : ' class="subpage"'} data-share-title="${esc(s.title)}" data-share-text="${esc(s.shareText)}">
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="site-header" id="top">
    <div class="container nav-wrap">
      <a href="${home ? "#top" : `${base}index.html`}" class="brand" aria-label="Colletti Labs home">
        ${BRAND_MARK}
        <span>Colletti<b>Labs</b></span>
      </a>

      <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>

      <nav class="site-nav" id="site-nav" aria-label="Primary">
        <a href="${nav("#services")}">Services</a>
        <a href="${nav("#products")}">Products</a>
        <a href="${nav("#process")}">Process</a>
        <a href="${base}blog/index.html"${home ? "" : ' class="active"'}>Blog</a>
        <a href="${nav("#newsletter")}" class="btn btn-sm btn-primary">Join the Lab</a>
      </nav>
    </div>
  </header>

  <main id="main">
${body}
  </main>

${footer(site, base, home)}

  <div class="toast" role="status" aria-live="polite"></div>
  <script src="${base}js/main.js" defer></script>${gc}
</body>
</html>
`;
}

function footer(site, base, home) {
  const c = site.contact;
  const nav = (hash) => (home ? hash : `${base}${hash}`);
  const socials = Object.keys(SOCIAL)
    .filter((k) => c[k])
    .map((k) => `          <a href="${esc(safeUrl(c[k]))}" target="_blank" rel="noopener" aria-label="Colletti Labs on ${SOCIAL_LABEL[k]}">\n            ${SOCIAL[k]}\n          </a>`)
    .join("\n");
  return `  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <a href="${home ? "#top" : `${base}index.html`}" class="brand" aria-label="Colletti Labs home">
          <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
            <path d="M20 3 35 11.5v17L20 37 5 28.5v-17Z" fill="none" stroke="url(#bm)" stroke-width="2.5" />
            <path d="M25.5 15.5a7 7 0 1 0 0 9" fill="none" stroke="url(#bm)" stroke-width="3" stroke-linecap="round" />
          </svg>
          <span>Colletti<b>Labs</b></span>
        </a>
        <p>${esc(c.tagline)}</p>
      </div>

      <nav class="footer-links" aria-label="Footer">
        <h3>Explore</h3>
        <a href="${nav("#services")}">Services</a>
        <a href="${nav("#products")}">Products</a>
        <a href="${base}blog/index.html">Blog</a>
        <a href="${nav("#newsletter")}">Newsletter</a>
      </nav>

      <div class="footer-social">
        <h3>Follow</h3>
        <div class="social-icons">
${socials}
        </div>
        ${c.email ? `<a class="footer-email" href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ""}
      </div>
    </div>
    <div class="container footer-bottom">
      <p>© <span class="year">${new Date().getFullYear()}</span> Colletti Labs. All rights reserved.</p>
      <a href="#top" class="back-top">Back to top ↑</a>
    </div>
  </footer>`;
}

/* ---------------- Shared sections ---------------- */

function newsletterSection(site, base) {
  const n = site.newsletter;
  const s = site.settings;
  return `    <section class="section" id="newsletter" aria-labelledby="newsletter-title">
      <div class="container">
        <div class="newsletter reveal">
          <div class="newsletter-copy">
            <p class="kicker">${esc(n.kicker)}</p>
            <h2 id="newsletter-title">${esc(n.heading)}</h2>
            <p>${esc(n.body)}</p>
          </div>

          <form class="newsletter-form" novalidate data-endpoint="${esc(s.newsletterEndpoint)}" data-mode="${esc(s.newsletterMode || "no-cors")}" data-success="${esc(n.successMessage)}">
            <div class="field-row">
              <label class="sr-only" for="nl-name">First name</label>
              <input id="nl-name" name="FNAME" type="text" autocomplete="given-name" placeholder="First name" />
              <label class="sr-only" for="nl-email">Email address</label>
              <input id="nl-email" name="EMAIL" type="email" autocomplete="email" placeholder="you@startup.com" required />
              <input class="hp" type="text" name="company_website" tabindex="-1" autocomplete="off" aria-hidden="true" />
              <button type="submit" class="btn btn-primary">
                <span class="btn-label">${esc(n.buttonLabel)}</span>
                <span class="spinner" aria-hidden="true"></span>
              </button>
            </div>
            <p class="form-msg" role="status" aria-live="polite"></p>
            <p class="fineprint">${esc(n.fineprint)}</p>
          </form>
        </div>
      </div>
    </section>`;
}

function shareSection(site) {
  return `    <section class="section share-section" id="share" aria-labelledby="share-title">
      <div class="container share-inner reveal">
        <h2 id="share-title">${esc(site.share.heading)}</h2>
        <p>${esc(site.share.body)}</p>
        ${shareButtons()}
      </div>
    </section>`;
}

export function shareButtons() {
  return `<div class="share-buttons">
          <button class="share-btn share-native" type="button" hidden>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12v8h16v-8M12 3v13M7 8l5-5 5 5" /></svg>
            Share
          </button>
          <a class="share-btn" data-share="linkedin" target="_blank" rel="noopener" aria-label="Share on LinkedIn">${SOCIAL.linkedin} LinkedIn</a>
          <a class="share-btn" data-share="x" target="_blank" rel="noopener" aria-label="Share on X">${SOCIAL.x} X</a>
          <a class="share-btn" data-share="facebook" target="_blank" rel="noopener" aria-label="Share on Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="fill"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z"/></svg>
            Facebook
          </a>
          <a class="share-btn" data-share="email" aria-label="Share by email">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>
            Email
          </a>
          <button class="share-btn share-copy" type="button">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            <span>Copy link</span>
          </button>
        </div>`;
}

function postCard(post, base) {
  return `          <article class="post-card reveal">
            <a href="${base}blog/${post.slug}/index.html" class="post-card-link">
              ${post.meta.cover ? `<img class="post-card-cover" src="${esc(coverSrc(post.meta.cover, base))}" alt="" loading="lazy" />` : '<div class="post-card-cover post-card-cover-fallback" aria-hidden="true"></div>'}
              <div class="post-card-body">
                <p class="post-meta"><time datetime="${esc(post.meta.date)}">${formatDate(post.meta.date)}</time> · ${post.readMins} min read</p>
                <h3>${esc(post.meta.title)}</h3>
                <p>${esc(post.meta.excerpt)}</p>
                <span class="link-arrow">Read article</span>
              </div>
            </a>
          </article>`;
}

// Covers can be absolute URLs or repo paths like "assets/uploads/x.jpg".
export const coverSrc = (cover, base) => (/^https?:\/\//i.test(cover) ? cover : base + String(cover).replace(/^\/+/, ""));

/* ---------------- Pages ---------------- */

export function homePage(site, posts) {
  const h = site.hero;
  const base = "";
  const words = h.rotatingWords?.length ? h.rotatingWords : [""];
  const marquee = site.marquee || [];

  const body = `    <section class="hero" aria-labelledby="hero-title">
      <canvas class="hero-canvas" aria-hidden="true"></canvas>
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="container hero-inner">
        <p class="eyebrow reveal"><span class="pulse-dot"></span> ${esc(h.eyebrow)}</p>
        <h1 id="hero-title" class="reveal">
          ${esc(h.headline)}<br />
          <span class="gradient-text" data-rotate="${esc(JSON.stringify(words))}">${esc(words[0])}</span>
        </h1>
        <p class="lead reveal">${esc(h.lead)}</p>
        <div class="hero-cta reveal">
          <a href="#services" class="btn btn-primary">${esc(h.primaryCta)}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </a>
          <a href="#newsletter" class="btn btn-ghost">${esc(h.secondaryCta)}</a>
        </div>

        <ul class="stats reveal" aria-label="Colletti Labs by the numbers">
${site.stats.map((st) => `          <li><strong data-count="${Number(st.value) || 0}" data-prefix="${esc(st.prefix)}" data-suffix="${esc(st.suffix)}">${esc(st.prefix)}${Number(st.value) || 0}${esc(st.suffix)}</strong><span>${esc(st.label)}</span></li>`).join("\n")}
        </ul>
      </div>
      <a href="#services" class="scroll-cue" aria-label="Scroll to services"><span></span></a>
    </section>

    <div class="marquee" aria-label="Areas of expertise">
      <div class="marquee-track">
        ${marquee.map((m) => `<span>${esc(m)}</span>`).join("")}
        ${marquee.map((m) => `<span aria-hidden="true">${esc(m)}</span>`).join("")}
      </div>
    </div>

    <section class="section" id="services" aria-labelledby="services-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="kicker">01 — Services</p>
          <h2 id="services-title">${heading(site.services.heading, site.services.highlight)}</h2>
          <p>${esc(site.services.intro)}</p>
        </header>

        <div class="card-grid">
${site.services.items.map((sv) => `          <article class="card reveal">
            <div class="card-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONS[sv.icon] || ICONS.spark}</svg></div>
            <h3>${esc(sv.title)}</h3>
            <p>${esc(sv.description)}</p>
            <ul class="tags">${(sv.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          </article>`).join("\n")}
        </div>
      </div>
    </section>

    <section class="section section-alt" id="products" aria-labelledby="products-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="kicker">02 — Products</p>
          <h2 id="products-title">${heading(site.products.heading, site.products.highlight)}</h2>
          <p>${esc(site.products.intro)}</p>
        </header>

        <div class="product-grid">
${site.products.items.map((p) => `          <article class="product reveal">
            <div class="product-visual ${VISUAL_CLASS[p.visual] || "pv-1"}" aria-hidden="true">${VISUALS[p.visual] || VISUALS.bars}</div>
            <div class="product-body">
              <span class="badge${BADGE_CLASS[p.badgeColor] ?? ""}">${esc(p.badge)}</span>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.description)}</p>
              ${p.ctaLabel ? `<a href="${esc(safeUrl(p.ctaUrl || "#newsletter"))}" class="link-arrow">${esc(p.ctaLabel)}</a>` : ""}
            </div>
          </article>`).join("\n")}
        </div>
      </div>
    </section>

    <section class="section" id="process" aria-labelledby="process-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="kicker">03 — Process</p>
          <h2 id="process-title">${heading(site.process.heading, site.process.highlight)}</h2>
        </header>

        <ol class="timeline">
${site.process.steps.map((st, i) => `          <li class="reveal">
            <span class="step">${String(i + 1).padStart(2, "0")}</span>
            <div><h3>${esc(st.title)}</h3><p>${esc(st.description)}</p></div>
          </li>`).join("\n")}
        </ol>
      </div>
    </section>

    <section class="section section-alt" id="work" aria-labelledby="work-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="kicker">04 — Results</p>
          <h2 id="work-title">${heading(site.testimonials.heading, site.testimonials.highlight)}</h2>
        </header>

        <div class="quote-grid">
${site.testimonials.items.map((q) => `          <figure class="quote reveal">
            <blockquote>“${esc(q.quote)}”</blockquote>
            <figcaption><span class="avatar" aria-hidden="true">${esc(initials(q.name))}</span><span><strong>${esc(q.name)}</strong><br />${esc(q.role)}</span></figcaption>
          </figure>`).join("\n")}
        </div>
      </div>
    </section>
${site.blog.showOnHomepage && posts.length ? `
    <section class="section" id="blog" aria-labelledby="blog-title">
      <div class="container">
        <header class="section-head reveal">
          <p class="kicker">05 — Blog</p>
          <h2 id="blog-title">${heading(site.blog.heading, site.blog.highlight)}</h2>
          <p>${esc(site.blog.intro)}</p>
        </header>
        <div class="post-grid">
${posts.slice(0, 3).map((p) => postCard(p, base)).join("\n")}
        </div>
        <p class="center-cta reveal"><a href="blog/index.html" class="btn btn-ghost">View all posts</a></p>
      </div>
    </section>
` : ""}
${newsletterSection(site, base)}

${shareSection(site)}

    <section class="section cta-band" aria-labelledby="cta-title">
      <div class="container cta-inner reveal">
        <h2 id="cta-title">${esc(site.cta.heading)}</h2>
        <p>${esc(site.cta.body)}</p>
        <a href="mailto:${esc(site.contact.email)}?subject=${encodeURIComponent("Let's build together")}" class="btn btn-primary btn-lg">${esc(site.cta.buttonLabel)}</a>
      </div>
    </section>`;

  return layout({
    site, base, home: true, body,
    title: site.settings.title,
    description: site.settings.description,
    canonical: site.settings.siteUrl,
  });
}

export function blogIndexPage(site, posts) {
  const base = "../";
  const body = `    <section class="page-hero">
      <div class="container">
        <p class="kicker reveal">The Lab Blog</p>
        <h1 class="reveal">${heading(site.blog.heading, site.blog.highlight)}</h1>
        <p class="lead reveal">${esc(site.blog.intro)}</p>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
${posts.length ? `        <div class="post-grid">\n${posts.map((p) => postCard(p, base)).join("\n")}\n        </div>` : '        <p class="empty-state reveal">New posts are on the way. Join the newsletter to get them first.</p>'}
      </div>
    </section>
${newsletterSection(site, base)}`;
  return layout({
    site, base, body,
    title: `Blog — Colletti Labs`,
    description: site.blog.intro,
    canonical: `${site.settings.siteUrl.replace(/\/?$/, "/")}blog/`,
  });
}

export function postPage(site, post, html, prev, next) {
  const base = "../../";
  const root = site.settings.siteUrl.replace(/\/?$/, "/");
  const m = post.meta;
  const body = `    <article class="post" aria-labelledby="post-title">
      <header class="post-header container">
        <a href="../index.html" class="back-link">← All posts</a>
        <p class="post-meta"><time datetime="${esc(m.date)}">${formatDate(m.date)}</time> · ${post.readMins} min read${m.author ? ` · ${esc(m.author)}` : ""}</p>
        <h1 id="post-title">${esc(m.title)}</h1>
        ${m.excerpt ? `<p class="lead">${esc(m.excerpt)}</p>` : ""}
        ${m.tags?.length ? `<ul class="tags">${m.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </header>
      ${m.cover ? `<div class="container post-cover-wrap"><img class="post-cover" src="${esc(coverSrc(m.cover, base))}" alt="" /></div>` : ""}
      <div class="container prose">
${html}
      </div>
      <footer class="container post-footer">
        <h2>Share this post</h2>
        ${shareButtons()}
        <nav class="post-nav" aria-label="More posts">
          ${prev ? `<a href="../${prev.slug}/index.html"><span>← Newer</span>${esc(prev.meta.title)}</a>` : "<span></span>"}
          ${next ? `<a href="../${next.slug}/index.html" class="next"><span>Older →</span>${esc(next.meta.title)}</a>` : "<span></span>"}
        </nav>
      </footer>
    </article>
${newsletterSection(site, base)}`;
  return layout({
    site, base, body, ogType: "article",
    title: `${m.title} — Colletti Labs`,
    description: m.excerpt || site.settings.description,
    canonical: `${root}blog/${post.slug}/`,
    ogImage: m.cover ? (/^https?:/i.test(m.cover) ? m.cover : root + m.cover.replace(/^\/+/, "")) : undefined,
  });
}

export function rssFeed(site, posts) {
  const root = site.settings.siteUrl.replace(/\/?$/, "/");
  const x = (s) => esc(s);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Colletti Labs Blog</title>
  <link>${root}blog/</link>
  <atom:link href="${root}blog/feed.xml" rel="self" type="application/rss+xml" />
  <description>${x(site.blog.intro)}</description>
  <language>en-us</language>
${posts.slice(0, 20).map((p) => `  <item>
    <title>${x(p.meta.title)}</title>
    <link>${root}blog/${p.slug}/</link>
    <guid>${root}blog/${p.slug}/</guid>
    <pubDate>${new Date(`${p.meta.date}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${x(p.meta.excerpt)}</description>
  </item>`).join("\n")}
</channel>
</rss>
`;
}

export function sitemap(site, posts) {
  const root = site.settings.siteUrl.replace(/\/?$/, "/");
  const urls = [root, `${root}blog/`, ...posts.map((p) => `${root}blog/${p.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`;
}
