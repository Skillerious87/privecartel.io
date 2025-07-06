# Privé Cartel — Discreet-Luxury Faction Hub

<p align="center">
  <a href="https://skillerious.github.io/prive-cartel/" title="GitHub Pages"><img src="https://img.shields.io/badge/%F0%9F%9A%80-live--site-purple?style=for-the-badge" alt="GitHub Pages"/></a>
  <a href="https://www.privecartel.com/" title="Official Site"><img src="https://img.shields.io/badge/%F0%9F%8C%90-privecartel.com-blue?style=for-the-badge" alt="Official Site"/></a>
  <a href="https://skillerious.github.io/prive-cartel/" title="Edge Preview"><img src="https://img.shields.io/badge/%F0%9F%A7%AA-edge--preview-lightgrey?style=for-the-badge" alt="Edge Preview"/></a>
  <a href="LICENSE" title="License: MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License: MIT"/></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/HTML5" title="HTML5"><img src="https://img.shields.io/badge/HTML5-%3E%3D5-orange?style=for-the-badge" alt="HTML5"/></a>
  <a href="https://developer.mozilla.org/en-US/docs/Web/CSS" title="CSS3"><img src="https://img.shields.io/badge/CSS3-%3E%3D3-blue?style=for-the-badge" alt="CSS3"/></a>
</p>

*A discreet refuge amid Torn’s chaos — presence, discretion & mutual aid.*

---

## 🔖 Badges Guide

- **GitHub Pages:** deploy status of the docs site  
- **Official Site:** live production domain  
- **Edge Preview:** main-branch auto-deploy link  
- **License:** project license (MIT)  
- **HTML5 & CSS3:** standards compliance badges  

---

## ✨ Overview

Privé Cartel started life as a scrappy brawl-school on **27 Feb 2024** and has  
since evolved into a discreet-luxury syndicate famed for triple-digit chains,  
surgical OC 2.0 runs and an abiding pledge:

> “What happens behind the curtain… **stays ours.**”

This repo holds the public marketing/documentation site you’re looking at  
right now.

---

## 🏗️ Tech stack

| Layer         | What we use                                                        | Why                          |
|---------------|--------------------------------------------------------------------|------------------------------|
| Mark-up       | **HTML 5** + semantic tags                                         | simple, SEO-friendly         |
| Styling       | **CSS only** (glassmorphism dark theme)                            | zero build step              |
| Components    | Vanilla **Web Components** (`<pc-navbar>`)                         | one-line include, no frameworks |
| Icons & Fonts | Font Awesome 6, Poppins & Cormorant Garamond (Google Fonts)        | elegant look                 |
| JS niceties   | Smooth scroll · reading-progress bar · lazy prefetch               | UX polish                    |
| PWA           | Manifest + optional Service Worker                                 | installable offline snapshot |
| Hosting       | **GitHub Pages**                                                   | free, CDN-backed             |

_No bundler, no framework — just lean, readable code you can view-source._

---

## 🌟 Site features

- **Custom element navbar**  
  One source of truth (`/navbar.html`) auto-injected on every page via `/assets/navbar.js`.
- **Responsive glass UI**  
  Mobile-first, scales up to 4K; under 35 kB CSS unminified.
- **Dark gold palette**  
  CSS variable `--accent: #d6b86d` for the discreet-luxury look.
- **Progressive Web App**  
  Opt-in service-worker for offline access & add-to-home-screen.
- **Accessibility**  
  High-contrast ratios, `aria-label`s, focus states, `prefers-reduced-motion` fallbacks.

---

## 🔗 Theme & Dependencies

Include these in your `<head>`:

```html
<!-- Preconnect for Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Google Fonts -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap" rel="stylesheet">

<!-- Font Awesome -->
<link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
      integrity="sha512-INSERT_YOUR_HASH_HERE"
      crossorigin="anonymous"
      referrerpolicy="no-referrer" />

<!-- PWA Manifest & Theme Color -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1e1e1e">

<!-- Favicons & Touch Icons -->
<link rel="icon" href="/assets/icon-192.png" sizes="192x192" />
<link rel="apple-touch-icon" href="/assets/icon-512.png" />
```

---

## 🔗 Badge Image URLs

- https://img.shields.io/badge/%F0%9F%9A%80-live--site-purple?style=for-the-badge  
- https://img.shields.io/badge/%F0%9F%8C%90-privecartel.com-blue?style=for-the-badge  
- https://img.shields.io/badge/%F0%9F%A7%AA-edge--preview-lightgrey?style=for-the-badge  
- https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge  
- https://img.shields.io/badge/HTML5-%3E%3D5-orange?style=for-the-badge  
- https://img.shields.io/badge/CSS3-%3E%3D3-blue?style=for-the-badge  

---

## 🔥 Live demo

| Variant     | URL                                                       |
|-------------|-----------------------------------------------------------|
| Production  | https://skillerious.github.io/prive-cartel/               |
| Edge (main) | https://skillerious.github.io/prive-cartel/ (auto-deploy) |

---

## 🚀 Quick start (local dev)

```bash
# 1. clone
git clone https://github.com/skillerious/prive-cartel.git
cd prive-cartel

# 2. start a static server
npx serve          # Node
python -m http.server 8000
```

---

## 📁 Folder structure

```text
PrivéCartelWebsite/
├── assets/              
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── navbar.js
│   ├── script.js
│   └── style.css
├── data/                
│   └── member-snapshot.json
├── guides/              
│   ├── happyjump.html
│   ├── installscripts.html
│   └── torntargets.html
├── images/              
│   ├── blankprofile.jpg
│   ├── Emblem.png
│   ├── greasyfork-install-button.png
│   ├── greasyfork-torn-list.png
│   ├── hero-bg.jpg
│   ├── tampermonkey-chrome-webstore.png
│   ├── tampermonkey-enabled.png
│   └── tampermonkey-install-dialog.png
├── news/                
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

1. **Fork** the repo & create a branch (`feat/my-amazing-idea`).  
2. **Commit** with clear messages.  
3. **Open** a PR — must pass HTML lint & Lighthouse ≥ 95%.

---

## 🙏 Credits

- **Lead dev / designer:** [@Skillerious](https://github.com/skillerious)  
- **Fonts:** Poppins & Cormorant Garamond (Google Fonts, SIL OFL 1.1)  
- **Icons:** Font Awesome 6 Free (CC BY 4.0)  
- **Animations helper:** Framer Motion (MIT) — future React branch only

---

## 📜 License

Released under the **MIT License** — see [LICENSE](LICENSE).  
Attribution appreciated 💛
