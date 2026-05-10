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
      <li><a href="https://discord.gg/DmxrRAjBdk" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-discord"></i> Discord</a></li>
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
