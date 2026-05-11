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

document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollBehavior = prefersReducedMotion ? "auto" : "smooth";
  const year = new Date().getFullYear();
  installSkipLink();
  enhanceMetadata();
  optimizeImages();

  /* ───── 1. © year ───── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = year;
  enhanceFooter(year);

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

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      e.preventDefault();
      const y =
        target.getBoundingClientRect().top + window.pageYOffset - navH - 20;
      window.scrollTo({ top: y, behavior: scrollBehavior });
      closeDrawer();
    });
  });

  /* ───── 3. Mobile drawer & overlay ───── */
  const navToggle = document.getElementById("nav-toggle");
  const overlay = document.querySelector("pc-navbar .nav-overlay");
  const body = document.body;

  function toggleBodyScroll() {
    body.classList.toggle("menu-open", navToggle.checked);
  }
  function closeDrawer() {
    if (navToggle && navToggle.checked) {
      navToggle.checked = false;
      toggleBodyScroll();
    }
  }
  if (navToggle) navToggle.addEventListener("change", toggleBodyScroll);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.addEventListener("click", closeDrawer)
  );

  /* ───── 4. Navbar shadow ───── */
  const nav = document.querySelector(".navbar");
  const shadowCls = "nav-shadow";
  const addShadow = () =>
    nav &&
    (window.scrollY > 60
      ? nav.classList.add(shadowCls)
      : nav.classList.remove(shadowCls));
  addShadow();
  window.addEventListener("scroll", addShadow, { passive: true });

  /* ───── 5. Back-to-top button ───── */
  const backBtn = document.getElementById("backTop") || document.createElement("button");
  backBtn.id = "backTop";
  backBtn.type = "button";
  backBtn.title = "Back to top";
  backBtn.setAttribute("aria-label", "Back to top");
  if (!backBtn.innerHTML.trim()) {
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  }
  if (!backBtn.isConnected) document.body.appendChild(backBtn);

  const css = `
    #backTop{
      position:fixed;bottom:1.75rem;right:1.5rem;z-index:950;
      width:44px;height:44px;display:grid;place-items:center;
      font-size:1.1rem;border:none;border-radius:50%;
      background:linear-gradient(135deg,var(--accent) 0%,rgba(255,255,255,.17) 100%);
      color:#000;box-shadow:0 4px 12px rgba(0,0,0,.45);
      cursor:pointer;opacity:0;transform:scale(.6);pointer-events:none;
      transition:opacity .35s ease,transform .35s ease;
    }
    #backTop.show{opacity:.9;transform:scale(1);pointer-events:auto}
    #backTop:hover{opacity:1;transform:scale(1.08)}
    #backTop:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    /* reading progress bar */
    #readBar{
      position:fixed;top:0;left:0;height:3px;background:var(--accent);
      width:0;z-index:999;pointer-events:none;transition:width .15s ease-out;
    }
    :is(.card,.guide-card,.news-card,.wallpaper-card,.feat-card,.member-card,.pill):hover,
    :is(.card,.guide-card,.news-card,.wallpaper-card,.feat-card,.member-card,.pill):focus-visible{
      transform:none!important;
    }
    :is(.card,.guide-card,.news-card,.wallpaper-card,.feat-card,.member-card):hover,
    :is(.card,.guide-card,.news-card,.wallpaper-card,.feat-card,.member-card):focus-visible{
      border-color:rgba(var(--accent-rgb),.76)!important;
      box-shadow:0 8px 18px rgba(0,0,0,.34)!important;
    }
  `;
  document.head.appendChild(
    Object.assign(document.createElement("style"), { textContent: css })
  );

  const toggleTopBtn = () =>
    backBtn.classList.toggle("show", window.scrollY > 400);
  toggleTopBtn();
  window.addEventListener("scroll", toggleTopBtn, { passive: true });
  backBtn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: scrollBehavior })
  );

  /* ───── 6. Reading-progress bar ───── */
  const bar = document.getElementById("readBar") || document.createElement("div");
  bar.id = "readBar";
  if (!bar.isConnected) document.body.appendChild(bar);

  function updateBar() {
    const max =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    bar.style.width = percent + "%";
  }
  updateBar();
  window.addEventListener("scroll", updateBar, { passive: true });

  /* ───── 7. Reveal-on-scroll (class="reveal") ───── */
  const revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ───── 8. Prefetch internal pages ───── */
  document.querySelectorAll('a[href$=".html"]:not([target])').forEach((a) => {
    const prefetch = () => {
      if (a.dataset.prefetched) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = a.href;
      document.head.appendChild(link);
      a.dataset.prefetched = "1";
    };
    a.addEventListener("pointerenter", prefetch);
    a.addEventListener("focus", prefetch);
  });

  /* ───── 9. Service worker intentionally omitted until sw.js exists. ───── */

  function installSkipLink() {
    if (document.querySelector(".skip-link")) return;
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to content";

    const main = document.querySelector("main") || document.querySelector(".rules-block");
    if (main && !main.id) main.id = "main-content";
    if (!main) return;

    document.body.insertBefore(skip, document.body.firstChild);
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

  function enhanceMetadata() {
    const title = document.title || "Privé Cartel";
    const description =
      document.querySelector('meta[name="description"]')?.content ||
      "Official hub for Privé Cartel faction members.";
    const pageUrl = location.href.split("#")[0];
    const imageUrl = siteLink("images/Emblem.png");

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = pageUrl;

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
    meta.content = content;
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
              <img src="${siteLink("images/Emblem.png")}" alt="" loading="lazy">
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
});
