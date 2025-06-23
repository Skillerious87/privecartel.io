/*  assets/script.js
    ───────────────────────────────────────────────────────────
    ▸ Auto-update © year in footer
    ▸ Smooth-scroll for in-page anchor links (offsets fixed nav)
    ▸ Mobile drawer: slide-in menu, dim overlay, body-lock
    ▸ Auto-close drawer when link / overlay tapped
    ▸ Adds soft shadow to navbar after scrolling 60 px
    ▸ “Back-to-top” floating button (fade + scale in > 400 px)
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ───── 1.  © year ───── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ───── 2.  Smooth in-page scrolling ───── */
  const navH = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-h'),
    10
  ) || 72;                                   // fallback height

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id      = link.getAttribute('href').slice(1);
      const target  = document.getElementById(id);
      if (!target) return;                   // external hash

      e.preventDefault();
      const y = target.getBoundingClientRect().top
              + window.pageYOffset
              - navH - 20;                   // extra breathing room

      window.scrollTo({ top: y, behavior: 'smooth' });
      closeDrawer();                         // close burger if open
    });
  });


  /* ───── 3.  Mobile drawer & overlay ───── */
  const navToggle = document.getElementById('nav-toggle');
  const overlay   = document.querySelector('.nav-overlay');
  const body      = document.body;

  function toggleBodyScroll() {
    body.classList.toggle('menu-open', navToggle.checked);
  }

  function closeDrawer() {
    if (navToggle && navToggle.checked) {
      navToggle.checked = false;
      toggleBodyScroll();
    }
  }

  if (navToggle) navToggle.addEventListener('change', toggleBodyScroll);
  if (overlay)   overlay.addEventListener('click',  closeDrawer);
  document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', closeDrawer)
  );


  /* ───── 4.  Navbar shadow on scroll ───── */
  const nav        = document.querySelector('.navbar');
  const shadowCls  = 'nav-shadow';
  const addShadow  = () =>
    nav && (window.scrollY > 60
              ? nav.classList.add   (shadowCls)
              : nav.classList.remove(shadowCls));

  addShadow();                                // run once at load
  window.addEventListener('scroll', addShadow, { passive: true });


  /* ───── 5.  Back-to-top button (revamped) ───── */
  const backBtn = document.createElement('button');
  backBtn.id = 'backTop';
  backBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>'; // FA icon
  document.body.appendChild(backBtn);

  /* inject CSS once so it works everywhere */
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
  `;
  document.head.appendChild(Object.assign(
    document.createElement('style'), { textContent: css }
  ));

  const toggleTopBtn = () =>
    backBtn.classList.toggle('show', window.scrollY > 400);

  toggleTopBtn();                             // initial state
  window.addEventListener('scroll', toggleTopBtn, { passive: true });

  backBtn.addEventListener('click', () =>
    window.scrollTo({ top: 0, behavior: 'smooth' })
  );

});
