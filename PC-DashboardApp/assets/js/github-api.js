(function () {
  "use strict";

  const API_ROOT = "https://api.github.com";

  function cleanPath(path) {
    return String(path || "")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
  }

  function decodeBase64(text) {
    const binary = atob(String(text || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  class PCGitHubClient {
    constructor(options) {
      this.owner = options.owner;
      this.repo = options.repo;
      this.branch = options.branch || "main";
      this.token = options.token;
    }

    get repoPath() {
      return `/repos/${encodeURIComponent(this.owner)}/${encodeURIComponent(this.repo)}`;
    }

    get branchRefPath() {
      return `heads/${cleanPath(this.branch)}`;
    }

    async request(path, options = {}) {
      const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers,
      };

      if (this.token) headers.Authorization = `Bearer ${this.token}`;
      if (options.body && typeof options.body !== "string") {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(options.body);
      }

      const response = await fetch(`${API_ROOT}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body,
      });

      if (response.status === 204) return null;

      const text = await response.text();
      let payload = null;
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (_) {
          payload = { message: text };
        }
      }

      if (!response.ok) {
        const message = payload?.message || `GitHub API request failed with ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    }

    async getRepository() {
      return this.request(this.repoPath);
    }

    async getRef() {
      return this.request(`${this.repoPath}/git/ref/${this.branchRefPath}`);
    }

    async getCommit(sha) {
      return this.request(`${this.repoPath}/git/commits/${encodeURIComponent(sha)}`);
    }

    async fetchFile(path, ref = this.branch) {
      const file = await this.request(
        `${this.repoPath}/contents/${cleanPath(path)}?ref=${encodeURIComponent(ref)}`
      );

      if (file.type !== "file") throw new Error(`${path} is not a file`);
      return {
        path: file.path,
        sha: file.sha,
        content: decodeBase64(file.content),
        htmlUrl: file.html_url,
      };
    }

    async createBlob(content) {
      return this.request(`${this.repoPath}/git/blobs`, {
        method: "POST",
        body: {
          content,
          encoding: "utf-8",
        },
      });
    }

    async createTree(baseTreeSha, tree) {
      return this.request(`${this.repoPath}/git/trees`, {
        method: "POST",
        body: {
          base_tree: baseTreeSha,
          tree,
        },
      });
    }

    async createCommit(message, treeSha, parentSha) {
      return this.request(`${this.repoPath}/git/commits`, {
        method: "POST",
        body: {
          message,
          tree: treeSha,
          parents: [parentSha],
        },
      });
    }

    async updateRef(sha) {
      return this.request(`${this.repoPath}/git/refs/${this.branchRefPath}`, {
        method: "PATCH",
        body: {
          sha,
          force: false,
        },
      });
    }

    async commitChanges(message, changes) {
      const ref = await this.getRef();
      const parentSha = ref.object.sha;
      const parentCommit = await this.getCommit(parentSha);
      const treeEntries = [];

      for (const change of changes) {
        if (change.content === null) {
          treeEntries.push({
            path: change.path,
            mode: "100644",
            type: "blob",
            sha: null,
          });
          continue;
        }

        const blob = await this.createBlob(change.content);
        treeEntries.push({
          path: change.path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }

      const tree = await this.createTree(parentCommit.tree.sha, treeEntries);
      const commit = await this.createCommit(message, tree.sha, parentSha);
      await this.updateRef(commit.sha);

      return {
        sha: commit.sha,
        shortSha: commit.sha.slice(0, 7),
        htmlUrl: commit.html_url,
        changedFiles: treeEntries.map((entry) => entry.path),
      };
    }
  }

  window.PCGitHubClient = PCGitHubClient;
})();
