import { h, icon, toast, confirmDialog, sanitizeHtml } from "../ui.js";
import { slugify, isValidSlug } from "../frontmatter.js";
import { listPosts, getPost, writePost, deletePost, uploadImage, rawUrl, readMins, loadSite, MAX_UPLOAD_MB } from "../store.js";
import { previewPane } from "./content.js";
import { reportError } from "../app.js";

let markedPromise;
const loadMarked = () => (markedPromise ||= import("../../vendor/marked.esm.js").then((m) => m.marked));
let templatesPromise;
const loadTemplates = () => (templatesPromise ||= import("../../vendor/templates.mjs"));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function render(ctx, view, params, api) {
  const [mode, status, slug] = params;
  if (mode === "new") return renderEditor(ctx, view, null, api);
  if (mode === "edit" && (status === "draft" || status === "published") && isValidSlug(slug || "")) return renderEditor(ctx, view, { status, slug }, api);
  return renderList(ctx, view, api);
}

/* ======================= List ======================= */

export function draftsNotice(ctx) {
  if (ctx.drafts.private) return null;
  return h("div.notice.notice-warn",
    h("strong", "Drafts are currently public on GitHub. "),
    `Anyone browsing the repository can read them. To keep drafts private, create a private repository named "${ctx.config.draftsRepo}" and give your token access to it (see Settings).`);
}

async function renderList(ctx, view, { setActions, navigate }) {
  setActions(h("button.btn.btn-primary", { type: "button", onclick: () => navigate("#/blog/new") }, icon("plus"), "New post"));
  const [published, drafts] = await Promise.all([listPosts(ctx, "published"), listPosts(ctx, "draft")]);
  const all = [...drafts, ...published];
  let filter = "all";

  const tbody = h("tbody");
  const tabs = h("div.seg", { role: "tablist", "aria-label": "Filter posts" },
    [["all", `All (${all.length})`], ["published", `Published (${published.length})`], ["draft", `Drafts (${drafts.length})`]].map(([key, label]) =>
      h("button", { type: "button", role: "tab", class: key === filter ? "active" : "", onclick: (e) => { filter = key; tabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === e.currentTarget)); draw(); } }, label)));

  const draw = () => {
    const rows = all.filter((p) => filter === "all" || p.status === filter);
    tbody.replaceChildren(
      ...(rows.length ? rows.map((p) => h("tr",
        h("td", h("a.row-title", { href: `#/blog/edit/${p.status}/${p.slug}` }, p.meta.title || p.slug), h("div.row-sub", p.meta.excerpt || "")),
        h("td", h(`span.pill.pill-${p.status}`, p.status === "published" ? "Published" : "Draft")),
        h("td.nowrap", p.meta.date || "—"),
        h("td.actions",
          h("a.btn.btn-ghost.btn-sm", { href: `#/blog/edit/${p.status}/${p.slug}` }, "Edit"),
          p.status === "published" ? h("a.btn.btn-ghost.btn-sm", { href: `${ctx.siteUrl}blog/${p.slug}/`, target: "_blank", rel: "noopener" }, "View ↗") : null)
      )) : [h("tr", h("td.empty", { colspan: 4 }, filter === "draft" ? "No drafts. Start one with “New post”." : "No posts yet."))])
    );
  };
  draw();

  view.replaceChildren(
    draftsNotice(ctx) || "",
    h("div.panel",
      h("div.panel-head", h("h2", "Posts"), tabs),
      h("div.table-wrap", h("table.table", h("thead", h("tr", h("th", "Title"), h("th", "Status"), h("th", "Date"), h("th", h("span.sr-only", "Actions")))), tbody)))
  );
}

/* ======================= Editor ======================= */

