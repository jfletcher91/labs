# Colletti Labs — Website & Admin

A fast, responsive, dark-futuristic website for **Colletti Labs** with a blog and a secure admin.

- **Live site:** https://jfletcher91.github.io/labs/
- **Admin:** https://jfletcher91.github.io/labs/admin/

## How it works

```
content/site.json      ← all homepage text, links and settings (edited from the admin)
content/posts/*.md     ← published blog posts (Markdown)
scripts/build.mjs      ← turns content into static pages in dist/
admin/                 ← the admin app (plain JS, runs in your browser)
css/ js/ assets/       ← site styles, interactions, images (uploads go to assets/uploads/)
```

Every save in the admin is a commit to this repository. GitHub Actions rebuilds and republishes the site
automatically (about a minute), so there's no server or database to maintain.

## Using the admin

1. **Create a GitHub token (once):** GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*.
   - Repository access: *Only select repositories* → `jfletcher91/labs` (and `jfletcher91/labs-drafts`, see below).
   - Permissions: **Contents: Read and write**. Optional: **Actions: Read-only** (shows publish status on the dashboard).
   - Expiration: 90 days is a good default.
2. Open `/admin/`, paste the token, sign in.

What you can do:

| Section | What it does |
|---|---|
| **Dashboard** | Post and draft counts, visitors, publish status, recent changes, setup checklist |
| **Site content** | Edit every homepage section (hero, stats, services, products, process, testimonials, newsletter, links) with a live desktop/phone preview |
| **Blog** | Write posts in Markdown with a toolbar, image uploads, preview, drafts, publish/unpublish, rename, delete |
| **Stats** | Visitors per day, top pages, referrers, countries, devices, newsletter signups and shares (GoatCounter) |
| **Settings** | SEO title/description, share text, GoatCounter, newsletter provider URL, draft storage, security info |

### Keep drafts private (recommended)
This repository is public, so drafts saved here could be read on GitHub. Create a **private** repository named
`labs-drafts` (tick *Add a README*), add it to your token, and sign in again. The admin then stores drafts there
automatically and only copies a post into this repository when you publish it.

### Turn on visitor stats
1. Create a free account at [goatcounter.com](https://www.goatcounter.com/signup) and choose a code (e.g. `collettilabs`).
2. Admin → Settings → **GoatCounter code** → Save & publish.
3. For charts inside the admin: GoatCounter → Settings → API → create a token with only *Read statistics*, then paste it in Admin → Settings.
   If the browser can't reach the GoatCounter API, the admin falls back to the all-time count and links to your GoatCounter dashboard.

### Connect the newsletter
Admin → Settings → **Newsletter form URL**:
- **Mailchimp:** your embedded form's `action` URL, mode `no-cors`.
- **Kit (ConvertKit):** `https://app.kit.com/forms/FORM_ID/subscriptions`, mode `no-cors` (Kit expects fields `email_address`/`first_name`; rename the inputs in `scripts/templates.mjs`).
- **Formspree / your own API:** the endpoint URL with mode `cors`.

## Security

- **Who can sign in:** only GitHub accounts whose token can **write** to this repository. Read-only tokens are rejected.
- **Where the token lives:** in this browser only (cleared when the tab closes, or kept up to 7 days if you choose "Keep me signed in"). It is sent only to `api.github.com`.
- **Automatic sign-out** after 30 minutes of inactivity.
- **Strict Content Security Policy:** the admin runs only its own scripts, talks only to GitHub and GoatCounter, refuses to be framed, and is hidden from search engines.
- **Safe content:** all text is escaped when pages are built; Markdown previews are sanitized; SVG uploads are blocked.
- **Full history:** every change is a Git commit, so you can see who changed what and revert anything.
- **Lost a device?** Revoke the token at GitHub → Settings → Fine-grained tokens. It stops working immediately.

## Develop locally

```bash
npm install
npm test            # unit tests + a full build
npm run serve       # build, then open http://localhost:8000 (admin at /admin/)
```

## Deploy

`.github/workflows/deploy-pages.yml` tests, builds and publishes `dist/` to GitHub Pages on every push.
One-time setup: make the repo public (or use a paid plan), then Settings → Pages → Source: **GitHub Actions**.

If you move to a custom domain, update **Site address** in Admin → Settings.
