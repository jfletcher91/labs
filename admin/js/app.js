import { CONFIG } from "./config.js";
import { GitHub } from "./github.js";
import { $, $$, h, toast, confirmDialog } from "./ui.js";
import * as dashboard from "./views/dashboard.js";
import * as content from "./views/content.js";
import * as blog from "./views/blog.js";
import * as stats from "./views/stats.js";
import * as settings from "./views/settings.js";

// Refuse to run inside a frame (clickjacking protection; GitHub Pages can't send X-Frame-Options).
if (window.top !== window.self) {
  document.body.textContent = "";
  throw new Error("Admin cannot be framed");
}

const STORE_KEY = "cl_admin_token";
const ROUTES = {
  dashboard: { title: "Dashboard", view: dashboard },
  content: { title: "Site content", view: content },
  blog: { title: "Blog", view: blog },
  stats: { title: "Stats", view: stats },
  settings: { title: "Settings", view: settings },
};

const ctx = { config: CONFIG };
let current = null; // { name, instance }

/* ---------------- Token storage ---------------- */

function loadToken() {
  try {
    const s = sessionStorage.getItem(STORE_KEY);
    if (s) return s;
    const l = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (l && l.exp > Date.now()) return l.token;
    localStorage.removeItem(STORE_KEY);
  } catch {}
  return null;
}

function saveToken(token, remember) {
  try {
    sessionStorage.setItem(STORE_KEY, token);
    if (remember) localStorage.setItem(STORE_KEY, JSON.stringify({ token, exp: Date.now() + CONFIG.rememberDays * 864e5 }));
  } catch {}
}

function clearToken() {
  try {
    sessionStorage.removeItem(STORE_KEY);
    localStorage.removeItem(STORE_KEY);
  } catch {}
}

/* ---------------- Sign in ---------------- */

// Verifies the token can write to the site repository and discovers the drafts location.
async function connect(token) {
  const gh = new GitHub(token);
  const [user, repo] = await Promise.all([gh.user(), gh.repo(CONFIG.owner, CONFIG.repo)]);
  if (!repo.permissions?.push && !repo.permissions?.admin) {
    throw new Error(`This token can read but not edit ${CONFIG.owner}/${CONFIG.repo}. Give it "Contents: Read and write".`);
  }

  let drafts = { owner: CONFIG.owner, repo: CONFIG.repo, dir: CONFIG.fallbackDraftsDir, branch: repo.default_branch, private: false };
  try {
    const d = await gh.repo(CONFIG.owner, CONFIG.draftsRepo);
    if (d.private && (d.permissions?.push || d.permissions?.admin)) {
      drafts = { owner: CONFIG.owner, repo: CONFIG.draftsRepo, dir: "drafts", branch: d.default_branch, private: true };
    }
  } catch {
    /* No private drafts repo (or no access): fall back to the site repo. */
  }

  Object.assign(ctx, {
    gh,
    user,
    site: { owner: CONFIG.owner, repo: CONFIG.repo, branch: repo.default_branch, isPrivate: repo.private },
    drafts,
    siteUrl: repo.homepage || `https://${CONFIG.owner}.github.io/${CONFIG.repo}/`,
  });
}

function showLogin(message) {
  $("#boot").hidden = true;
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#login-error").textContent = message || "";
  $("#token").value = "";
  $("#token").focus();
}

async function signOut(reason) {
  clearToken();
  stopIdleTimer();
  Object.assign(ctx, { gh: null, user: null });
  current?.instance?.destroy?.();
  current = null;
  $("#view").replaceChildren();
  showLogin(reason);
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = $("#token").value.trim();
  const btn = $("#login-form button");
  if (!token) return;
  btn.disabled = true;
  btn.textContent = "Checking…";
  $("#login-error").textContent = "";
  try {
    await connect(token);
    saveToken(token, $("#remember").checked);
    startApp();
  } catch (err) {
    $("#login-error").textContent = err.status === 401 ? "That token isn't valid (it may have expired). Create a new one and try again." : err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});

$("#sign-out").addEventListener("click", async () => {
  if (await leaveGuard()) signOut("You've signed out.");
});

/* ---------------- Idle timeout ---------------- */

