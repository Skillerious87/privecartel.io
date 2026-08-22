/*  assets/script.js
    ───────────────────────────────────────────────────────────
    • Auto-update © year in footer
    • Smooth in-page scrolling (fixed-nav offset)
    • External-link safety attributes
    • Legacy mobile drawer support
    • Navbar shadow fallback after 60 px
    • “Back-to-top” button (>400 px)
    • Reading-progress bar
    • Reveal-on-scroll animation (class="reveal")
    • Prefetch internal pages on hover/focus
    • Skip link and image loading defaults
*/

const scriptSrc = document.currentScript?.src || document.baseURI;
const siteRoot = new URL("../", scriptSrc);
const siteLink = (path) => new URL(path, siteRoot).href;
const canonicalOrigin = "https://www.privecartel.com";

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
  const year = new Date().getFullYear();
  installSkipLink();
  enhanceMetadata();
  optimizeImages();
  hideDecorativeIcons();

  /* ───── 1. © year ───── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = year;
  enhanceFooter(year);
  installRecruitmentBanner();
  installApiWidget();

  document.querySelectorAll('a[target="_blank"]').forEach((link) => {
    const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    link.setAttribute("rel", [...rel].join(" "));
  });

  /* ───── 2. Smooth in-page scrolling ───── */
  const navH =
    parseInt(
      getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
      10
    ) || 72;

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - navH - 20;
    window.scrollTo({ top: y, behavior: scrollBehavior });
    if (location.hash !== `#${id}`) history.pushState(null, "", `#${id}`);
  });

  /* ───── 3. Scroll UI (one animation-frame update for all effects) ───── */
  const nav = document.querySelector(".navbar");
  const backBtn = document.getElementById("backTop") || document.createElement("button");
  backBtn.id = "backTop";
  backBtn.type = "button";
  backBtn.title = "Back to top";
  backBtn.setAttribute("aria-label", "Back to top");
  if (!backBtn.innerHTML.trim()) {
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  }
  if (!backBtn.isConnected) document.body.appendChild(backBtn);
  backBtn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: scrollBehavior })
  );

  const bar = document.getElementById("readBar") || document.createElement("div");
  bar.id = "readBar";
  if (!bar.isConnected) document.body.appendChild(bar);

  let scrollFrame = 0;
  function updateScrollUI() {
    const scrollY = window.scrollY;
    nav?.classList.toggle("nav-shadow", scrollY > 60);
    backBtn.classList.toggle("show", scrollY > 400);
    const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    bar.style.transform = `scaleX(${progress})`;
    scrollFrame = 0;
  }

  const requestScrollUIUpdate = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateScrollUI);
  };
  updateScrollUI();
  window.addEventListener("scroll", requestScrollUIUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUIUpdate, { passive: true });

  /* ───── 7. Reveal-on-scroll (class="reveal") ───── */
  if (!document.body.classList.contains("recruitment-page")) {
    document.querySelectorAll([
      ".card",
      ".guide-card",
      ".service-card",
      ".snapshot-card",
      ".profile-card",
      ".wallpaper-card",
      ".rules-card",
      ".stat",
      ".feature-card",
      ".feat-card",
      ".mini-card",
      ".cardlet",
      ".metric",
      ".chat-policy",
      ".council-member",
      ".member-card",
      ".accordion",
      ".council-list > li",
      ".home-finale-shell",
      ".tenet-grid > li",
      ".benefit-grid > li",
      ".legacy-timeline > li",
      ".application-panel",
      ".contact-panel",
      ".readiness-panel",
      ".guide-panel",
      ".guide-article > .panel",
      ".guide > .panel"
    ].join(",")).forEach((el) => el.classList.add("reveal"));
  }

  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("in"));
    } else {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -4%" }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ───── 8. Prefetch internal pages ───── */
  const prefetchedPages = new Set();
  const prefetchPage = (event) => {
    const anchor = event.target.closest?.('a[href]:not([target])');
    if (!anchor || navigator.connection?.saveData) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin || !url.pathname.endsWith(".html")) return;
    url.hash = "";
    const href = url.href;
    if (prefetchedPages.has(href)) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = href;
    document.head.appendChild(link);
    prefetchedPages.add(href);
  };
  document.addEventListener("pointerover", prefetchPage, { passive: true });
  document.addEventListener("focusin", prefetchPage);

  /* ───── 9. Service worker intentionally omitted until sw.js exists. ───── */

  function installSkipLink() {
    const main = document.querySelector("main") || document.querySelector(".rules-block");
    if (main && !main.id) main.id = "main-content";
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.tabIndex = -1;

    let skip = document.querySelector(".skip-link");
    if (!skip) {
      skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = `#${main.id}`;
      skip.textContent = "Skip to content";
      document.body.insertBefore(skip, document.body.firstChild);
    }

    skip.addEventListener("click", () => {
      window.setTimeout(() => main.focus({ preventScroll: true }), 0);
    });
  }

  function optimizeImages() {
    document.querySelectorAll("img").forEach((img) => {
      if (!img.hasAttribute("decoding")) img.decoding = "async";
      const isPriorityImage = Boolean(img.closest(".hero, .rules-hero, .article-hero, .carousel-slide.active"));
      if (isPriorityImage) {
        if (!img.hasAttribute("loading")) img.loading = "eager";
        if ("fetchPriority" in img && !img.hasAttribute("fetchpriority")) {
          img.fetchPriority = "high";
        }
      } else if (!img.hasAttribute("loading")) {
        img.loading = "lazy";
      }
    });
  }

  function hideDecorativeIcons() {
    document.querySelectorAll('i[class*="fa-"]').forEach((icon) => {
      if (!icon.hasAttribute("aria-hidden")) icon.setAttribute("aria-hidden", "true");
    });
  }

  function enhanceMetadata() {
    const title = document.title || "Privé Cartel";
    const description =
      document.querySelector('meta[name="description"]')?.content ||
      "Official hub for Privé Cartel faction members.";
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    if (!canonical.getAttribute("href")) {
      const canonicalPath = location.pathname.endsWith("/index.html")
        ? "/"
        : location.pathname;
      canonical.href = new URL(canonicalPath, canonicalOrigin).href;
    }

    const pageUrl = canonical.href;
    const imageUrl = new URL("images/Emblem.png", canonicalOrigin).href;

    if (!document.querySelector('link[rel="manifest"]')) {
      const manifest = document.createElement("link");
      manifest.rel = "manifest";
      manifest.href = siteLink("manifest.json");
      document.head.appendChild(manifest);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const touchIcon = document.createElement("link");
      touchIcon.rel = "apple-touch-icon";
      touchIcon.href = siteLink("assets/icon-192.png");
      document.head.appendChild(touchIcon);
    }

    setMeta("property", "og:site_name", "Privé Cartel");
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", pageUrl);
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
  }

  function setMeta(attr, key, content) {
    let meta = document.querySelector(`meta[${attr}="${key}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attr, key);
      document.head.appendChild(meta);
    }
    if (!meta.content) meta.content = content;
  }

  function enhanceFooter(currentYear) {
    const footer = document.querySelector("body > footer");
    if (!footer || footer.dataset.enhanced === "true") return;

    footer.classList.add("site-footer");
    footer.dataset.enhanced = "true";
    footer.innerHTML = `
      <div class="footer-shell">
        <div class="footer-kicker">
          <span>Faction HQ</span>
          <span>OC 2.0 coordination • Chain rewards • Member support</span>
        </div>

        <div class="footer-main">
          <section class="footer-brand" aria-label="Privé Cartel">
            <a class="footer-logo" href="${siteLink("index.html")}">
              <img src="${siteLink("images/emblem-512.webp")}" alt="" loading="lazy" width="512" height="512">
              <span><strong>PRIVÉ</strong> CARTEL</span>
            </a>
            <p>Discreet operations hub for Torn members who value presence, discipline and mutual aid.</p>
            <ul class="footer-values" aria-label="Faction values">
              <li>Presence</li>
              <li>Discretion</li>
              <li>Mutual Aid</li>
            </ul>
          </section>

          <nav class="footer-column" aria-label="Main pages">
            <h2>Navigate</h2>
            <a href="${siteLink("index.html")}">Home</a>
            <a href="${siteLink("rules.html")}">Rules</a>
            <a href="${siteLink("guides.html")}">Guides</a>
            <a href="${siteLink("news.html")}">News</a>
          </nav>

          <nav class="footer-column" aria-label="Member resources">
            <h2>Resources</h2>
            <a href="${siteLink("guides/organized-crimes-2.html")}">OC 2.0 Guide</a>
            <a href="${siteLink("members.html")}">Members</a>
            <a href="${siteLink("faq.html")}">FAQ</a>
            <a href="${siteLink("wallpapers.html")}">Wallpapers</a>
            <a href="${siteLink("archive.html")}">Archive</a>
          </nav>

          <div class="footer-council" aria-label="Leadership and contact">
            <h2>Council Desk</h2>
            <dl>
              <div><dt>Leader</dt><dd>ForeverHydrox</dd></div>
              <div><dt>Co-Leader</dt><dd>Skillerious</dd></div>
            </dl>
            <div class="footer-actions">
              <a class="footer-primary" href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-discord" aria-hidden="true"></i>
                <span>Join Discord</span>
              </a>
              <a class="footer-secondary" href="${siteLink("contact.html")}">Contact Council</a>
            </div>
          </div>
        </div>
      </div>

      <div class="footer-bottom">
        <p>&copy; <span id="year">${currentYear}</span> Privé Cartel.</p>
        <p>What happens behind the curtain stays ours.</p>
      </div>
    `;
  }

  function installApiWidget() {
    const storageKey = "pcApiKey";
    if (document.querySelector("[data-api-launcher]")) return;

    let widgetStyles = document.querySelector("link[data-api-widget-styles]");
    if (!widgetStyles) {
      widgetStyles = document.createElement("link");
      widgetStyles.rel = "stylesheet";
      widgetStyles.href = siteLink("assets/api-widget.css?v=20260822-7");
      widgetStyles.setAttribute("data-api-widget-styles", "");
      document.head.appendChild(widgetStyles);
    }

    const launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "api-launcher";
    launcher.hidden = true;
    launcher.setAttribute("data-api-launcher", "");
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-controls", "api-connection-dialog");
    launcher.innerHTML = `
      <span class="api-launcher-icon" aria-hidden="true"><i class="fa-solid fa-key"></i></span>
      <span class="api-launcher-label">Torn API</span>
      <span class="api-launcher-status" aria-hidden="true"></span>
    `;

    const dialog = document.createElement("dialog");
    dialog.className = "api-dialog";
    dialog.id = "api-connection-dialog";
    dialog.setAttribute("aria-labelledby", "api-dialog-title");
    dialog.setAttribute("aria-describedby", "api-dialog-description");
    dialog.innerHTML = `
      <div class="api-dialog-shell">
        <button class="api-dialog-close" type="button" aria-label="Close API key dialog" data-api-close>
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>

        <header class="api-dialog-header" data-api-primary>
          <div class="api-dialog-emblem" aria-hidden="true">
            <img src="${siteLink("images/emblem-512.webp")}" alt="" width="512" height="512" decoding="async">
          </div>
          <div>
            <p class="api-dialog-kicker">Torn API &middot; local connection</p>
            <h2 id="api-dialog-title">Connect Torn</h2>
          </div>
        </header>

        <p class="api-dialog-description" id="api-dialog-description" data-api-primary>Save a 16-character key to load live faction data in the member directory.</p>

        <div class="api-dialog-state" data-api-state data-api-primary>
          <span class="api-dialog-state-dot" aria-hidden="true"></span>
          <div>
            <strong data-api-state-title>No key saved</strong>
            <span data-api-state-copy>Add a key to enable live Torn data.</span>
          </div>
          <span class="api-dialog-state-badge"><i class="fa-solid fa-lock" aria-hidden="true"></i> This browser</span>
        </div>

        <form class="api-dialog-form" data-api-form data-api-primary novalidate>
          <div class="api-key-entry">
            <div class="api-key-entry-heading">
              <div class="api-key-entry-copy">
                <label for="globalApiKey">Your Torn API key</label>
                <span>Required for live member data</span>
              </div>
              <a class="api-key-settings" href="https://www.torn.com/preferences.php#tab=api" target="_blank" rel="noopener noreferrer">
                <span>Get a key</span>
                <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
              </a>
            </div>
            <div class="api-dialog-field">
              <input type="password" id="globalApiKey" name="api-key" placeholder="Enter or paste your 16-character key" maxlength="16" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="api-key-requirements api-dialog-message api-dialog-privacy">
              <button type="button" data-api-toggle aria-label="Show API key" title="Show API key">
                <i class="fa-solid fa-eye" aria-hidden="true"></i>
                <span>Show</span>
              </button>
            </div>
            <div class="api-key-requirements" id="api-key-requirements">
              <span><i class="fa-solid fa-hashtag" aria-hidden="true"></i> 16 characters</span>
              <span><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Use minimum permissions</span>
            </div>
          </div>
          <p class="api-dialog-message" id="api-dialog-message" data-api-message aria-live="polite"></p>

          <div class="api-dialog-actions">
            <button class="api-dialog-save" type="submit">
              <i class="fa-solid fa-lock" aria-hidden="true"></i>
              <span>Save API key</span>
            </button>
            <button class="api-dialog-remove" type="button" data-api-remove>
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
              <span>Remove key</span>
            </button>
          </div>
        </form>

        <div class="api-dialog-privacy" id="api-dialog-privacy" data-api-primary>
          <span aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></span>
          <div>
            <strong>Private by design</strong>
            <p>Stored only in this browser and sent directly to Torn over HTTPS.</p>
          </div>
        </div>

        <div class="api-dialog-confirmation" data-api-confirmation hidden role="status" aria-live="polite">
          <span aria-hidden="true"><i class="fa-solid fa-check"></i></span>
          <strong>API key saved</strong>
          <p>Live member data is connected. Closing&hellip;</p>
        </div>
      </div>
    `;

    document.body.append(launcher, dialog);
    document.body.classList.add("has-api-widget");

    const revealLauncher = () => {
      launcher.hidden = false;
      launcher.classList.add("is-ready");
    };
    if (widgetStyles.sheet) revealLauncher();
    else widgetStyles.addEventListener("load", revealLauncher, { once: true });

    const form = dialog.querySelector("[data-api-form]");
    const input = dialog.querySelector("#globalApiKey");
    const toggle = dialog.querySelector("[data-api-toggle]");
    const remove = dialog.querySelector("[data-api-remove]");
    const message = dialog.querySelector("[data-api-message]");
    const state = dialog.querySelector("[data-api-state]");
    const stateTitle = dialog.querySelector("[data-api-state-title]");
    const stateCopy = dialog.querySelector("[data-api-state-copy]");
    const confirmation = dialog.querySelector("[data-api-confirmation]");
    const primaryContent = [...dialog.querySelectorAll("[data-api-primary]")];
    const removeLabel = remove.querySelector("span");
    let closeTimer = 0;
    let removeTimer = 0;

    const showApiToast = (title, copy) => {
      document.querySelector("[data-api-toast]")?.remove();
      const toast = document.createElement("div");
      toast.className = "api-toast";
      toast.setAttribute("data-api-toast", "");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.innerHTML = `
        <span aria-hidden="true"><i class="fa-solid fa-check"></i></span>
        <div><strong>${title}</strong><p>${copy}</p></div>
        <button type="button" aria-label="Dismiss notification"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      `;
      document.body.appendChild(toast);
      const dismiss = () => {
        toast.classList.remove("is-visible");
        window.setTimeout(() => toast.remove(), 220);
      };
      toast.querySelector("button").addEventListener("click", dismiss, { once: true });
      window.requestAnimationFrame(() => toast.classList.add("is-visible"));
      window.setTimeout(dismiss, 4200);
    };

    const resetRemoveConfirmation = () => {
      window.clearTimeout(removeTimer);
      removeTimer = 0;
      remove.dataset.confirming = "false";
      remove.classList.remove("is-confirming");
      removeLabel.textContent = "Remove key";
      if (message.textContent === "Click again to remove the key from this browser.") {
        message.textContent = "";
        message.className = "api-dialog-message";
      }
    };

    const resetDialogState = () => {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
      dialog.classList.remove("is-confirmed");
      confirmation.hidden = true;
      primaryContent.forEach((element) => { element.hidden = false; });
      resetRemoveConfirmation();
    };

    const readKey = () => {
      try {
        const saved = localStorage.getItem(storageKey) || "";
        if (saved) return saved;
      } catch {
        // Storage may be unavailable in private browsing modes.
      }
      try {
        const previous = sessionStorage.getItem(storageKey) || "";
        if (previous) {
          localStorage.setItem(storageKey, previous);
          sessionStorage.removeItem(storageKey);
          return previous;
        }
      } catch {
        // Keep the widget usable even when storage is blocked.
      }
      return "";
    };

    const resetVisibility = () => {
      input.type = "password";
      toggle.setAttribute("aria-label", "Show API key");
      toggle.title = "Show API key";
      toggle.setAttribute("aria-pressed", "false");
      toggle.innerHTML = '<i class="fa-solid fa-eye" aria-hidden="true"></i><span>Show</span>';
    };

    const updateSavedState = () => {
      const hasKey = Boolean(readKey());
      launcher.classList.toggle("has-key", hasKey);
      launcher.setAttribute("aria-label", hasKey ? "Manage saved Torn API key" : "Add a Torn API key");
      launcher.title = hasKey ? "Torn API key saved" : "Add Torn API key";
      state.classList.toggle("has-key", hasKey);
      stateTitle.textContent = hasKey ? "API key saved" : "No key saved";
      stateCopy.textContent = hasKey
        ? "Live data is ready for the members directory."
        : "Add a key to enable live Torn data.";
      input.placeholder = hasKey ? "Paste a replacement key" : "Paste your API key";
      remove.disabled = !hasKey;
      return hasKey;
    };

    const openDialog = () => {
      resetDialogState();
      updateSavedState();
      input.value = "";
      message.textContent = "";
      message.className = "api-dialog-message";
      resetVisibility();
      dialog.showModal();
      document.body.classList.add("api-dialog-open");
      window.requestAnimationFrame(() => input.focus({ preventScroll: true }));
    };

    launcher.addEventListener("click", openDialog);
    dialog.querySelector("[data-api-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener("close", () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(removeTimer);
      document.body.classList.remove("api-dialog-open");
      launcher.focus({ preventScroll: true });
    });

    toggle.addEventListener("click", () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      toggle.setAttribute("aria-label", reveal ? "Hide API key" : "Show API key");
      toggle.title = reveal ? "Hide API key" : "Show API key";
      toggle.setAttribute("aria-pressed", String(reveal));
      toggle.innerHTML = `<i class="fa-solid ${reveal ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i><span>${reveal ? "Hide" : "Show"}</span>`;
      input.focus();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const key = input.value.trim();
      if (key.length !== 16) {
        message.textContent = "Torn API keys contain exactly 16 characters.";
        message.className = "api-dialog-message is-error";
        input.focus();
        return;
      }

      try {
        localStorage.setItem(storageKey, key);
        sessionStorage.removeItem(storageKey);
      } catch {
        message.textContent = "This browser blocked local storage. Try again outside private browsing.";
        message.className = "api-dialog-message is-error";
        return;
      }

      input.value = "";
      resetVisibility();
      updateSavedState();
      window.dispatchEvent(new CustomEvent("pc:api-key-change", { detail: { hasKey: true } }));
      primaryContent.forEach((element) => { element.hidden = true; });
      confirmation.hidden = false;
      dialog.classList.add("is-confirmed");
      showApiToast("API key saved", "Live member data is now connected.");
      closeTimer = window.setTimeout(() => dialog.close("saved"), 900);
    });

    remove.addEventListener("click", () => {
      if (remove.dataset.confirming !== "true") {
        remove.dataset.confirming = "true";
        remove.classList.add("is-confirming");
        removeLabel.textContent = "Confirm removal";
        message.textContent = "Click again to remove the key from this browser.";
        message.className = "api-dialog-message";
        removeTimer = window.setTimeout(resetRemoveConfirmation, 5000);
        return;
      }

      resetRemoveConfirmation();
      try {
        localStorage.removeItem(storageKey);
        sessionStorage.removeItem(storageKey);
      } catch {
        message.textContent = "The saved key could not be removed from this browser.";
        message.className = "api-dialog-message is-error";
        return;
      }
      input.value = "";
      resetVisibility();
      updateSavedState();
      message.textContent = "Saved API key removed.";
      message.className = "api-dialog-message is-success";
      window.dispatchEvent(new CustomEvent("pc:api-key-change", { detail: { hasKey: false } }));
      showApiToast("API key removed", "This browser no longer has a saved Torn key.");
      closeTimer = window.setTimeout(() => dialog.close("removed"), 450);
    });

    updateSavedState();
  }

  function installRecruitmentBanner() {
    const dismissalKey = "pcRecruitmentDismissedAt";
    const dismissalWindow = 7 * 24 * 60 * 60 * 1000;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(dismissalKey) || 0);
    } catch {
      dismissedAt = 0;
    }

    if (
      document.body.dataset.hideRecruitmentBanner === "true" ||
      Date.now() - dismissedAt < dismissalWindow ||
      document.querySelector(".recruitment-banner")
    ) return;

    const banner = document.createElement("aside");
    banner.className = "recruitment-banner";
    banner.setAttribute("aria-label", "Recruitment announcement");
    banner.innerHTML = `
      <a class="recruitment-banner-link" href="${siteLink("recruitment.html")}">
        <span class="recruitment-banner-icon" aria-hidden="true">
          <i class="fa-solid fa-bullhorn"></i>
          <span class="recruitment-banner-pulse"></span>
        </span>
        <span class="recruitment-banner-copy">
          <strong>Recruitment is open</strong>
          <span>Level 14+ players wanted</span>
        </span>
        <span class="recruitment-banner-cta">Discover Priv&eacute; <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
      </a>
      <button class="recruitment-banner-close" type="button" aria-label="Dismiss recruitment announcement">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;

    banner.querySelector(".recruitment-banner-close").addEventListener("click", () => {
      try {
        localStorage.setItem(dismissalKey, String(Date.now()));
      } catch {
        // Storage can be unavailable in privacy-focused browser modes.
      }
      banner.classList.add("is-closing");
      document.body.classList.remove("has-recruitment-banner");
      window.setTimeout(() => banner.remove(), prefersReducedMotion ? 0 : 240);
    });

    document.body.classList.add("has-recruitment-banner");
    document.body.appendChild(banner);
  }
});
