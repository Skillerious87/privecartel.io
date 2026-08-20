/* /assets/navbar.js
   Shared navigation loader for GitHub Pages root and project sites. */

const NAVBAR_TEMPLATE = `
<header class="navbar">
  <a href="index.html" class="logo"><span>PRIVÉ</span>&nbsp;CARTEL</a>

  <button class="hamburger" type="button" aria-label="Open navigation" aria-controls="primary-navigation" aria-expanded="false"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></button>

  <nav id="primary-navigation" aria-label="Primary">
    <ul class="nav-links">
      <li><a href="index.html"><i class="fa-solid fa-house"></i> Home</a></li>
      <li><a href="rules.html"><i class="fa-solid fa-scale-balanced"></i> Rules</a></li>
      <li><a href="guides.html"><i class="fa-solid fa-book"></i> Guides</a></li>
      <li><a href="members.html"><i class="fa-solid fa-users"></i> Members</a></li>
      <li><a href="news.html"><i class="fa-solid fa-bullhorn"></i> News</a></li>
      <li><a href="faq.html"><i class="fa-solid fa-circle-question"></i> FAQ</a></li>
      <li><a href="contact.html"><i class="fa-solid fa-address-card"></i> Contact</a></li>
      <li class="nav-search-item"><button class="nav-search-button" type="button" aria-label="Search Privé Cartel" title="Search (press /)" data-site-search-open><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span>Search</span><kbd aria-hidden="true">/</kbd></button></li>
      <li><a class="discord-nav-link" href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer" data-discord-dialog><i class="fa-brands fa-discord"></i> Discord</a></li>
    </ul>
  </nav>
  <div class="nav-overlay" aria-hidden="true"></div>
</header>`;

const SEARCH_ITEMS = [
  { path: "index.html", title: "Home", description: "Faction overview, latest resources and quick links.", keywords: "home overview faction hub" },
  { path: "recruitment.html", title: "Join Privé Cartel", description: "Membership benefits, expectations and application steps.", keywords: "join apply recruitment level 14 perks" },
  { path: "rules.html", title: "Member Rules & Charter", description: "Activity, OC 2.0, faction chat and conduct standards.", keywords: "rules charter chat conduct activity" },
  { path: "guides.html", title: "Guides Hub", description: "Practical guides for progression and faction play.", keywords: "guides help resources" },
  { path: "guides/organized-crimes-2.html", title: "Organised Crimes 2.0", description: "OC roles, readiness, items, timing and payouts.", keywords: "oc organized organised crimes scope roles payout" },
  { path: "guides/happyjump.html", title: "Happy Jump Guide", description: "Preparation and timing for efficient happy jumps.", keywords: "happy jump training xanax ecstasy" },
  { path: "guides/torntargets.html", title: "Torn Targets Guide", description: "Find and assess efficient targets for missions and chains.", keywords: "targets attacks missions chains" },
  { path: "guides/installscripts.html", title: "Install User Scripts", description: "Set up Tampermonkey and useful Torn scripts safely.", keywords: "scripts tampermonkey greasyfork install" },
  { path: "members.html", title: "Members Directory", description: "Browse the current Privé Cartel roster.", keywords: "members roster leadership players" },
  { path: "news.html", title: "News & Milestones", description: "Faction announcements, chain results and updates.", keywords: "news updates announcements chains" },
  { path: "faq.html", title: "Frequently Asked Questions", description: "Quick answers about membership and faction operations.", keywords: "faq questions answers help" },
  { path: "contact.html", title: "Contact Council", description: "Apply, ask a question or contact faction leadership.", keywords: "contact council application discord" },
  { path: "wallpapers.html", title: "Wallpaper Gallery", description: "Download Privé Cartel artwork and wallpapers.", keywords: "wallpaper gallery images downloads" },
  { path: "archive.html", title: "News Archive", description: "Browse earlier Privé Cartel announcements.", keywords: "archive older news posts" }
];

