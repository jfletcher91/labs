# Colletti Labs — Landing Page

A fast, responsive, dark-futuristic landing page for **Colletti Labs**. Plain HTML/CSS/JS with no build step.

## Features
- Animated hero (interactive node network, rotating headline, animated stats)
- Services, Products, Process, and Testimonials sections with scroll-reveal animations
- Newsletter signup with validation, honeypot spam protection, and a ready-to-connect provider hook
- Social sharing: LinkedIn, X, Facebook, email, copy-link, and the native share sheet on phones
- Sticky header, mobile menu, scroll progress bar, active-section highlighting
- Accessible: skip link, keyboard focus styles, ARIA labels, `prefers-reduced-motion` support
- Open Graph / Twitter preview image (`assets/og-image.png`)

## Run locally
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Customize
| What | Where |
| --- | --- |
| Copy for services, products, testimonials, stats | `index.html` |
| Colors, fonts, spacing | CSS variables at the top of `css/styles.css` |
| Newsletter provider | `NEWSLETTER` config at the top of `js/main.js` |
| Your social profile URLs | Footer "Follow" links in `index.html` (marked `TODO`) |
| Contact email | Search for `hello@collettilabs.com` in `index.html` |

### Connect the newsletter
In `js/main.js`, set `NEWSLETTER.endpoint` to your provider's form action URL:
- **Mailchimp:** your embedded form's `action` URL, `mode: "no-cors"` (fields `EMAIL`, `FNAME` already match).
- **Kit (ConvertKit):** `https://app.kit.com/forms/FORM_ID/subscriptions`, `mode: "no-cors"`; rename inputs to `email_address` / `first_name`.
- **Formspree / Netlify Forms / your API:** the endpoint URL with `mode: "cors"`.

Until an endpoint is set, the form runs in demo mode and shows the success message without sending anything.

## Deploy
- **GitHub Pages:** Settings → Pages → deploy from branch, root folder. (`.nojekyll` is included.)
- **Netlify / Vercel:** import the repo; no build command, publish directory is the repo root.

After deploying, change the `og:image` / `twitter:image` meta tags to absolute URLs (e.g. `https://yourdomain.com/assets/og-image.png`) so link previews render on every social network.
