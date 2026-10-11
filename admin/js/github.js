// Minimal GitHub REST client. The token lives only in memory here; app.js decides where it's persisted.

const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// UTF-8 safe base64 helpers (the Contents API speaks base64).
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}
export function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function fromBase64(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

export class GitHub {
  constructor(token) {
    this.token = token;
  }

  async request(method, path, body) {
    const res = await fetch(path.startsWith("http") ? path : API + path, {
      method,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new GitHubError(res.status, data?.message || `GitHub error ${res.status}`);
    return data;
  }

  user() {
    return this.request("GET", "/user");
  }
  repo(owner, repo) {
    return this.request("GET", `/repos/${owner}/${repo}`);
  }

  // Returns { text, sha } or null when the file doesn't exist.
  async getFile(owner, repo, path, ref) {
    try {
      const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const data = await this.request("GET", `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`);
      if (Array.isArray(data) || data.type !== "file") throw new GitHubError(400, `${path} is not a file`);
      // Files over 1 MB come back without inline content.
      const text = data.content ? fromBase64(data.content) : fromBase64((await this.request("GET", data.git_url)).content);
      return { text, sha: data.sha };
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  }

  // Returns [] when the folder doesn't exist yet.
  async listDir(owner, repo, path, ref) {
    try {
      const q = ref ? `?ref=${encodeURIComponent(ref)}` : "";
      const data = await this.request("GET", `/repos/${owner}/${repo}/contents/${encodePath(path)}${q}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      if (err.status === 404) return [];
      throw err;
    }
  }

  // contentB64 must already be base64. Pass sha when updating an existing file.
  putFile(owner, repo, path, { contentB64, message, sha, branch }) {
    return this.request("PUT", `/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
      message,
      content: contentB64,
      ...(sha ? { sha } : {}),
      ...(branch ? { branch } : {}),
    });
  }

  deleteFile(owner, repo, path, { message, sha, branch }) {
    return this.request("DELETE", `/repos/${owner}/${repo}/contents/${encodePath(path)}`, {
      message,
      sha,
      ...(branch ? { branch } : {}),
    });
  }

  commits(owner, repo, { branch, perPage = 8 } = {}) {
    const q = new URLSearchParams({ per_page: perPage, ...(branch ? { sha: branch } : {}) });
    return this.request("GET", `/repos/${owner}/${repo}/commits?${q}`);
  }

  workflowRuns(owner, repo, { branch, perPage = 5 } = {}) {
    const q = new URLSearchParams({ per_page: perPage, ...(branch ? { branch } : {}) });
    return this.request("GET", `/repos/${owner}/${repo}/actions/runs?${q}`);
  }
}
