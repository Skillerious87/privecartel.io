/* /assets/navbar.js
   Shared navigation loader for GitHub Pages root and project sites. */

const NAVBAR_TEMPLATE = `
<header class="navbar">
  <a href="index.html" class="logo"><span>PRIVÉ</span>&nbsp;CARTEL</a>

  <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="Open navigation" aria-expanded="false" aria-controls="primary-navigation" />
  <label for="nav-toggle" class="hamburger" role="button" tabindex="0" aria-label="Open navigation" aria-controls="primary-navigation" aria-expanded="false"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></label>

  <nav id="primary-navigation" aria-label="Primary">
    <ul class="nav-links">
      <li><a href="index.html"><i class="fa-solid fa-house"></i> Home</a></li>
      <li><a href="rules.html"><i class="fa-solid fa-scale-balanced"></i> Rules</a></li>
      <li><a href="guides.html"><i class="fa-solid fa-book"></i> Guides</a></li>
      <li><a href="members.html"><i class="fa-solid fa-users"></i> Members</a></li>
      <li><a href="news.html"><i class="fa-solid fa-bullhorn"></i> News</a></li>
      <li><a href="faq.html"><i class="fa-solid fa-circle-question"></i> FAQ</a></li>
      <li><a href="contact.html"><i class="fa-solid fa-address-card"></i> Contact</a></li>
      <li><a class="discord-nav-link" href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer" data-discord-dialog><i class="fa-brands fa-discord"></i> Discord</a></li>
    </ul>
  </nav>
  <div class="nav-overlay" aria-hidden="true"></div>
</header>`;

class PCNavbar extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.onEscape) document.removeEventListener("keydown", this.onEscape);
    if (this.onDiscordKeydown) document.removeEventListener("keydown", this.onDiscordKeydown);
    if (this.discordController) this.discordController.abort();
    if (this.onScroll) window.removeEventListener("scroll", this.onScroll);
    if (this.mobileQuery && this.onMediaChange) {
      if (this.mobileQuery.removeEventListener) {
        this.mobileQuery.removeEventListener("change", this.onMediaChange);
      } else {
        this.mobileQuery.removeListener(this.onMediaChange);
      }
    }
  }

  async render() {
    const rootUrl = new URL("../", import.meta.url);

    try {
      const response = await fetch(new URL("navbar.html", rootUrl), { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.innerHTML = await response.text();
    } catch (error) {
      console.warn("[PCNavbar] Falling back to inline navbar:", error);
      this.innerHTML = NAVBAR_TEMPLATE;
    }

    this.rewriteInternalLinks(rootUrl);
    this.markActiveLink();
    this.hardenExternalLinks();
    this.setupDrawer();
    this.setupDiscordDialog();
    this.setupShadow();

    this.dispatchEvent(new CustomEvent("pc-navbar-ready", { bubbles: true }));
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
    const toggle = this.querySelector("#nav-toggle");
    const overlay = this.querySelector(".nav-overlay");
    const label = this.querySelector(".hamburger");
    const mobileQuery = window.matchMedia("(max-width: 920px)");

    if (!toggle) return;
    this.mobileQuery = mobileQuery;

    const sync = () => {
      const open = toggle.checked;
      document.body.classList.toggle("menu-open", open);
      overlay?.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      label?.setAttribute("aria-expanded", String(open));
      label?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    };

    const setOpen = (open) => {
      toggle.checked = open;
      sync();
    };

    const close = () => {
      if (!toggle.checked) return;
      setOpen(false);
    };

    toggle.addEventListener("change", sync);
    label?.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(!toggle.checked);
    });
    label?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setOpen(!toggle.checked);
    });
    overlay?.addEventListener("click", close);
    this.querySelectorAll(".nav-links a").forEach((link) => {
      link.addEventListener("click", close);
    });

    this.onEscape = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", this.onEscape);

    this.onMediaChange = (event) => {
      if (!event.matches) close();
    };
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener("change", this.onMediaChange);
    } else {
      mobileQuery.addListener(this.onMediaChange);
    }

    sync();
  }

  setupShadow() {
    const nav = this.querySelector(".navbar");
    if (!nav) return;

    this.onScroll = () => {
      nav.classList.toggle("nav-shadow", window.scrollY > 60);
    };

    this.onScroll();
    window.addEventListener("scroll", this.onScroll, { passive: true });
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
                <p class="discord-dialog-kicker">Official invite</p>
                <h2 id="discord-dialog-title">Open Priv&eacute; Cartel Discord</h2>
                <p id="discord-dialog-copy">Continue to the faction server with Discord. The invite may open in the app or in a new browser tab.</p>
              </div>
            </div>

            <div class="discord-dialog-content">
              <div class="discord-dialog-details" aria-label="Discord details">
                <span>
                  <i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i>
                  External handoff
                </span>
                <span>
                  <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
                  Faction server
                </span>
              </div>

              <div class="discord-dialog-actions">
                <a class="btn discord-dialog-primary" href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer" data-discord-open>
                  <i class="fa-brands fa-discord" aria-hidden="true"></i>
                  <span>Open Discord</span>
                </a>
                <button class="btn secondary discord-dialog-cancel" type="button" data-discord-close>Not now</button>
              </div>
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
