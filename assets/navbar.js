/* /assets/navbar.js   —  one-file GitHub Pages helper ************************
   ‣ Works on both *user* sites (root-level) and *project* sites (/repo/).
   ‣ Takes care of…
      1. figuring out the site prefix (e.g. "/prive-cartel/")
      2. fetching   <prefix>navbar.html
      3. rewriting every internal link to include that prefix
      4. highlighting the current page
      5. wiring the burger + overlay
******************************************************************************/

class PCNavbar extends HTMLElement {
  async connectedCallback() {
    /* 1 ── work out the prefix this file was served from
            e.g.  https://user.github.io/prive-cartel/assets/navbar.js
            ==>   prefix = "/prive-cartel/"                */
    const path   = new URL('.', import.meta.url).pathname;   // "/prive-cartel/assets/"
    const PREFIX = path.replace(/assets\/$/, '');            // "/prive-cartel/"

    /* 2 ── fetch the shared markup */
    const html = await fetch(`${PREFIX}navbar.html`).then(r => r.text());
    this.innerHTML = html;

    /* 3 ── make every internal <a> absolute to PREFIX */
    this.querySelectorAll('a[href]:not([href^="http"]):not([href^="/"])')
      .forEach(a => a.setAttribute('href', PREFIX + a.getAttribute('href')));

    /* 4 ── highlight the link that matches location.pathname */
    const here = location.pathname.replace(/\/$/, '/index.html');
    this.querySelectorAll('a').forEach(a => {
      const target = new URL(a.href).pathname.replace(/\/$/, '/index.html');
      if (target === here) a.classList.add('active');
    });

    /* 5 ── burger & overlay wiring */
    const toggle  = this.querySelector('#nav-toggle');
    const overlay = this.querySelector('.nav-overlay');
    if (toggle && overlay) {
      overlay.addEventListener('click', () => (toggle.checked = false));
      this.querySelectorAll('.nav-links a').forEach(a =>
        a.addEventListener('click', () => (toggle.checked = false))
      );
    }
  }
}
customElements.define('pc-navbar', PCNavbar);
