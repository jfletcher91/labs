import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parsePost, serializePost, slugify, isValidSlug } from "../admin/js/frontmatter.js";
import { homePage, postPage, safeUrl, esc } from "../scripts/templates.mjs";
import { build } from "../scripts/build.mjs";

const site = JSON.parse(readFileSync(new URL("../content/site.json", import.meta.url), "utf8"));

test("post front matter round-trips", () => {
  const meta = { title: 'He said "hi": a story', date: "2026-10-11", excerpt: "Line: with colon", tags: ["AI", "Startups"], author: "Jo" };
  const text = serializePost(meta, "## Body\n\nText");
  const back = parsePost(text);
  assert.deepEqual(back.meta, { ...meta });
  assert.equal(back.body.trim(), "## Body\n\nText");
});

test("hand-written YAML-style front matter still parses", () => {
  const { meta } = parsePost("---\ntitle: Plain title\ndate: 2026-01-02\ntags: a, b\n---\nBody");
  assert.equal(meta.title, "Plain title");
  assert.equal(meta.date, "2026-01-02");
  assert.deepEqual(meta.tags, ["a", "b"]);
});

test("slugs are URL safe", () => {
  assert.equal(slugify("Héllo, World! <script>"), "hello-world-script");
  assert.ok(isValidSlug("ai-agents-2026"));
  assert.ok(!isValidSlug("../etc/passwd"));
  assert.ok(!isValidSlug("Bad Slug"));
});

test("templates escape content and block script URLs", () => {
  const evil = structuredClone(site);
  evil.hero.headline = '<script>alert(1)</script>';
  evil.services.items[0].title = '"><img src=x onerror=alert(1)>';
  evil.products.items[0].ctaUrl = "javascript:alert(1)";
  evil.contact.linkedin = "javascript:alert(1)";
  const html = homePage(evil, []);
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!/href="javascript:/i.test(html));
  assert.equal(safeUrl("https://ok.com/x"), "https://ok.com/x");
  assert.equal(safeUrl("#newsletter"), "#newsletter");
  assert.equal(safeUrl(" JavaScript:alert(1)"), "#");
  assert.equal(esc(`<a href="x">'`), "&lt;a href=&quot;x&quot;&gt;&#39;");
});

test("post page renders title escaped", () => {
  const html = postPage(site, { slug: "x", meta: { title: "<b>T</b>", date: "2026-10-11", tags: [] }, readMins: 1 }, "<p>Body</p>");
  assert.ok(html.includes("&lt;b&gt;T&lt;/b&gt;"));
  assert.ok(html.includes("<p>Body</p>"));
});

test("build produces the site and skips drafts", async () => {
  const { posts } = await build();
  for (const f of ["index.html", "blog/index.html", "blog/feed.xml", "sitemap.xml", "admin/index.html", "admin/vendor/marked.esm.js", "admin/vendor/templates.mjs"]) {
    assert.ok(existsSync(new URL(`../dist/${f}`, import.meta.url)), `${f} missing`);
  }
  for (const p of posts) assert.ok(existsSync(new URL(`../dist/blog/${p.slug}/index.html`, import.meta.url)));
  assert.ok(!existsSync(new URL("../dist/content", import.meta.url)), "content/ (and drafts) must not be published");
});
