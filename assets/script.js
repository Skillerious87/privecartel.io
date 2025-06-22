/*  assets/script.js
    ───────────────────────────────────────────────────────────
    ▸ Auto-update © year in footer
    ▸ Smooth-scroll for in-page anchor links (offsets fixed nav)
    ▸ Mobile drawer: slide-in menu, dim overlay, body-lock
    ▸ Auto-close drawer when link/overlay tapped
    ▸ Adds soft shadow to navbar after scrolling 60 px
*/

document.addEventListener('DOMContentLoaded', () => {

  /* ───── 1. Auto-year ───── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();


  /* ───── 2. Smooth in-page scrolling ───── */
  const navH = parseInt(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--nav-h')
  ) || 72;                                           // fallback height

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;                           // external hash

      e.preventDefault();

      const y = target.getBoundingClientRect().top
              + window.pageYOffset
              - navH - 20;                           // extra breathing room

      window.scrollTo({ top: y, behavior: 'smooth' });
      closeDrawer();                                 // in case menu is open
    });
  });


  /* ───── 3. Mobile drawer & overlay ───── */
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

  if (navToggle) {
    navToggle.addEventListener('change', toggleBodyScroll);
  }
  if (overlay)  overlay.addEventListener('click', closeDrawer);

  document.querySelectorAll('.nav-links a').forEach(a =>
    a.addEventListener('click', closeDrawer)
  );


  /* ───── 4. Navbar shadow on scroll ───── */
  const nav        = document.querySelector('.navbar');
  const shadowCls  = 'nav-shadow';
  const addShadow  = () =>
    nav && (window.scrollY > 60
            ? nav.classList.add(shadowCls)
            : nav.classList.remove(shadowCls));

  addShadow();                // run once at load
  window.addEventListener('scroll', addShadow);

});
