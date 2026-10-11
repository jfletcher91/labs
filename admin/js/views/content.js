import { h, icon, toast, confirmDialog } from "../ui.js";
import { renderFields } from "../form.js";
import { loadSite, saveSite, listPosts } from "../store.js";
import { reportError } from "../app.js";

const ICONS = [["layers", "Layers"], ["layout", "Layout"], ["spark", "Spark / AI"], ["code", "Code"], ["leader", "Leader"], ["growth", "Growth chart"], ["rocket", "Rocket"], ["shield", "Shield"], ["cloud", "Cloud"], ["chart", "Bar chart"], ["users", "People"], ["globe", "Globe"]];

export const SECTIONS = [
  {
    key: "hero", label: "Hero (top of page)", fields: [
      { key: "eyebrow", label: "Badge text", type: "text" },
      { key: "headline", label: "Headline", type: "text" },
      { key: "rotatingWords", label: "Rotating words (after the headline)", type: "lines" },
      { key: "lead", label: "Intro paragraph", type: "textarea", rows: 4 },
      { key: "primaryCta", label: "Main button label", type: "text" },
      { key: "secondaryCta", label: "Second button label", type: "text" },
    ],
  },
  {
    key: null, label: "Stats & expertise strip", fields: [
      {
        key: "stats", label: "Stats", type: "list", itemLabel: "Stat", max: 4, min: 1,
        itemTitle: (s) => `${s.prefix || ""}${s.value}${s.suffix || ""} — ${s.label || ""}`,
        newItem: { value: 0, prefix: "", suffix: "", label: "New stat" },
        fields: [
          { key: "value", label: "Number", type: "number" },
          { key: "prefix", label: "Before number (e.g. $)", type: "text" },
          { key: "suffix", label: "After number (e.g. +, %, M+)", type: "text" },
          { key: "label", label: "Label", type: "text" },
        ],
      },
      { key: "marquee", label: "Scrolling expertise strip", type: "lines" },
    ],
  },
  {
    key: "services", label: "Services", fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "highlight", label: "Highlighted words (gradient)", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      {
        key: "items", label: "Services", type: "list", itemLabel: "Service", itemTitle: (s) => s.title,
        newItem: { icon: "spark", title: "New service", description: "", tags: [] },
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "icon", label: "Icon", type: "select", options: ICONS },
          { key: "description", label: "Description", type: "textarea" },
          { key: "tags", label: "Tags", type: "tags" },
        ],
      },
    ],
  },
  {
    key: "products", label: "Products", fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "highlight", label: "Highlighted words (gradient)", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
      {
        key: "items", label: "Products", type: "list", itemLabel: "Product", itemTitle: (p) => p.title,
        newItem: { visual: "bars", badge: "New", badgeColor: "blue", title: "New product", description: "", ctaLabel: "Learn more", ctaUrl: "#newsletter" },
        fields: [
          { key: "title", label: "Name", type: "text" },
          { key: "badge", label: "Badge", type: "text" },
          { key: "badgeColor", label: "Badge color", type: "select", options: [["blue", "Blue"], ["violet", "Violet"], ["pink", "Pink"]] },
          { key: "visual", label: "Animation", type: "select", options: [["bars", "Growing bars"], ["orbit", "Orbit"], ["stack", "Stacked cards"]] },
          { key: "description", label: "Description", type: "textarea" },
          { key: "ctaLabel", label: "Link label", type: "text" },
          { key: "ctaUrl", label: "Link URL", type: "text", hint: "A full https:// address, or #newsletter to scroll to the signup." },
        ],
      },
    ],
  },
  {
    key: "process", label: "Process", fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "highlight", label: "Highlighted words (gradient)", type: "text" },
      {
        key: "steps", label: "Steps", type: "list", itemLabel: "Step", max: 6, itemTitle: (s) => s.title,
        newItem: { title: "New step", description: "" },
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "description", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "testimonials", label: "Testimonials", fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "highlight", label: "Highlighted words (gradient)", type: "text" },
      {
        key: "items", label: "Testimonials", type: "list", itemLabel: "Testimonial", itemTitle: (t) => t.name,
        newItem: { quote: "", name: "Name", role: "Title, Company" },
        fields: [
          { key: "quote", label: "Quote", type: "textarea", rows: 4 },
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role / company", type: "text" },
        ],
      },
    ],
  },
  {
    key: "blog", label: "Blog section", fields: [
      { key: "showOnHomepage", label: "Show the latest 3 posts on the homepage", type: "checkbox" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "highlight", label: "Highlighted words (gradient)", type: "text" },
      { key: "intro", label: "Intro", type: "textarea" },
    ],
  },
  {
    key: "newsletter", label: "Newsletter signup", fields: [
      { key: "kicker", label: "Small label", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Description", type: "textarea" },
      { key: "buttonLabel", label: "Button label", type: "text" },
      { key: "fineprint", label: "Fine print", type: "text" },
      { key: "successMessage", label: "Message after signing up", type: "text" },
    ],
  },
  {
    key: null, label: "Share & closing call to action", fields: [],
    sub: [
      { key: "share", fields: [
        { key: "heading", label: "Share heading", type: "text" },
        { key: "body", label: "Share text", type: "text" },
      ] },
      { key: "cta", fields: [
        { key: "heading", label: "Closing heading", type: "text" },
        { key: "body", label: "Closing text", type: "text" },
        { key: "buttonLabel", label: "Closing button label", type: "text" },
      ] },
    ],
  },
  {
    key: "contact", label: "Contact & social links", fields: [
      { key: "email", label: "Contact email", type: "email" },
      { key: "tagline", label: "Footer tagline", type: "text" },
      { key: "linkedin", label: "LinkedIn URL", type: "url", hint: "Leave blank to hide." },
      { key: "x", label: "X (Twitter) URL", type: "url" },
      { key: "instagram", label: "Instagram URL", type: "url" },
      { key: "github", label: "GitHub URL", type: "url" },
    ],
  },
];

