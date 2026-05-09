/* /assets/navbar.js
   Shared navigation loader for GitHub Pages root and project sites. */

class PCNavbar extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.onEscape) document.removeEventListener("keydown", this.onEscape);
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
    const path = new URL(".", import.meta.url).pathname;
    const prefix = path.replace(/assets\/$/, "");

    try {
      const response = await fetch(`${prefix}navbar.html`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.innerHTML = await response.text();
    } catch (error) {
      console.error("[PCNavbar] Unable to load navbar.html:", error);
      return;
    }

    this.rewriteInternalLinks(prefix);
    this.markActiveLink();
    this.hardenExternalLinks();
    this.setupDrawer();
    this.setupShadow();

    this.dispatchEvent(new CustomEvent("pc-navbar-ready", { bubbles: true }));
  }

  rewriteInternalLinks(prefix) {
    this.querySelectorAll('a[href]:not([href^="http"]):not([href^="/"]):not([href^="#"]):not([href^="mailto:"]):not([href^="tel:"])')
      .forEach((link) => {
        link.setAttribute("href", prefix + link.getAttribute("href"));
      });
  }

  markActiveLink() {
    const here = location.pathname.replace(/\/$/, "/index.html");

    this.querySelectorAll("a").forEach((link) => {
      const target = new URL(link.href).pathname.replace(/\/$/, "/index.html");
      if (target === here) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
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
    const mobileQuery = window.matchMedia("(max-width: 720px)");

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
}

customElements.define("pc-navbar", PCNavbar);
