// Builds the static site into dist/ from content/site.json and content/posts/*.md.
// Usage: npm run build
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { parsePost, isValidSlug } from "../admin/js/frontmatter.js";
import { homePage, blogIndexPage, postPage, rssFeed, sitemap } from "./templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const STATIC = ["css", "js", "assets", "admin"];

async function write(rel, content) {
  const file = path.join(dist, rel);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
}

async function loadPosts() {
  const dir = path.join(root, "content", "posts");
  let files = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const posts = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    if (!isValidSlug(slug)) {
      console.warn(`Skipping ${f}: file name must be lowercase letters, numbers and dashes.`);
      continue;
    }
    const { meta, body } = parsePost(await fs.readFile(path.join(dir, f), "utf8"));
    if (!meta.title || !/^\d{4}-\d{2}-\d{2}$/.test(meta.date || "")) {
      console.warn(`Skipping ${f}: needs a title and a date (YYYY-MM-DD).`);
      continue;
    }
    const words = body.split(/\s+/).filter(Boolean).length;
    posts.push({ slug, meta, body, readMins: Math.max(1, Math.round(words / 220)) });
  }
  return posts.sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug));
}

export async function build() {
  const site = JSON.parse(await fs.readFile(path.join(root, "content", "site.json"), "utf8"));
  const posts = await loadPosts();

  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });
  for (const dir of STATIC) {
    await fs.cp(path.join(root, dir), path.join(dist, dir), { recursive: true });
  }
  // Markdown renderer and page templates for the admin's live previews.
  await fs.cp(path.join(root, "node_modules", "marked", "lib", "marked.esm.js"), path.join(dist, "admin", "vendor", "marked.esm.js"));
  await fs.cp(path.join(root, "scripts", "templates.mjs"), path.join(dist, "admin", "vendor", "templates.mjs"));

  await write(".nojekyll", "");
  await write("robots.txt", `User-agent: *\nDisallow: /admin/\nSitemap: ${site.settings.siteUrl.replace(/\/?$/, "/")}sitemap.xml\n`);
  await write("index.html", homePage(site, posts));
  await write("blog/index.html", blogIndexPage(site, posts));
  await write("blog/feed.xml", rssFeed(site, posts));
  await write("sitemap.xml", sitemap(site, posts));
  await Promise.all(
    posts.map((p, i) => write(`blog/${p.slug}/index.html`, postPage(site, p, marked.parse(p.body), posts[i - 1], posts[i + 1])))
  );

  console.log(`Built ${posts.length} post(s) into dist/`);
  return { site, posts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  build().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
