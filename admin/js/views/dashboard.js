import { h, icon, timeAgo, fmt } from "../ui.js";
import { loadSite, listPosts } from "../store.js";
import { getGcToken, fetchStats, fetchPublicTotal, kpi } from "./stats.js";
import { draftsNotice } from "./blog.js";

export async function render(ctx, view, _params, { setActions }) {
  setActions(h("a.btn.btn-primary", { href: "#/blog/new" }, icon("plus"), "New post"));

  const [{ data: site }, published, drafts, commits, runs] = await Promise.all([
    loadSite(ctx),
    listPosts(ctx, "published"),
    listPosts(ctx, "draft"),
    ctx.gh.commits(ctx.site.owner, ctx.site.repo, { branch: ctx.site.branch, perPage: 8 }).catch(() => []),
    ctx.gh.workflowRuns(ctx.site.owner, ctx.site.repo, { branch: ctx.site.branch, perPage: 1 }).catch((err) => ({ error: err.status })),
  ]);

  const code = site.settings?.goatcounterCode;
  const visitors = h("div.kpi", h("span.kpi-label", "Visitors · 7 days"), h("strong.kpi-value", code ? "…" : "—"),
    h("span.kpi-sub", code ? "loading" : h("a", { href: "#/stats" }, "Set up stats")));
  if (code) {
    const token = getGcToken();
    (token ? fetchStats(code, token, 7).then((s) => [fmt(s.total), "last 7 days"]) : Promise.reject())
      .catch(() => fetchPublicTotal(code).then((t) => [fmt(t), "all time"]))
      .then(([v, sub]) => visitors.replaceWith(kpi(sub === "all time" ? "Visitors · all time" : "Visitors · 7 days", v, h("a", { href: "#/stats" }, "View stats →"))))
      .catch(() => visitors.replaceWith(kpi("Visitors", "—", h("a", { href: "#/settings" }, "Add GoatCounter token"))));
  }

  const run = runs?.workflow_runs?.[0];
  const deploy = run
    ? kpi("Last publish", run.status !== "completed" ? "Publishing…" : run.conclusion === "success" ? "Live ✓" : "Failed ✕",
        h("a", { href: run.html_url, target: "_blank", rel: "noopener" }, `${timeAgo(run.updated_at)} ↗`))
    : kpi("Last publish", "—", runs?.error === 403 ? "Give the token Actions: Read to see this" : "No publishes yet");
  if (run && run.status === "completed" && run.conclusion !== "success") deploy.classList.add("kpi-bad");

  const checks = [
    [ctx.drafts.private, "Private drafts repository", `Create a private repo named “${ctx.config.draftsRepo}” and add it to your token.`],
    [!!code, "Visitor stats (GoatCounter)", "Add your GoatCounter code in Settings."],
    [!!(code && getGcToken()), "Stats in this dashboard", "Add a GoatCounter API token in Settings."],
    [!!site.settings?.newsletterEndpoint, "Newsletter connected", "Paste your email provider's form URL in Settings."],
  ];
  const todo = checks.filter((c) => !c[0]);

  view.replaceChildren(
    h("div.welcome",
      h("h2", `Welcome back${ctx.user.name ? `, ${ctx.user.name.split(" ")[0]}` : ""}`),
      h("p", "Edit your site, write posts, and check how things are going.")),
    h("div.kpis",
      kpi("Published posts", fmt(published.length), h("a", { href: "#/blog" }, "Manage blog →")),
      kpi("Drafts", fmt(drafts.length), drafts[0] ? `latest: ${drafts[0].meta.title || drafts[0].slug}` : "none in progress"),
      visitors,
      deploy),
    h("div.grid-2",
      h("div.panel",
        h("h3", "Quick actions"),
        h("div.quick",
          h("a.quick-item", { href: "#/blog/new" }, icon("plus"), h("span", h("b", "Write a post"), h("small", "Start a new draft"))),
          h("a.quick-item", { href: "#/content" }, icon("eye"), h("span", h("b", "Edit site content"), h("small", "Services, products, stats, links"))),
          h("a.quick-item", { href: "#/stats" }, icon("check"), h("span", h("b", "View stats"), h("small", "Visitors, pages, signups"))),
          h("a.quick-item", { href: ctx.siteUrl, target: "_blank", rel: "noopener" }, icon("ext"), h("span", h("b", "Open live site"), h("small", ctx.siteUrl.replace(/^https:\/\//, "")))))),
      h("div.panel",
        h("h3", todo.length ? `Setup checklist · ${checks.length - todo.length}/${checks.length}` : "Setup complete"),
        h("ul.checklist", checks.map(([ok, label, help]) =>
          h(`li.${ok ? "ok" : "todo"}`, icon(ok ? "check" : "x"), h("span", h("b", label), ok ? null : h("small", help))))))),
    draftsNotice(ctx) || "",
    h("div.panel",
      h("h3", "Recent changes"),
      Array.isArray(commits) && commits.length
        ? h("ul.activity", commits.map((c) => h("li",
            h("span.activity-msg", c.commit.message.split("\n")[0]),
            h("span.activity-meta", `${c.author?.login || c.commit.author?.name || "someone"} · ${timeAgo(c.commit.author?.date)}`))))
        : h("p.muted", "No recent changes."))
  );
}