let idleTimer;
const resetIdle = () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => signOut(`Signed out after ${CONFIG.idleMinutes} minutes of inactivity.`), CONFIG.idleMinutes * 60000);
};
const IDLE_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];
function startIdleTimer() {
  IDLE_EVENTS.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();
}
function stopIdleTimer() {
  clearTimeout(idleTimer);
  IDLE_EVENTS.forEach((ev) => window.removeEventListener(ev, resetIdle));
}

/* ---------------- Router ---------------- */

function parseHash() {
  const [name = "dashboard", ...params] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  return { name: ROUTES[name] ? name : "dashboard", params };
}

async function leaveGuard() {
  if (!current?.instance?.isDirty?.()) return true;
  return confirmDialog({ title: "Discard unsaved changes?", body: "You have changes that haven't been saved.", ok: "Discard" });
}

let lastHash = location.hash;
async function route() {
  if (!ctx.gh) return;
  if (current && location.hash !== lastHash && !(await leaveGuard())) {
    history.replaceState(null, "", lastHash || "#/dashboard");
    return;
  }
  lastHash = location.hash;
  const { name, params } = parseHash();
  const r = ROUTES[name];
  current?.instance?.destroy?.();

  $$(".side-nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === name));
  $("#page-title").textContent = r.title;
  $("#topbar-actions").replaceChildren();
  setMenu(false);

  const view = $("#view");
  view.replaceChildren(h("div.loading", h("span.spinner"), "Loading…"));
  const instance = {};
  current = { name, instance };
  try {
    const result = await r.view.render(ctx, view, params, {
      setTitle: (t) => ($("#page-title").textContent = t),
      setActions: (...els) => $("#topbar-actions").replaceChildren(...els),
      navigate: (hash) => {
        location.hash = hash;
      },
      // Update the address bar without re-rendering (e.g. after a post is renamed).
      replaceHash: (hash) => {
        history.replaceState(null, "", hash);
        lastHash = location.hash;
      },
    });
    if (current?.instance === instance) Object.assign(instance, result || {});
  } catch (err) {
    console.error(err);
    if (err.status === 401) return signOut("Your token expired or was revoked. Please sign in again.");
    view.replaceChildren(h("div.panel.error-panel", h("h2", "Something went wrong"), h("p", err.message), h("button.btn.btn-ghost", { onclick: route }, "Try again")));
  }
  view.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
window.addEventListener("beforeunload", (e) => {
  if (current?.instance?.isDirty?.()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ---------------- Mobile menu ---------------- */

function setMenu(open) {
  $("#menu-btn").setAttribute("aria-expanded", String(open));
  $("#sidebar").classList.toggle("open", open);
}
$("#menu-btn").addEventListener("click", () => setMenu($("#menu-btn").getAttribute("aria-expanded") !== "true"));

/* ---------------- Boot ---------------- */

function startApp() {
  $("#login").hidden = true;
  $("#boot").hidden = true;
  $("#app").hidden = false;
  $("#view-site").href = ctx.siteUrl;
  $("#who").replaceChildren(
    ctx.user.avatar_url ? h("img", { src: ctx.user.avatar_url, alt: "", width: 28, height: 28 }) : "",
    h("span", ctx.user.login)
  );
  startIdleTimer();
  if (!location.hash) history.replaceState(null, "", "#/dashboard");
  lastHash = location.hash;
  route();
}

// Login help: prefilled fine-grained token link and repo names.
$("#token-link").href =
  `https://github.com/settings/personal-access-tokens/new?name=${encodeURIComponent("Colletti Labs Admin")}` +
  `&description=${encodeURIComponent("Edit the Colletti Labs website")}&target_name=${CONFIG.owner}&expires_in=90&contents=write&actions=read`;
$$(".repo-name").forEach((el) => (el.textContent = `${CONFIG.owner}/${CONFIG.repo}`));
$$(".drafts-name").forEach((el) => (el.textContent = `${CONFIG.owner}/${CONFIG.draftsRepo}`));

(async function boot() {
  const token = loadToken();
  if (!token) return showLogin();
  try {
    await connect(token);
    startApp();
  } catch (err) {
    clearToken();
    showLogin(err.status === 401 ? "Your session expired. Please sign in again." : err.message);
  }
})();

export function reportError(err, fallback = "Something went wrong") {
  console.error(err);
  if (err?.status === 401) return signOut("Your token expired or was revoked. Please sign in again.");
  toast(err?.message || fallback, "error");
}
