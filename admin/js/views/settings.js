import { h, toast } from "../ui.js";
import { renderFields } from "../form.js";
import { loadSite, saveSite } from "../store.js";
import { getGcToken, setGcToken } from "./stats.js";
import { reportError } from "../app.js";

const FIELDS = [
  { key: "title", label: "Page title (browser tab & search results)", type: "text" },
  { key: "description", label: "Site description (search results & social previews)", type: "textarea" },
  { key: "shareText", label: "Default text when visitors share the site", type: "textarea" },
  { key: "siteUrl", label: "Site address", type: "url", hint: "Change this if you move to a custom domain. Must end with /." },
  { key: "goatcounterCode", label: "GoatCounter code", type: "text", placeholder: "collettilabs", hint: "The part before .goatcounter.com. Leave blank to turn off visitor tracking." },
  { key: "newsletterEndpoint", label: "Newsletter form URL", type: "url", placeholder: "https://…", hint: "Your email provider's form action URL (Mailchimp, Kit, Formspree…). Leave blank for demo mode." },
  { key: "newsletterMode", label: "Newsletter request mode", type: "select", options: [["no-cors", "no-cors (Mailchimp, Kit)"], ["cors", "cors (Formspree, your own API)"]] },
];

export async function render(ctx, view, _params, { setActions }) {
  let { data, sha } = await loadSite(ctx);
  data.settings ||= {};
  let saved = JSON.stringify(data.settings);
  const dirty = () => JSON.stringify(data.settings) !== saved;

  const saveBtn = h("button.btn.btn-primary", { type: "button", disabled: true, onclick: save }, "Save & publish");
  setActions(saveBtn);
  const onChange = () => (saveBtn.disabled = !dirty());

  async function save() {
    const s = data.settings;
    if (s.goatcounterCode && !/^[a-z0-9-]+$/i.test(s.goatcounterCode)) return toast("The GoatCounter code can only contain letters, numbers and dashes.", "error");
    if (s.siteUrl && !/^https:\/\/.+\/$/.test(s.siteUrl)) return toast("The site address must start with https:// and end with /.", "error");
    if (s.newsletterEndpoint && !/^https:\/\//.test(s.newsletterEndpoint)) return toast("The newsletter URL must start with https://.", "error");
    saveBtn.disabled = true;
    try {
      // Re-read so edits made in "Site content" since this page opened aren't overwritten.
      const fresh = await loadSite(ctx);
      fresh.data.settings = data.settings;
      sha = await saveSite(ctx, fresh.data, fresh.sha, "Update site settings");
      data = fresh.data;
      saved = JSON.stringify(data.settings);
      toast("Settings saved. The live site will update in about a minute.", "success");
    } catch (err) {
      reportError(err, "Couldn't save settings");
      saveBtn.disabled = false;
    }
  }

  /* GoatCounter API token (device-only) */
  const gcInput = h("input", { id: "gc-token", type: "password", autocomplete: "off", spellcheck: "false", placeholder: getGcToken() ? "•••••••• (saved on this device)" : "Paste token" });
  const gcPanel = h("div.panel",
    h("h3", "GoatCounter API token"),
    h("p.muted", "Lets this dashboard show detailed stats. Create it in GoatCounter → Settings → API with only “Read statistics” checked. It's stored in this browser only, never in the repository."),
    h("div.input-row", gcInput,
      h("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => {
        const t = gcInput.value.trim();
        if (!t) return toast("Paste a token first.", "error");
        setGcToken(t);
        gcInput.value = "";
        gcInput.placeholder = "•••••••• (saved on this device)";
        toast("GoatCounter token saved on this device.", "success");
      } }, "Save"),
      h("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => {
        setGcToken("");
        gcInput.placeholder = "Paste token";
        toast("GoatCounter token removed from this device.");
      } }, "Remove")));

  const d = ctx.drafts;
  view.replaceChildren(
    h("div.settings",
      h("div.panel", h("h3", "Site settings"), h("div.panel-body", renderFields(FIELDS, data.settings, onChange))),
      gcPanel,
      h("div.panel",
        h("h3", "Draft storage"),
        d.private
          ? h("p", "✓ Drafts are saved privately in ", h("code", `${d.owner}/${d.repo}`), ". Only people with access to that repository can read them.")
          : h("div",
              h("p", "Drafts are saved in ", h("code", `${d.owner}/${d.repo}/${d.dir}`), ", which is ", h("b", "publicly readable on GitHub"), " (they never appear on the website itself)."),
              h("ol.steps",
                h("li", h("a", { href: `https://github.com/new?name=${encodeURIComponent(ctx.config.draftsRepo)}&visibility=private`, target: "_blank", rel: "noopener" }, "Create a private repository ↗"), " named ", h("code", ctx.config.draftsRepo), ". Tick “Add a README” so it isn't empty."),
                h("li", "Edit your GitHub token (", h("a", { href: "https://github.com/settings/personal-access-tokens", target: "_blank", rel: "noopener" }, "token settings ↗"), ") and add that repository under Repository access."),
                h("li", "Sign out and back in here. New drafts will then be private.")))),
      h("div.panel",
        h("h3", "Security"),
        h("ul.plain",
          h("li", "Signed in as ", h("b", ctx.user.login), ". Only GitHub accounts with write access to ", h("code", `${ctx.site.owner}/${ctx.site.repo}`), " can use this admin."),
          h("li", `You'll be signed out after ${ctx.config.idleMinutes} minutes of inactivity.`),
          h("li", "Every change is a commit in GitHub, so you can see who changed what and undo anything."),
          h("li", "Lost a device or shared a token by mistake? ", h("a", { href: "https://github.com/settings/personal-access-tokens", target: "_blank", rel: "noopener" }, "Revoke the token on GitHub ↗"), " and it stops working immediately.")))));

  return { isDirty: dirty };
}