async function renderEditor(ctx, view, ref, { setTitle, navigate, replaceHash }) {
  let post = ref ? await getPost(ctx, ref.status, ref.slug) : null;
  if (ref && !post) {
    view.replaceChildren(h("div.panel", h("h2", "Post not found"), h("p", "It may have been moved or deleted."), h("a.btn.btn-ghost", { href: "#/blog" }, "Back to posts")));
    return;
  }
  const isNew = !post;
  const state = {
    status: post?.status || "draft",
    slug: post?.slug || "",
    slug0: post?.slug, // where the file currently lives (differs from slug after a rename)
    sha: post?.sha,
    meta: { title: "", date: today(), excerpt: "", tags: [], cover: "", author: ctx.user.name || "Colletti Labs", ...(post?.meta || {}) },
    body: post?.body || "",
  };
  let slugTouched = !isNew;
  const snapshot = () => JSON.stringify({ slug: state.slug, meta: state.meta, body: state.body });
  let saved = snapshot();
  const dirty = () => snapshot() !== saved;
  let busy = false;

  setTitle(isNew ? "New post" : "Edit post");

  /* ----- Fields ----- */
  const title = h("input.title-input", { type: "text", placeholder: "Post title", value: state.meta.title, "aria-label": "Title", maxlength: 160 });
  const slugInput = h("input", { id: "slug", type: "text", value: state.slug, spellcheck: "false" });
  const slugHint = h("p.hint");
  const date = h("input", { id: "date", type: "date", value: state.meta.date });
  const excerpt = h("textarea", { id: "excerpt", rows: 3, maxlength: 300, value: state.meta.excerpt });
  const tags = h("input", { id: "tags", type: "text", value: (state.meta.tags || []).join(", "), placeholder: "AI, Startups" });
  const author = h("input", { id: "author", type: "text", value: state.meta.author });
  const cover = h("input", { id: "cover", type: "text", value: state.meta.cover, placeholder: "https://… or upload", spellcheck: "false" });
  const coverImg = h("img.cover-thumb", { alt: "" });
  const body = h("textarea.md-input", { rows: 22, value: state.body, "aria-label": "Post body (Markdown)", placeholder: "Write your post in Markdown…\n\n## A heading\n\nSome **bold** text and a [link](https://example.com)." });
  const previewBox = h("div.md-preview.prose-preview", { hidden: true });
  const wordCount = h("span.word-count");

  const imgUrl = (u) => (/^assets\//.test(u) ? rawUrl(ctx, u) : u);
  const updateCover = () => {
    coverImg.hidden = !state.meta.cover;
    if (state.meta.cover) coverImg.src = imgUrl(state.meta.cover);
  };
  const updateSlugHint = () => {
    slugHint.textContent = state.slug ? `${ctx.siteUrl}blog/${state.slug}/` : "Generated from the title.";
    slugHint.classList.toggle("bad", !!state.slug && !isValidSlug(state.slug));
  };
  const updateCount = () => {
    const words = state.body.split(/\s+/).filter(Boolean).length;
    wordCount.textContent = `${words.toLocaleString()} words · ${readMins(state.body)} min read`;
  };

  const changed = () => {
    updateSlugHint();
    updateCount();
    updateButtons();
    if (pagePreviewOpen) refreshPagePreview();
  };

  title.addEventListener("input", () => {
    state.meta.title = title.value;
    if (!slugTouched) {
      state.slug = slugify(title.value);
      slugInput.value = state.slug;
    }
    changed();
  });
  slugInput.addEventListener("input", () => {
    slugTouched = true;
    state.slug = slugInput.value.trim().toLowerCase();
    changed();
  });
  slugInput.addEventListener("blur", () => {
    state.slug = slugify(slugInput.value);
    slugInput.value = state.slug;
    changed();
  });
  date.addEventListener("input", () => { state.meta.date = date.value; changed(); });
  excerpt.addEventListener("input", () => { state.meta.excerpt = excerpt.value; changed(); });
  tags.addEventListener("input", () => { state.meta.tags = tags.value.split(",").map((t) => t.trim()).filter(Boolean); changed(); });
  author.addEventListener("input", () => { state.meta.author = author.value; changed(); });
  cover.addEventListener("input", () => { state.meta.cover = cover.value.trim(); updateCover(); changed(); });
  body.addEventListener("input", () => { state.body = body.value; changed(); });

  /* ----- Markdown toolbar ----- */
  const wrapSel = (before, after = before, placeholder = "text") => {
    const { selectionStart: s, selectionEnd: e, value } = body;
    const sel = value.slice(s, e) || placeholder;
    body.setRangeText(before + sel + after, s, e, "end");
    body.setSelectionRange(s + before.length, s + before.length + sel.length);
    body.focus();
    body.dispatchEvent(new Event("input"));
  };
  const prefixLines = (prefix) => {
    const { selectionStart: s, selectionEnd: e, value } = body;
    const start = value.lastIndexOf("\n", s - 1) + 1;
    const block = value.slice(start, e).split("\n").map((l, i) => (typeof prefix === "function" ? prefix(i) : prefix) + l).join("\n");
    body.setRangeText(block, start, e, "end");
    body.focus();
    body.dispatchEvent(new Event("input"));
  };
  const insertText = (text) => {
    body.setRangeText(text, body.selectionStart, body.selectionEnd, "end");
    body.focus();
    body.dispatchEvent(new Event("input"));
  };

  const fileInput = h("input", { type: "file", accept: "image/png,image/jpeg,image/gif,image/webp", hidden: true });
  let uploadTarget = "body";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    if (!file) return;
    toast("Uploading image…");
    try {
      const path = await uploadImage(ctx, file);
      if (uploadTarget === "cover") {
        state.meta.cover = path;
        cover.value = path;
        updateCover();
        changed();
      } else {
        insertText(`\n![${file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "")}](${path})\n`);
      }
      toast("Image uploaded.", "success");
    } catch (err) {
      reportError(err, "Upload failed");
    }
  });
  const pickImage = (target) => { uploadTarget = target; fileInput.click(); };

  const tb = (label, title, fn) => h("button.tb-btn", { type: "button", title, "aria-label": title, onclick: fn }, label);
  const writeTab = h("button.active", { type: "button", role: "tab", onclick: () => showTab("write") }, "Write");
  const previewTab = h("button", { type: "button", role: "tab", onclick: () => showTab("preview") }, "Preview");
  const toolbar = h("div.md-toolbar",
    h("div.seg.seg-sm", { role: "tablist" }, writeTab, previewTab),
    h("div.tb-group",
      tb("H2", "Heading", () => prefixLines("## ")),
      tb(h("b", "B"), "Bold", () => wrapSel("**")),
      tb(h("i", "I"), "Italic", () => wrapSel("*")),
      tb("Link", "Link", () => wrapSel("[", "](https://)", "link text")),
      tb("• List", "Bulleted list", () => prefixLines("- ")),
      tb("1. List", "Numbered list", () => prefixLines((i) => `${i + 1}. `)),
      tb("❝", "Quote", () => prefixLines("> ")),
      tb("</>", "Code", () => wrapSel("`")),
      tb(icon("image"), `Upload image (max ${MAX_UPLOAD_MB} MB)`, () => pickImage("body"))));

  async function showTab(tab) {
    const preview = tab === "preview";
    writeTab.classList.toggle("active", !preview);
    previewTab.classList.toggle("active", preview);
    body.hidden = preview;
    previewBox.hidden = !preview;
    if (preview) {
      const marked = await loadMarked();
      previewBox.innerHTML = sanitizeHtml(marked.parse(state.body || "*Nothing to preview yet.*"), imgUrl);
    }
  }

  body.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") { e.preventDefault(); wrapSel("**"); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") { e.preventDefault(); wrapSel("*"); }
  });
  const onSaveKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      state.status === "published" ? publish() : saveDraft();
    }
  };
  document.addEventListener("keydown", onSaveKey);

  /* ----- Full page preview ----- */
  const page = previewPane();
  let pagePreviewOpen = false;
  let siteData = null;
  let previewTimer;
  const refreshPagePreview = () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(async () => {
      try {
        const [t, marked] = await Promise.all([loadTemplates(), loadMarked()]);
        siteData ||= (await loadSite(ctx)).data;
        const html = sanitizeHtml(marked.parse(state.body), imgUrl);
        const p = { slug: state.slug || "preview", meta: { ...state.meta, cover: state.meta.cover && imgUrl(state.meta.cover) }, readMins: readMins(state.body) };
        // Post pages live two folders deep; the preview frame's base is the site root.
        page.show(t.postPage(siteData, p, html).replaceAll('"../../', '"'));
      } catch (err) {
        console.warn("Preview unavailable:", err);
      }
    }, 400);
  };
  const pageBtn = h("button.btn.btn-ghost", { type: "button", onclick: () => {
    pagePreviewOpen = !pagePreviewOpen;
    layout.classList.toggle("with-preview", pagePreviewOpen);
    pageBtn.replaceChildren(icon("eye"), pagePreviewOpen ? "Hide page preview" : "Page preview");
    if (pagePreviewOpen) refreshPagePreview();
  } }, icon("eye"), "Page preview");

  /* ----- Actions ----- */
  const statusPill = h("span.pill");
  const saveDraftBtn = h("button.btn.btn-ghost", { type: "button", onclick: saveDraft });
  const publishBtn = h("button.btn.btn-primary", { type: "button", onclick: publish });
  const unpublishBtn = h("button.btn.btn-ghost", { type: "button", onclick: unpublish }, "Move to drafts");
  const deleteBtn = h("button.btn.btn-danger-ghost", { type: "button", onclick: remove }, icon("trash"), "Delete");
  const liveLink = h("a.btn.btn-ghost", { target: "_blank", rel: "noopener" }, "View live ↗");

  function updateButtons() {
    const pub = state.status === "published";
    const d = dirty();
    statusPill.className = `pill pill-${state.status}`;
    statusPill.textContent = pub ? (d ? "Published · unsaved edits" : "Published") : isNew && !state.sha ? "New draft" : d ? "Draft · unsaved" : "Draft · saved";
    saveDraftBtn.hidden = pub;
    saveDraftBtn.textContent = "Save draft";
    saveDraftBtn.disabled = busy || (!d && !!state.sha);
    publishBtn.textContent = pub ? "Update live post" : "Publish";
    publishBtn.disabled = busy || (pub && !d);
    unpublishBtn.hidden = !pub;
    unpublishBtn.disabled = busy;
    deleteBtn.hidden = !state.sha;
    deleteBtn.disabled = busy;
    liveLink.hidden = !pub;
    liveLink.href = `${ctx.siteUrl}blog/${state.slug}/`;
  }

  function validate(forPublish) {
    if (!state.meta.title.trim()) return "Add a title first.";
    if (!isValidSlug(state.slug)) return "The URL slug can only contain lowercase letters, numbers and dashes.";
    if (forPublish && !/^\d{4}-\d{2}-\d{2}$/.test(state.meta.date || "")) return "Pick a publish date.";
    if (forPublish && !state.body.trim()) return "The post body is empty.";
    return null;
  }

  async function run(label, fn) {
    if (busy) return;
    busy = true;
    updateButtons();
    try {
      await fn();
    } catch (err) {
      if (err.status === 409) toast("This post changed somewhere else since you opened it. Reload to get the latest version.", "error");
      else reportError(err, `Couldn't ${label}`);
    } finally {
      busy = false;
      updateButtons();
    }
  }

  async function ensureFree(status, slug) {
    if (await getPost(ctx, status, slug)) throw new Error(`A ${status === "published" ? "published post" : "draft"} with the URL “${slug}” already exists. Change the slug.`);
  }

  // Write to `status` (moving from the current location if needed), then clean up the old file.
  async function commit(targetStatus, verb) {
    const from = state.sha ? { status: state.status, slug: state.slug0 ?? state.slug, sha: state.sha } : null;
    const moving = from && (from.status !== targetStatus || from.slug !== state.slug);
    if (!from || moving) await ensureFree(targetStatus, state.slug);
    const meta = { ...state.meta, title: state.meta.title.trim() };
    const sha = await writePost(ctx, targetStatus, state.slug, meta, state.body, moving ? undefined : state.sha, verb);
    if (moving) {
      try {
        await deletePost(ctx, from.status, from.slug, from.sha, from.status !== targetStatus ? `Move to ${targetStatus === "published" ? "published" : "drafts"}` : "Rename post");
      } catch (err) {
        toast(`Saved, but the old copy (${from.slug}) couldn't be removed: ${err.message}`, "error");
      }
    }
    Object.assign(state, { status: targetStatus, sha, slug0: state.slug });
    saved = snapshot();
    replaceHash(`#/blog/edit/${targetStatus}/${state.slug}`);
  }

  async function saveDraft() {
    const problem = validate(false);
    if (problem) return toast(problem, "error");
    await run("save", async () => {
      await commit("draft", "Save draft");
      toast(ctx.drafts.private ? "Draft saved privately." : "Draft saved.", "success");
    });
  }

  async function publish() {
    const problem = validate(true);
    if (problem) return toast(problem, "error");
    const wasPublished = state.status === "published";
    if (!wasPublished && !(await confirmDialog({ title: "Publish this post?", body: `“${state.meta.title}” will appear on the blog in about a minute.`, ok: "Publish", danger: false }))) return;
    await run("publish", async () => {
      await commit("published", wasPublished ? "Update post" : "Publish post");
      toast(wasPublished ? "Post updated. Changes go live in about a minute." : "Published! It will be live in about a minute.", "success");
    });
  }

  async function unpublish() {
    if (!(await confirmDialog({ title: "Move to drafts?", body: "The post will be removed from the public blog. You can publish it again later.", ok: "Move to drafts" }))) return;
    await run("unpublish", async () => {
      await commit("draft", "Save draft");
      toast("Moved to drafts. It will disappear from the blog in about a minute.", "success");
    });
  }

  async function remove() {
    if (!(await confirmDialog({ title: "Delete this post?", body: "This permanently removes the post. Its history stays in GitHub.", ok: "Delete" }))) return;
    await run("delete", async () => {
      await deletePost(ctx, state.status, state.slug0 ?? state.slug, state.sha);
      saved = snapshot(); // nothing left to guard
      state.sha = null;
      toast("Post deleted.", "success");
      navigate("#/blog");
    });
  }

  /* ----- Layout ----- */
  const field = (id, label, input, hint) => h("div.field", h("label", { for: id }, label), input, hint || null);
  const coverField = h("div.field",
    h("label", { for: "cover" }, "Cover image"),
    h("div.input-row", cover, h("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => pickImage("cover") }, "Upload")),
    coverImg);

  const layout = h("div.post-editor",
    h("div.post-main",
      h("a.back", { href: "#/blog" }, icon("back"), "All posts"),
      title,
      h("div.panel.md-panel", toolbar, body, previewBox, h("div.md-foot", wordCount, h("span", "Markdown supported · ⌘/Ctrl+S to save")))),
    h("aside.post-side",
      h("div.panel",
        h("div.side-status", h("span", "Status"), statusPill),
        h("div.side-actions", publishBtn, saveDraftBtn, unpublishBtn, liveLink, pageBtn),
        deleteBtn),
      h("div.panel",
        h("h3", "Details"),
        field("slug", "URL slug", slugInput, slugHint),
        field("date", "Publish date", date),
        field("excerpt", "Summary", excerpt, h("p.hint", "Shown on the blog list and in social previews.")),
        field("tags", "Tags", tags),
        field("author", "Author", author),
        coverField),
      state.status === "draft" ? draftsNotice(ctx) : null),
    page.pane,
    fileInput);

  view.replaceChildren(layout);
  updateCover();
  changed();
  if (isNew) title.focus();

  return {
    isDirty: dirty,
    destroy: () => {
      document.removeEventListener("keydown", onSaveKey);
      clearTimeout(previewTimer);
    },
  };
}
