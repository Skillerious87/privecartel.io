# Privé Cartel — Discreet‑Luxury Faction Hub

[![GitHub Pages](https://img.shields.io/badge/%F0%9F%9A%80-live--site-purple?style=for-the-badge)](https://skillerious.github.io/prive-cartel/)  
*A discreet refuge amid Torn’s chaos — presence, discretion & mutual aid.*

---

## ✨ Overview
Privé Cartel started life as a scrappy brawl‑school on **27 Feb 2024** and has
since evolved into a discreet‑luxury syndicate famed for triple‑digit chains,
surgical OC 2.0 runs and an abiding pledge:

> “What happens behind the curtain… **stays ours.**”

This repo holds the public marketing / documentation site you’re looking at
right now.

---

## 🔥 Live demo

| Variant | URL |
|---------|-----|
| Production | <https://skillerious.github.io/prive-cartel/> |
| Edge (main branch) | same as production — GitHub Actions auto‑deploy on push |

---

## 🏗️  Tech stack

| Layer | What we use | Why |
|-------|-------------|-----|
| Mark‑up | **HTML 5** + semantic tags | simple, SEO‑friendly |
| Styling | **CSS only** (glassmorphism dark theme) | zero build step |
| Components | Vanilla **Web Components** (`<pc-navbar>`) | one‑line include, no frameworks |
| Icons & Fonts | Font Awesome 6, Poppins & Cormorant Garamond (Google Fonts) | elegant look |
| JS niceties | 1. Smooth scroll ⸺ 2. Reading‑progress bar ⸺ 3. Lazy prefetch | UX polish |
| PWA | Manifest + optional Service Worker | installable offline snapshot |
| Hosting | **GitHub Pages** (project site) | free, CDN‑backed |

No bundler, no framework — just lean, readable code you can view‑source.

---

## 🌟 Site features

* **Custom element navbar**  
  One source of truth (`/navbar.html`) auto‑injected on every page  
  via `/assets/navbar.js`.

* **Responsive glass UI**  
  Mobile‑first, scales up to 4K; under 35 kB CSS unminified.

* **Dark gold palette**  
  #d6b86d accent colour in CSS variable `--accent`.

* **Progressive Web App**  
  Opt‑in service‑worker for offline access and add‑to‑home‑screen.

* **Accessibility**  
  High‑contrast ratios, `aria‑label`s, focus states, `prefers-reduced-motion`
  fallbacks.

---

## 🚀 Quick start (local dev)

```bash
# 1. clone
git clone https://github.com/skillerious/prive-cartel.git
cd prive-cartel

# 2. start a static server (pick one)
npx serve         # node
python -m http.server 8000
```

Open <http://localhost:3000> (or the port your server prints) and hack away.
Hot‑reload isn’t required; just refresh.

---

## 📁 Folder structure

```text
PrivéCartelWebsite/
├── assets/              # CSS, JS, icons
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── navbar.js
│   ├── script.js
│   └── style.css
├── data/                # member snapshot JSON
│   └── member-snapshot.json
├── guides/              # guide pages
│   ├── happyjump.html
│   ├── installscripts.html
│   └── torntargets.html
├── images/              # graphics and photos
│   ├── blankprofile.jpg
│   ├── Emblem.png
│   ├── greasyfork-install-button.png
│   ├── greasyfork-torn-list.png
│   ├── hero-bg.jpg
│   ├── tampermonkey-chrome-webstore.png
│   ├── tampermonkey-enabled.png
│   └── tampermonkey-install-dialog.png
├── news/                # news posts and JSON index
│   ├── 2025-06-23-chain.html
│   ├── 2025-06-25-chain.html
│   ├── 2025-06-28-site-launch.html
│   ├── 2025-07-03-chain.html
│   └── news.json
├── archive.html
├── guides.html
├── index.html
├── manifest.json
├── members.html
├── navbar.html
├── news.html
└── rules.html
```

---

## 🤝 Contributing

1. **Fork** the repo and create a branch (`feat/my-amazing-idea`).
2. Commit with clear messages; stylistic fixes welcome.
3. Open a Pull Request — the faction Council will review promptly.

All PRs must pass the HTML validator (`npm run lint:html`) and keep Lighthouse
scores ≥ 95 % across the board.

---

## 🙏 Credits

* **Lead dev / designer:** [@Skillerious](https://github.com/skillerious)
* **Fonts:**  
  [Poppins](https://fonts.google.com/specimen/Poppins) (SIL OFL 1.1)  
  [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) (SIL OFL 1.1)
* **Icons:**  
  [Font Awesome 6 Free](https://fontawesome.com) (CC BY 4.0)
* **Animations helper:**  
  [Framer Motion](https://www.framer.com/motion/) (MIT) — *only used on the
  future React rewrite branch*.

---

## 📜 License

This site is released under the **MIT License** — see [`LICENSE`](LICENSE).  
Attribution appreciated 💛
