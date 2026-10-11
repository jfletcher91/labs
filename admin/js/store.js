// Reading and writing site content through the GitHub API.
import { toBase64, bytesToBase64 } from "./github.js";
import { parsePost, serializePost } from "./frontmatter.js";

/* ---------- Site content (content/site.json) ---------- */

export async function loadSite(ctx) {
  const { owner, repo, branch } = ctx.site;
  const file = await ctx.gh.getFile(owner, repo, ctx.config.siteJsonPath, branch);
  if (!file) throw new Error(`${ctx.config.siteJsonPath} was not found in the repository.`);
  return { data: JSON.parse(file.text), sha: file.sha };
}

export async function saveSite(ctx, data, sha, message = "Update site content") {
  const { owner, repo, branch } = ctx.site;
  const res = await ctx.gh.putFile(owner, repo, ctx.config.siteJsonPath, {
    contentB64: toBase64(JSON.stringify(data, null, 2) + "\n"),
    message: `${message} (via admin)`,
    sha,
    branch,
  });
  return res.content.sha;
}

/* ---------- Posts ---------- */

export const readMins = (body) => Math.max(1, Math.round(String(body).split(/\s+/).filter(Boolean).length / 220));

// Locations: "published" lives in the site repo; "draft" in the private drafts repo (or fallback dir).
export function location(ctx, status) {
  return status === "published"
    ? { owner: ctx.site.owner, repo: ctx.site.repo, dir: ctx.config.postsDir, branch: ctx.site.branch }
    : ctx.drafts;
}

export async function listPosts(ctx, status) {
  const loc = location(ctx, status);
  const entries = (await ctx.gh.listDir(loc.owner, loc.repo, loc.dir, loc.branch)).filter((e) => e.type === "file" && e.name.endsWith(".md"));
  const posts = await Promise.all(
    entries.map(async (e) => {
      const file = await ctx.gh.getFile(loc.owner, loc.repo, e.path, loc.branch);
      if (!file) return null;
      const { meta, body } = parsePost(file.text);
      return { slug: e.name.replace(/\.md$/, ""), status, meta, body, sha: file.sha, readMins: readMins(body) };
    })
  );
  return posts.filter(Boolean).sort((a, b) => String(b.meta.date || "").localeCompare(String(a.meta.date || "")));
}

export async function getPost(ctx, status, slug) {
  const loc = location(ctx, status);
  const file = await ctx.gh.getFile(loc.owner, loc.repo, `${loc.dir}/${slug}.md`, loc.branch);
  if (!file) return null;
  const { meta, body } = parsePost(file.text);
  return { slug, status, meta, body, sha: file.sha, readMins: readMins(body) };
}

export async function writePost(ctx, status, slug, meta, body, sha, verb) {
  const loc = location(ctx, status);
  const res = await ctx.gh.putFile(loc.owner, loc.repo, `${loc.dir}/${slug}.md`, {
    contentB64: toBase64(serializePost(meta, body)),
    message: `${verb}: ${meta.title || slug} (via admin)`,
    sha,
    branch: loc.branch,
  });
  return res.content.sha;
}

export async function deletePost(ctx, status, slug, sha, verb = "Delete post") {
  const loc = location(ctx, status);
  await ctx.gh.deleteFile(loc.owner, loc.repo, `${loc.dir}/${slug}.md`, { message: `${verb}: ${slug} (via admin)`, sha, branch: loc.branch });
}

/* ---------- Image uploads ---------- */

const IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
export const MAX_UPLOAD_MB = 5;

// Uploads to assets/uploads/ in the site repo; returns the repo path (e.g. "assets/uploads/2026-10-photo.jpg").
// SVG is not accepted: it can carry scripts and would be served from the same origin as this admin.
export async function uploadImage(ctx, file) {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new Error("Please choose a PNG, JPG, GIF, or WebP image.");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Images must be under ${MAX_UPLOAD_MB} MB.`);
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const stamp = new Date().toISOString().slice(0, 10);
  const path = `${ctx.config.uploadsDir}/${stamp}-${base}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await ctx.gh.putFile(ctx.site.owner, ctx.site.repo, path, {
    contentB64: bytesToBase64(bytes),
    message: `Upload image ${path.split("/").pop()} (via admin)`,
    branch: ctx.site.branch,
  });
  return path;
}

// URL that shows a repo image right away (before the site republishes).
export const rawUrl = (ctx, path) => `https://raw.githubusercontent.com/${ctx.site.owner}/${ctx.site.repo}/${ctx.site.branch}/${path}`;
