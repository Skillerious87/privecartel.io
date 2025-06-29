/*  assets/script.js
    ───────────────────────────────────────────────────────────
    • Auto-update © year in footer
    • Smooth in-page scrolling (fixed-nav offset)
    • Mobile drawer: slide-in menu, dim overlay, body-lock
    • Navbar shadow after 60 px
    • “Back-to-top” button (>400 px)
    • Reading-progress bar
    • Reveal-on-scroll animation (class="reveal")
    • Prefetch internal pages on link hover
    • Optional Service-Worker registration
*/

document.addEventListener("DOMContentLoaded", () => {

  /* ───── 1. © year ───── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
      window.scrollTo({ top: y, behavior: "smooth" });
      closeDrawer();
    });
  });

  /* ───── 3. Mobile drawer & overlay ───── */
  const navToggle = document.getElementById("nav-toggle");
  const overlay = document.querySelector(".nav-overlay");
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
  const backBtn = document.createElement("button");
  backBtn.id = "backTop";
  backBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  document.body.appendChild(backBtn);

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
  `;
  document.head.appendChild(
    Object.assign(document.createElement("style"), { textContent: css })
  );

  const toggleTopBtn = () =>
    backBtn.classList.toggle("show", window.scrollY > 400);
  toggleTopBtn();
  window.addEventListener("scroll", toggleTopBtn, { passive: true });
  backBtn.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );

  /* ───── 6. Reading-progress bar ───── */
  const bar = document.createElement("div");
  bar.id = "readBar";
  document.body.appendChild(bar);

  function updateBar() {
    const max =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const percent = (window.scrollY / max) * 100;
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
    a.addEventListener("mouseenter", () => {
      if (a.dataset.prefetched) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = a.href;
      document.head.appendChild(link);
      a.dataset.prefetched = "1";
    });
  });

  /* ───── 9. Optional Service-Worker ───── */
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {/* ignore if no sw */});
  }
});