class PCNavbar extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.onEscape) document.removeEventListener("keydown", this.onEscape);
    if (this.onDiscordKeydown) document.removeEventListener("keydown", this.onDiscordKeydown);
    if (this.discordController) this.discordController.abort();
    if (this.searchController) this.searchController.abort();
    if (this.onScroll) window.removeEventListener("scroll", this.onScroll);
    if (this.mobileQuery && this.onMediaChange) {
      if (this.mobileQuery.removeEventListener) {
        this.mobileQuery.removeEventListener("change", this.onMediaChange);
      } else {
        this.mobileQuery.removeListener(this.onMediaChange);
      }
    }
  }

  render() {
    const rootUrl = new URL("../", import.meta.url);
    this.innerHTML = NAVBAR_TEMPLATE;

    this.ensureSkipLink();
    this.rewriteInternalLinks(rootUrl);
    this.markActiveLink();
    this.hardenExternalLinks();
    this.setupDrawer();
    this.setupDiscordDialog();
    this.setupSiteSearch(rootUrl);

    this.dispatchEvent(new CustomEvent("pc-navbar-ready", { bubbles: true }));
  }

  ensureSkipLink() {
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.id) main.id = "main-content";
    if (!main.hasAttribute("tabindex")) main.tabIndex = -1;
    if (document.querySelector(".skip-link")) return;

    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = `#${main.id}`;
    skip.textContent = "Skip to content";
    skip.addEventListener("click", () => {
      window.setTimeout(() => main.focus({ preventScroll: true }), 0);
    });
    document.body.insertBefore(skip, document.body.firstChild);
  }

  rewriteInternalLinks(rootUrl) {
    this.querySelectorAll('a[href]:not([href^="http"]):not([href^="/"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])')
      .forEach((link) => {
        link.setAttribute("href", new URL(link.getAttribute("href"), rootUrl).href);
      });
  }

  markActiveLink() {
    const here = location.pathname.replace(/\/$/, "/index.html");
    let exactMatch = false;

    this.querySelectorAll("a").forEach((link) => {
      const target = new URL(link.href).pathname.replace(/\/$/, "/index.html");
      if (target === here) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
        exactMatch = true;
      }
    });

    if (exactMatch) return;

    const section = here.includes("/guides/")
      ? "guides.html"
      : here.includes("/news/") || here.endsWith("/archive.html")
        ? "news.html"
        : "";

    if (!section) return;

    this.querySelectorAll("a").forEach((link) => {
      if (!new URL(link.href).pathname.endsWith(`/${section}`)) return;
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    });
  }

  hardenExternalLinks() {
    this.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      link.setAttribute("rel", [...rel].join(" "));
    });
  }

  setupDrawer() {
    const toggle = this.querySelector(".hamburger");
    const overlay = this.querySelector(".nav-overlay");
    const navigation = this.querySelector("#primary-navigation");
    const links = [...this.querySelectorAll(".nav-links a, .nav-links button")];
    const mobileQuery = window.matchMedia("(max-width: 920px)");
    let open = false;

    if (!toggle) return;
    this.mobileQuery = mobileQuery;

    const sync = ({ moveFocus = false } = {}) => {
      const isMobile = mobileQuery.matches;
      document.body.classList.toggle("menu-open", open);
      overlay?.classList.toggle("is-open", open);
      this.querySelector(".nav-links")?.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      navigation?.toggleAttribute("inert", isMobile && !open);
      if (navigation) navigation.setAttribute("aria-hidden", String(isMobile && !open));

      if (!moveFocus) return;
      window.requestAnimationFrame(() => {
        if (open) links[0]?.focus({ preventScroll: true });
        else toggle.focus({ preventScroll: true });
      });
    };

    const setOpen = (nextOpen, options) => {
      open = Boolean(nextOpen && mobileQuery.matches);
      sync(options);
    };

    const close = (options) => {
      if (!open) return;
      setOpen(false, options);
    };

    toggle.addEventListener("click", () => {
      setOpen(!open, { moveFocus: true });
    });
    overlay?.addEventListener("click", () => close({ moveFocus: true }));
    links.forEach((link) => {
      link.addEventListener("click", () => close());
    });

    this.onEscape = (event) => {
      if (event.key === "Escape") {
        close({ moveFocus: true });
        return;
      }

      if (!open || event.key !== "Tab") return;
      const focusable = [toggle, ...links].filter((item) => item.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", this.onEscape);

    this.onMediaChange = (event) => {
      if (!event.matches) open = false;
      sync();
    };
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", this.onMediaChange);
    } else {
      mobileQuery.addListener(this.onMediaChange);
    }

    sync();
  }

  setupSiteSearch(rootUrl) {
    if (this.searchController) this.searchController.abort();
    this.searchController = new AbortController();
    const { signal } = this.searchController;
    const trigger = this.querySelector("[data-site-search-open]");
    if (!trigger) return;

    const dialog = this.ensureSearchDialog();
    const input = dialog.querySelector("[data-site-search-input]");
    const results = dialog.querySelector("[data-site-search-results]");
    const count = dialog.querySelector("[data-site-search-count]");
    const items = SEARCH_ITEMS.map((item) => ({ ...item, href: new URL(item.path, rootUrl).href }));

    const renderResults = (query = "") => {
      const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
      const matches = items.filter((item) => {
        if (!terms.length) return true;
        const haystack = `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase();
        return terms.every((term) => haystack.includes(term));
      }).slice(0, 8);

      count.textContent = terms.length
        ? `${matches.length} result${matches.length === 1 ? "" : "s"}`
        : "Popular destinations";
      results.innerHTML = matches.length
        ? matches.map((item) => `
            <li>
              <a href="${item.href}">
                <span><strong>${item.title}</strong><small>${item.description}</small></span>
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </li>
          `).join("")
        : `<li class="site-search-empty"><i class="fa-regular fa-compass" aria-hidden="true"></i><span><strong>No matching page</strong><small>Try a shorter term such as rules, OC, scripts or contact.</small></span></li>`;
    };

    const openSearch = () => {
      const menuToggle = this.querySelector(".hamburger[aria-expanded=\"true\"]");
      if (menuToggle) menuToggle.click();
      renderResults("");
      input.value = "";
      dialog.showModal();
      window.requestAnimationFrame(() => input.focus());
    };

    trigger.addEventListener("click", openSearch, { signal });
    input.addEventListener("input", () => renderResults(input.value), { signal });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown") return;
      const firstResult = results.querySelector("a");
      if (firstResult) {
        event.preventDefault();
        firstResult.focus();
      }
    }, { signal });
    results.addEventListener("keydown", (event) => {
      if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const links = [...results.querySelectorAll("a")];
      const current = links.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === "ArrowDown" ? current + 1 : current - 1;
      (links[next] || (next < 0 ? input : links[0]))?.focus();
    }, { signal });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    }, { signal });
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      const shortcut = event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k");
      if (!shortcut || isTyping || event.altKey || event.shiftKey) return;
      event.preventDefault();
      if (!dialog.open) openSearch();
    }, { signal });

    renderResults();
  }

  ensureSearchDialog() {
    let dialog = document.querySelector("[data-site-search-dialog]");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "site-search-dialog";
    dialog.setAttribute("data-site-search-dialog", "");
    dialog.setAttribute("aria-labelledby", "site-search-title");
    dialog.innerHTML = `
      <div class="site-search-panel">
        <div class="site-search-heading">
          <div><p>Quick navigation</p><h2 id="site-search-title">Search Priv&eacute; Cartel</h2></div>
          <form method="dialog"><button type="submit" aria-label="Close search"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></form>
        </div>
        <label class="site-search-field">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <span class="sr-only">Search pages</span>
          <input type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search rules, guides, OC 2.0…" data-site-search-input>
          <kbd aria-hidden="true">Esc</kbd>
        </label>
        <div class="site-search-meta"><span data-site-search-count aria-live="polite">Popular destinations</span><span><kbd>↑</kbd><kbd>↓</kbd> to move</span></div>
        <ul class="site-search-results" data-site-search-results></ul>
      </div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  setupDiscordDialog() {
    if (this.discordController) this.discordController.abort();
    this.discordController = new AbortController();

    document.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.button !== 0) return;

        const link = event.target.closest?.("a[href]");
        if (!link || !this.isDiscordDialogTrigger(link)) return;

        event.preventDefault();
        this.openDiscordDialog(link.href, link);
      },
      { signal: this.discordController.signal }
    );
  }

  isDiscordDialogTrigger(link) {
    if (link.closest("[data-pc-discord-dialog]")) return false;
    if (link.hasAttribute("data-discord-open")) return false;
    if (link.hasAttribute("data-discord-dialog")) return true;

    let url;
    try {
      url = new URL(link.href, location.href);
    } catch {
      return false;
    }

    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return host === "discord.gg";
  }

  openDiscordDialog(inviteUrl, returnTarget) {
    const dialog = this.ensureDiscordDialog();
    const openLink = dialog.querySelector("[data-discord-open]");

    if (this.discordCloseTimer) {
      window.clearTimeout(this.discordCloseTimer);
      this.discordCloseTimer = null;
    }

    this.discordReturnTarget = returnTarget;
    if (openLink) openLink.href = inviteUrl;

    dialog.hidden = false;
    document.body.classList.add("discord-dialog-open");
    window.requestAnimationFrame(() => {
      dialog.classList.add("is-open");
      (openLink || dialog.querySelector(".discord-dialog-close") || dialog).focus({ preventScroll: true });
    });

    if (this.onDiscordKeydown) document.removeEventListener("keydown", this.onDiscordKeydown);
    this.onDiscordKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeDiscordDialog();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = [...dialog.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((item) => item.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this.onDiscordKeydown);
  }

  closeDiscordDialog({ restoreFocus = true } = {}) {
    const dialog = this.discordDialog;
    if (!dialog || dialog.hidden) return;

    dialog.classList.remove("is-open");
    document.body.classList.remove("discord-dialog-open");
    if (this.onDiscordKeydown) document.removeEventListener("keydown", this.onDiscordKeydown);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.discordCloseTimer = window.setTimeout(() => {
      dialog.hidden = true;
      if (restoreFocus && this.discordReturnTarget?.isConnected) {
        this.discordReturnTarget.focus({ preventScroll: true });
      }
    }, prefersReducedMotion ? 0 : 420);
  }

  ensureDiscordDialog() {
    if (this.discordDialog?.isConnected) return this.discordDialog;

    let dialog = document.querySelector("[data-pc-discord-dialog]");
    if (!dialog) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = `
        <div class="discord-dialog-backdrop" data-pc-discord-dialog hidden>
          <div class="discord-dialog" role="dialog" aria-modal="true" aria-labelledby="discord-dialog-title" aria-describedby="discord-dialog-copy" tabindex="-1">
            <span class="discord-dialog-grip" aria-hidden="true"></span>
            <button class="discord-dialog-close" type="button" aria-label="Close Discord dialog" data-discord-close>
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>

            <div class="discord-dialog-head">
              <div class="discord-dialog-mark" aria-hidden="true">
                <span class="discord-dialog-badge">
                  <i class="fa-brands fa-discord"></i>
                </span>
              </div>

              <div class="discord-dialog-heading">
                <p class="discord-dialog-kicker">Priv&eacute; Cartel &middot; Official invite</p>
                <h2 id="discord-dialog-title">Continue on Discord</h2>
                <p id="discord-dialog-copy">Open the official faction server for coordination, council contact and member support.</p>
              </div>
            </div>

            <div class="discord-dialog-content">
              <div class="discord-dialog-actions">
                <a class="btn discord-dialog-primary" href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer" data-discord-open>
                  <i class="fa-brands fa-discord" aria-hidden="true"></i>
                  <span>Open Discord</span>
                  <i class="fa-solid fa-arrow-up-right-from-square discord-dialog-arrow" aria-hidden="true"></i>
                </a>
                <button class="discord-dialog-cancel" type="button" data-discord-close>Cancel</button>
              </div>

              <p class="discord-dialog-note">
                discord.gg/DmxrRAjBdk &middot; opens in a new tab
              </p>
            </div>
          </div>
        </div>
      `;
      dialog = wrapper.firstElementChild;
      document.body.appendChild(dialog);
    }

    dialog.querySelectorAll("[data-discord-close]").forEach((button) => {
      button.addEventListener("click", () => this.closeDiscordDialog());
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) this.closeDiscordDialog();
    });
    dialog.querySelector("[data-discord-open]")?.addEventListener("click", () => {
      this.closeDiscordDialog({ restoreFocus: false });
    });

    this.discordDialog = dialog;
    return dialog;
  }
}

customElements.define("pc-navbar", PCNavbar);
