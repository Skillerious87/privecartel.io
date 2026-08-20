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
    const footer = document.querySelector("footer");
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