// Live preview: render the real homepage template inside an iframe.
let templatesPromise;
const loadTemplates = () => (templatesPromise ||= import("../../vendor/templates.mjs"));

export function previewPane() {
  const frame = h("iframe.preview-frame", { title: "Live preview" });
  const pane = h("section.preview",
    h("div.preview-bar",
      h("span", icon("eye"), " Live preview"),
      h("div.seg", { role: "group", "aria-label": "Preview size" },
        h("button.active", { type: "button", onclick: (e) => size(e, "") }, "Desktop"),
        h("button", { type: "button", onclick: (e) => size(e, "mobile") }, "Phone"))),
    h("div.preview-stage", frame));
  function size(e, cls) {
    pane.querySelectorAll(".seg button").forEach((b) => b.classList.toggle("active", b === e.currentTarget));
    pane.classList.toggle("mobile", cls === "mobile");
  }
  // Keep clicks inside the preview from navigating away; in-page links just scroll.
  frame.addEventListener("load", () => {
    const doc = frame.contentDocument;
    doc?.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      const hash = a.getAttribute("href")?.match(/#[\w-]+$/)?.[0];
      if (hash) doc.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    });
  });
  let scrollY = 0;
  return {
    pane,
    show(html) {
      scrollY = frame.contentWindow?.scrollY || 0;
      frame.srcdoc = html.replace("<head>", '<head>\n  <base href="../" />');
      frame.addEventListener("load", () => frame.contentWindow?.scrollTo(0, scrollY), { once: true });
    },
  };
}

export async function render(ctx, view, _params, { setActions }) {
  let { data, sha } = await loadSite(ctx);
  let saved = JSON.stringify(data);
  let posts = [];
  listPosts(ctx, "published").then((p) => { posts = p; refresh(); }).catch(() => {});

  const status = h("span.save-state", "All changes saved");
  const saveBtn = h("button.btn.btn-primary", { type: "button", disabled: true, onclick: save }, "Save & publish");
  const discardBtn = h("button.btn.btn-ghost", { type: "button", disabled: true, onclick: discard }, "Discard");
  setActions(status, discardBtn, saveBtn);

  const preview = previewPane();
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const t = await loadTemplates();
        preview.show(t.homePage(data, posts));
      } catch (err) {
        console.warn("Preview unavailable:", err);
      }
    }, 350);
  };

  const dirty = () => JSON.stringify(data) !== saved;
  const onChange = () => {
    const d = dirty();
    saveBtn.disabled = discardBtn.disabled = !d;
    status.textContent = d ? "Unsaved changes" : "All changes saved";
    status.classList.toggle("dirty", d);
    refresh();
  };

  const drawForm = () =>
    h("div.editor-form",
      h("p.intro", "Edit any section, check the preview, then press ", h("b", "Save & publish"), ". The live site updates about a minute later."),
      SECTIONS.map((s, i) => {
        const target = s.key ? (data[s.key] ||= {}) : data;
        const parts = s.sub ? s.sub.flatMap((sub) => renderFields(sub.fields, (data[sub.key] ||= {}), onChange)) : renderFields(s.fields, target, onChange);
        return h("details.panel.section-panel", { open: i === 0 ? "" : undefined }, h("summary", h("h2", s.label)), h("div.panel-body", parts));
      }));

  const layout = h("div.split", drawForm(), preview.pane);
  view.replaceChildren(layout);
  refresh();

  async function save() {
    saveBtn.disabled = true;
    saveBtn.textContent = "Publishing…";
    try {
      sha = await saveSite(ctx, data, sha, "Update site content");
      saved = JSON.stringify(data);
      onChange();
      toast("Saved. The live site will update in about a minute.", "success");
    } catch (err) {
      if (err.status === 409 || err.status === 422) {
        toast("The content changed somewhere else since you opened it. Reload this page to get the latest version, then re-apply your edits.", "error");
      } else reportError(err, "Couldn't save");
      saveBtn.disabled = false;
    } finally {
      saveBtn.textContent = "Save & publish";
    }
  }

  async function discard() {
    if (!(await confirmDialog({ title: "Discard changes?", body: "Your unsaved edits will be lost.", ok: "Discard" }))) return;
    data = JSON.parse(saved);
    layout.firstElementChild.replaceWith(drawForm());
    onChange();
  }

  return { isDirty: dirty, destroy: () => clearTimeout(timer) };
}
