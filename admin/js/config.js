// Where the admin reads and writes content.
export const CONFIG = {
  owner: "jfletcher91",
  repo: "labs",
  // Private repository for unpublished drafts (create it on GitHub to keep drafts private).
  draftsRepo: "labs-drafts",
  siteJsonPath: "content/site.json",
  postsDir: "content/posts",
  // Used only when the private drafts repository isn't available. Files here are public on GitHub.
  fallbackDraftsDir: "content/drafts",
  uploadsDir: "assets/uploads",
  // Sign out automatically after this many minutes without activity.
  idleMinutes: 30,
  rememberDays: 7,
};
