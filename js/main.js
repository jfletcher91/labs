/* =========================================================
   Colletti Labs — landing page interactions
   ========================================================= */

/**
 * Newsletter configuration.
 * Leave `endpoint` empty to run in demo mode (shows success without sending).
 * To go live, paste your provider's form action URL:
 *   - Mailchimp:  https://XXXX.us21.list-manage.com/subscribe/post?u=...&id=...   (mode: "no-cors")
 *   - Kit:        https://app.kit.com/forms/FORM_ID/subscriptions               (mode: "no-cors")
 *   - Formspree / Netlify / Zapier / your own API:  https://...                 (mode: "cors")
 * Field names sent: EMAIL, FNAME (rename in index.html if your provider expects others,
 * e.g. Kit uses "email_address" and "first_name").
 */
const NEWSLETTER = {
  endpoint: "",
  mode: "no-cors",
};

document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ---------- Toast ---------- */
const toastEl = $(".toast");
let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

/* ---------- Header: scrolled state + progress bar ---------- */
const header = $(".site-header");
const progress = document.createElement("div");
progress.className = "progress";
progress.setAttribute("aria-hidden", "true");
document.body.appendChild(progress);

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 20);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    ticking = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Mobile nav ---------- */
const navToggle = $(".nav-toggle");
const nav = $("#site-nav");
function setNav(open) {
  navToggle.setAttribute("aria-expanded", String(open));
  navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  nav.classList.toggle("open", open);
  document.body.classList.toggle("nav-open", open);
}
navToggle.addEventListener("click", () => setNav(navToggle.getAttribute("aria-expanded") !== "true"));
$$("a", nav).forEach((a) => a.addEventListener("click", () => setNav(false)));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setNav(false); });
window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) setNav(false); });

/* ---------- Active nav link on scroll ---------- */
const navLinks = $$('.site-nav a[href^="#"]:not(.btn)');
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
navLinks.forEach((l) => { const s = $(l.getAttribute("href")); if (s) sectionObserver.observe(s); });

/* ---------- Scroll reveal (with stagger inside grids) ---------- */
$$(".card-grid, .product-grid, .quote-grid, .timeline").forEach((group) => {
  $$(".reveal", group).forEach((el, i) => el.style.setProperty("--d", `${i * 0.08}s`));
});
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);
$$(".reveal").forEach((el) => revealObserver.observe(el));

/* ---------- Animated stat counters ---------- */
function animateCount(el) {
  const target = Number(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  if (prefersReducedMotion) { el.textContent = prefix + target + suffix; return; }
  const duration = 1600;
  const start = performance.now();
  (function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(frame);
  })(start);
}
const countObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); countObserver.unobserve(e.target); } }),
  { threshold: 0.6 }
);
$$("[data-count]").forEach((el) => countObserver.observe(el));

/* ---------- Rotating hero words ---------- */
const rotator = $("[data-rotate]");
if (rotator && !prefersReducedMotion) {
  const words = JSON.parse(rotator.dataset.rotate);
  let i = 0;
  setInterval(() => {
    i = (i + 1) % words.length;
    rotator.classList.remove("swap");
    void rotator.offsetWidth; // restart animation
    rotator.textContent = words[i];
    rotator.classList.add("swap");
  }, 2800);
}

