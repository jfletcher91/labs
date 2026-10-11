// Small DOM helpers. Everything user-provided is set with textContent, never innerHTML,
// except sanitized Markdown previews (see sanitizeHtml).

export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// h("div.card#id", { onclick, attrs... }, children...)
export function h(tag, props, ...children) {
  const [, name = "div", rest = ""] = tag.match(/^([a-z0-9-]+)?(.*)$/i);
  const el = document.createElement(name);
  for (const part of rest.match(/[.#][^.#]+/g) || []) {
    if (part[0] === ".") el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (props && (typeof props !== "object" || props instanceof Node || Array.isArray(props))) {
    children.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = [el.className, v].filter(Boolean).join(" ");
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Inline SVG icon from a fixed internal set (no user input).
const ICON_PATHS = {
  plus: "M12 5v14M5 12h14",
  up: "m18 15-6-6-6 6",
  down: "m6 9 6 6 6-6",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  ext: "M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
  image: "M3 3h18v18H3z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M21 15l-5-5L5 21",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18M6 6l12 12",
  back: "M19 12H5M12 19l-7-7 7-7",
};
export function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("icon");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[name] || "");
  svg.append(path);
  return svg;
}

export function toast(message, type = "info") {
  const el = h(`div.toast.toast-${type}`, { role: type === "error" ? "alert" : "status" }, message);
  $("#toasts").append(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, type === "error" ? 6000 : 3200);
}

export function confirmDialog({ title, body, ok = "Confirm", danger = true }) {
  const dlg = $("#modal");
  $("#modal-title").textContent = title;
  $("#modal-body").textContent = body;
  const okBtn = $("#modal-ok");
  okBtn.textContent = ok;
  okBtn.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
  return new Promise((resolve) => {
    dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true });
    dlg.returnValue = "";
    dlg.showModal();
  });
}

export function timeAgo(date) {
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, sec] of units) {
    const n = Math.floor(s / sec);
    if (n >= 1) return `${n} ${u}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

export const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : String(n ?? "–"));
export const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n));

// Defense in depth for Markdown previews (the page CSP already blocks inline scripts):
// keep a safe set of tags and attributes, drop everything else.
const ALLOWED_TAGS = new Set("a abbr b blockquote br code del div em figcaption figure h1 h2 h3 h4 h5 h6 hr i img li ol p pre s span strong sub sup table tbody td th thead tr u ul".split(" "));
const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "align"]);
export function sanitizeHtml(html, rewriteUrl = (u) => u) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const DROP = new Set(["script", "style", "iframe", "object", "embed", "template", "svg", "math", "form", "noscript"]);
  const safeLink = (v) => !/^\s*(javascript|data|vbscript|file):/i.test(v);
  // Post-order: clean a node's children before deciding whether to unwrap it.
  const walk = (node) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName.toLowerCase();
      if (DROP.has(tag)) { child.remove(); continue; }
      walk(child);
      if (!ALLOWED_TAGS.has(tag)) { child.replaceWith(...child.childNodes); continue; }
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name)) child.removeAttribute(attr.name);
        else if (name === "href" || name === "src") {
          if (safeLink(attr.value)) child.setAttribute(name, rewriteUrl(attr.value.trim()));
          else child.removeAttribute(attr.name);
        }
      }
      if (tag === "a") {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
