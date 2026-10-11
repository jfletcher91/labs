// Shared by the admin (browser) and the build script (Node).
// Post files look like:
//   ---
//   title: "Hello world"
//   date: "2026-10-11"
//   tags: ["ai", "startups"]
//   ---
//   Markdown body...
// Each front-matter value is JSON, which is also valid YAML.

export const POST_FIELDS = ["title", "date", "excerpt", "tags", "cover", "author"];

export function parsePost(text) {
  const src = String(text).replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const meta = {};
  let body = src;
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    body = src.slice(m[0].length);
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i < 1) continue;
      const key = line.slice(0, i).trim();
      const raw = line.slice(i + 1).trim();
      try {
        meta[key] = JSON.parse(raw);
      } catch {
        meta[key] = raw.replace(/^['"]|['"]$/g, "");
      }
    }
  }
  if (!Array.isArray(meta.tags)) {
    meta.tags = typeof meta.tags === "string" && meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  }
  return { meta, body: body.replace(/^\n+/, "") };
}

export function serializePost(meta, body) {
  const lines = POST_FIELDS.filter((k) => meta[k] !== undefined && meta[k] !== "").map((k) => `${k}: ${JSON.stringify(meta[k])}`);
  return `---\n${lines.join("\n")}\n---\n\n${String(body).trim()}\n`;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const isValidSlug = (s) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