/* ---------- Card spotlight (pointer devices only) ---------- */
if (window.matchMedia("(hover: hover)").matches) {
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ---------- Hero canvas: drifting network of nodes ---------- */
(function heroCanvas() {
  const canvas = $(".hero-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  let w, h, dpr, nodes = [], raf, running = true;
  const pointer = { x: -9999, y: -9999 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = hero.clientWidth;
    h = hero.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(90, Math.max(28, (w * h) / 16000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.6,
      hue: Math.random() < 0.5 ? "56,189,248" : "168,85,247",
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Subtle perspective grid
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    const gap = 56;
    ctx.beginPath();
    for (let x = (w % gap) / 2; x < w; x += gap) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h; y += gap) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    const linkDist = Math.min(150, w / 6);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (!prefersReducedMotion) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        // gentle repulsion from the pointer
        const dxp = a.x - pointer.x, dyp = a.y - pointer.y;
        const dp = Math.hypot(dxp, dyp);
        if (dp < 120 && dp > 0) { a.x += (dxp / dp) * 1.2; a.y += (dyp / dp) * 1.2; }
      }
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < linkDist) {
          ctx.strokeStyle = `rgba(129,140,248,${(1 - d / linkDist) * 0.28})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${a.hue},0.9)`;
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
    }
    if (running && !prefersReducedMotion) raf = requestAnimationFrame(draw);
  }

  resize();
  draw();

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); if (prefersReducedMotion) draw(); }, 150);
  });
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
  });
  hero.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });

  // Pause animation when the hero is off-screen to save battery
  new IntersectionObserver(([entry]) => {
    const visible = entry.isIntersecting;
    if (visible && !running) { running = true; if (!prefersReducedMotion) raf = requestAnimationFrame(draw); }
    else if (!visible && running) { running = false; cancelAnimationFrame(raf); }
  }).observe(hero);
})();

/* ---------- Newsletter form ---------- */
(function newsletter() {
  const form = $(".newsletter-form");
  if (!form) return;
  const email = $("#nl-email", form);
  const msg = $(".form-msg", form);
  const button = $('button[type="submit"]', form);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function show(text, type) {
    msg.textContent = text;
    msg.className = `form-msg ${type}`;
  }

  email.addEventListener("input", () => {
    if (email.getAttribute("aria-invalid") === "true" && emailRe.test(email.value.trim())) {
      email.removeAttribute("aria-invalid");
      show("", "");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.company_website.value) return; // bot caught by honeypot

    const value = email.value.trim();
    if (!emailRe.test(value)) {
      email.setAttribute("aria-invalid", "true");
      show("Please enter a valid email address.", "error");
      email.focus();
      return;
    }

    form.classList.add("loading");
    button.disabled = true;
    try {
      if (NEWSLETTER.endpoint) {
        const res = await fetch(NEWSLETTER.endpoint, {
          method: "POST",
          mode: NEWSLETTER.mode,
          body: new FormData(form),
          headers: NEWSLETTER.mode === "cors" ? { Accept: "application/json" } : undefined,
        });
        // "no-cors" responses are opaque; treat as success. Otherwise check status.
        if (NEWSLETTER.mode === "cors" && !res.ok) throw new Error(`HTTP ${res.status}`);
      } else {
        await new Promise((r) => setTimeout(r, 900)); // demo mode
      }
      const name = form.FNAME.value.trim();
      show(`You're in${name ? `, ${name}` : ""}! Watch your inbox for the next Lab Notes. 🚀`, "success");
      form.classList.add("done");
    } catch (err) {
      console.error("Newsletter signup failed:", err);
      show("Something went wrong. Please try again in a moment.", "error");
      button.disabled = false;
    } finally {
      form.classList.remove("loading");
    }
  });
})();

/* ---------- Social sharing ---------- */
(function share() {
  const url = window.location.href.split("#")[0];
  const title = "Colletti Labs — Where Startups Meet Breakthrough Technology";
  const text = "Check out Colletti Labs: strategy, product, and AI engineering for founders building the future.";
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);

  const links = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${t}%0A%0A${u}`,
  };
  $$("[data-share]").forEach((a) => { a.href = links[a.dataset.share]; });

  // Native share sheet on supported devices (most phones)
  const nativeBtn = $(".share-native");
  if (navigator.share) {
    nativeBtn.hidden = false;
    nativeBtn.addEventListener("click", () => navigator.share({ title, text, url }).catch(() => {}));
  }

  const copyBtn = $(".share-copy");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    const label = $("span", copyBtn);
    label.textContent = "Copied!";
    toast("Link copied to clipboard");
    setTimeout(() => (label.textContent = "Copy link"), 2000);
  });
})();

/* ---------- Footer year ---------- */
$(".year").textContent = new Date().getFullYear();
