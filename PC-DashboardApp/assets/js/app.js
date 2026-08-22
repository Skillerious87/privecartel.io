(function () {
  "use strict";

  const SETTINGS_KEY = "pcDashboard.settings";
  const TOKEN_KEY = "pcDashboard.githubToken";
  const STATE_PATH = "pc-dashboard/maintenance-state.json";
  const TARGET_PATH = "index.html";

  const els = {};
  let currentState = null;
  let currentRef = null;
  let busy = false;

  function $(id) {
    return document.getElementById(id);
  }

  function cacheElements() {
    [
      "repoOwner",
      "repoName",
      "branchName",
      "githubToken",
      "rememberToken",
      "toggleToken",
      "testConnection",
      "publishMaintenance",
      "restoreSite",
      "commitResult",
      "accessState",
      "modeState",
      "shaState",
      "connectionPill",
      "activeBadge",
      "maintenanceTitle",
      "maintenanceMessage",
      "maintenanceEta",
      "brandAssetPath",
      "contactLabel",
      "contactUrl",
      "liveSiteUrl",
      "liveSiteLink",
      "previewFrame",
      "refreshPreview",
      "enableCommitMessage",
      "restoreCommitMessage",
      "changeList",
      "activityLog",
      "clearLog",
      "toastRegion",
    ].forEach((id) => {
      els[id] = $(id);
    });
  }

  function loadSettings() {
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    }
    els.repoOwner.value = settings.owner || "";
    els.repoName.value = settings.repo || "";
    els.branchName.value = settings.branch || "main";
    els.liveSiteUrl.value = settings.liveSiteUrl || "";
    els.brandAssetPath.value = settings.assetPath || "images/Emblem.png";
    localStorage.removeItem(TOKEN_KEY);
    els.githubToken.value = sessionStorage.getItem(TOKEN_KEY) || "";
    els.rememberToken.checked = Boolean(sessionStorage.getItem(TOKEN_KEY));
  }

  function saveSettings() {
    const settings = getSettings();
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        owner: settings.owner,
        repo: settings.repo,
        branch: settings.branch,
        liveSiteUrl: settings.liveSiteUrl,
        assetPath: settings.assetPath,
      })
    );

    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (!settings.token) return;
    if (els.rememberToken.checked) sessionStorage.setItem(TOKEN_KEY, settings.token);
  }

  function getSettings() {
    return {
      owner: els.repoOwner.value.trim(),
      repo: els.repoName.value.trim(),
      branch: els.branchName.value.trim() || "main",
      token: els.githubToken.value.trim(),
      liveSiteUrl: els.liveSiteUrl.value.trim(),
      assetPath: els.brandAssetPath.value.trim() || "images/Emblem.png",
    };
  }

  function getClient() {
    const settings = getSettings();
    if (!settings.owner || !settings.repo || !settings.branch || !settings.token) {
      throw new Error("Owner, repo, branch and token are required.");
    }
    return new window.PCGitHubClient(settings);
  }

  function getLanderOptions() {
    return {
      title: els.maintenanceTitle.value.trim() || "System Maintenance",
      message: els.maintenanceMessage.value.trim(),
      eta: els.maintenanceEta.value.trim() || "Back soon",
      assetPath: els.brandAssetPath.value.trim() || "images/Emblem.png",
      contactLabel: els.contactLabel.value.trim() || "Join Discord",
      contactUrl: els.contactUrl.value.trim(),
    };
  }

  function renderPreview() {
    els.previewFrame.srcdoc = window.PCMaintenance.buildMaintenanceHtml(getLanderOptions());
    updateLiveLink();
    renderChangeList();
  }

  function updateLiveLink() {
    let url;
    try {
      url = new URL(els.liveSiteUrl.value.trim());
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported URL");
    } catch {
      els.liveSiteLink.hidden = true;
      els.liveSiteLink.href = "#";
      return;
    }
    els.liveSiteLink.hidden = false;
    els.liveSiteLink.href = url.href;
  }

  function renderChangeList() {
    const active = Boolean(currentState?.active);
    const backup = active ? currentState.backupPath || "existing backup" : "pc-dashboard/backups/index-[timestamp].html";
    const changes = [
      { path: TARGET_PATH, label: active ? "Update maintenance lander" : "Replace with maintenance lander" },
      { path: STATE_PATH, label: "Write dashboard state" },
      { path: backup, label: active ? "Preserved" : "Create backup" },
    ];

    els.changeList.innerHTML = changes
      .map(
        (change) => `
          <li>
            <span>${escapeHtml(change.path)}</span>
            <strong>${escapeHtml(change.label)}</strong>
          </li>
        `
      )
      .join("");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function timestampPath() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `pc-dashboard/backups/index-${stamp}.html`;
  }

  function setBusy(value) {
    busy = value;
    document.body.classList.toggle("is-busy", value);
    [els.testConnection, els.publishMaintenance, els.restoreSite].forEach((button) => {
      button.disabled = value;
    });
  }

  function setConnection(state, label) {
    els.connectionPill.textContent = label;
    els.connectionPill.className = `status-pill ${state}`;
    els.accessState.textContent = label;
  }

  function setMode(active) {
    const label = active ? "Maintenance" : "Live";
    els.modeState.textContent = label;
    els.activeBadge.textContent = label;
    els.activeBadge.className = `mode-badge ${active ? "active" : "live"}`;
  }

  function setSha(sha) {
    els.shaState.textContent = sha ? sha.slice(0, 7) : "-";
  }

  function log(message, tone = "info") {
    const item = document.createElement("li");
    item.className = tone;
    item.innerHTML = `<time>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><span>${escapeHtml(message)}</span>`;
    els.activityLog.prepend(item);
  }

  function toast(message, tone = "info") {
    const node = document.createElement("div");
    node.className = `toast ${tone}`;
    node.textContent = message;
    els.toastRegion.appendChild(node);
    window.setTimeout(() => node.remove(), 4200);
  }

  async function readState(client) {
    try {
      const file = await client.fetchFile(STATE_PATH);
      return JSON.parse(file.content);
    } catch (error) {
      if (error.status === 404) return { active: false };
      throw error;
    }
  }

  async function refreshState() {
    const client = getClient();
    const [repo, ref] = await Promise.all([client.getRepository(), client.getRef()]);
    currentRef = ref;
    currentState = await readState(client);

    setConnection("online", repo.private ? "Connected private repo" : "Connected public repo");
    setMode(Boolean(currentState.active));
    setSha(ref.object.sha);
    renderChangeList();
    saveSettings();
    log(`Connected to ${repo.full_name}@${getSettings().branch}.`, "success");
  }

  async function testConnection() {
    if (busy) return;
    setBusy(true);
    try {
      await refreshState();
      toast("GitHub access verified.", "success");
    } catch (error) {
      setConnection("error", "Connection failed");
      log(error.message, "error");
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function publishMaintenance() {
    if (busy) return;
    if (!window.confirm("Enable maintenance mode and commit these changes to the selected branch?")) return;
    setBusy(true);
    els.commitResult.hidden = true;

    try {
      saveSettings();
      const client = getClient();
      currentState = await readState(client);
      const options = getLanderOptions();
      const maintenanceHtml = window.PCMaintenance.buildMaintenanceHtml(options);
      const hasActiveBackup = Boolean(currentState.active && currentState.backupPath);
      const backupPath = hasActiveBackup ? currentState.backupPath : timestampPath();
      const changes = [];

      if (!hasActiveBackup) {
        log("Reading current index.html for backup.");
        const currentIndex = await client.fetchFile(TARGET_PATH);
        changes.push({
          path: backupPath,
          content: currentIndex.content,
        });
      }

      const nextState = {
        active: true,
        targetPath: TARGET_PATH,
        backupPath,
        enabledAt: currentState.active ? currentState.enabledAt || new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        title: options.title,
        eta: options.eta,
        liveSiteUrl: getSettings().liveSiteUrl,
      };

      changes.push(
        {
          path: TARGET_PATH,
          content: maintenanceHtml,
        },
        {
          path: STATE_PATH,
          content: `${JSON.stringify(nextState, null, 2)}\n`,
        }
      );

      log("Creating Git objects for maintenance commit.");
      const message = els.enableCommitMessage.value.trim() || "chore(site): enable maintenance mode";
      const result = await client.commitChanges(message, changes);
      currentState = nextState;
      setMode(true);
      setSha(result.sha);
      showCommitResult("Maintenance mode published", result);
      log(`Published maintenance mode at ${result.shortSha}.`, "success");
      toast("Maintenance lander committed.", "success");
      renderChangeList();
    } catch (error) {
      log(error.message, "error");
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function restoreSite() {
    if (busy) return;
    if (!window.confirm("Restore the saved live site and commit the change to the selected branch?")) return;
    setBusy(true);
    els.commitResult.hidden = true;

    try {
      saveSettings();
      const client = getClient();
      currentState = await readState(client);
      if (!currentState.active || !currentState.backupPath) {
        throw new Error("No active maintenance backup was found.");
      }

      log(`Reading backup ${currentState.backupPath}.`);
      const backup = await client.fetchFile(currentState.backupPath);
      const nextState = {
        ...currentState,
        active: false,
        restoredAt: new Date().toISOString(),
      };

      const message = els.restoreCommitMessage.value.trim() || "chore(site): restore live site";
      const result = await client.commitChanges(message, [
        {
          path: TARGET_PATH,
          content: backup.content,
        },
        {
          path: STATE_PATH,
          content: `${JSON.stringify(nextState, null, 2)}\n`,
        },
      ]);

      currentState = nextState;
      setMode(false);
      setSha(result.sha);
      showCommitResult("Live site restored", result);
      log(`Restored live site at ${result.shortSha}.`, "success");
      toast("Live site restored.", "success");
      renderChangeList();
    } catch (error) {
      log(error.message, "error");
      toast(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function showCommitResult(title, result) {
    els.commitResult.hidden = false;
    els.commitResult.innerHTML = `
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(result.shortSha)}</span>
      <a href="${result.htmlUrl}" target="_blank" rel="noopener noreferrer">Open commit</a>
    `;
  }

  function wireEvents() {
    [
      els.repoOwner,
      els.repoName,
      els.branchName,
      els.githubToken,
      els.rememberToken,
      els.liveSiteUrl,
      els.brandAssetPath,
    ].forEach((input) => input.addEventListener("change", saveSettings));

    [
      els.maintenanceTitle,
      els.maintenanceMessage,
      els.maintenanceEta,
      els.brandAssetPath,
      els.contactLabel,
      els.contactUrl,
      els.liveSiteUrl,
    ].forEach((input) => input.addEventListener("input", renderPreview));

    els.toggleToken.addEventListener("click", () => {
      const visible = els.githubToken.type === "text";
      els.githubToken.type = visible ? "password" : "text";
      els.toggleToken.setAttribute("aria-label", visible ? "Show token" : "Hide token");
      els.toggleToken.innerHTML = visible
        ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>'
        : '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>';
    });

    els.testConnection.addEventListener("click", testConnection);
    els.publishMaintenance.addEventListener("click", publishMaintenance);
    els.restoreSite.addEventListener("click", restoreSite);
    els.refreshPreview.addEventListener("click", renderPreview);
    els.clearLog.addEventListener("click", () => {
      els.activityLog.innerHTML = "";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    cacheElements();
    loadSettings();
    wireEvents();
    renderPreview();
    renderChangeList();
    log("Dashboard ready.");
  });
})();
