(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function safeHttpUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeAssetPath(value) {
    const path = String(value || "").trim();
    if (/^(?:\.\.?\/|\/)?[a-z0-9_./-]+$/i.test(path)) return path;
    return safeHttpUrl(path) || "images/emblem-512.webp";
  }

  function buildMaintenanceHtml(options) {
    const title = options.title || "System Maintenance";
    const message =
      options.message ||
      "Priv&eacute; Cartel is temporarily offline while maintenance is completed.";
    const eta = options.eta || "Back soon";
    const contactLabel = options.contactLabel || "Contact Support";
    const contactUrl = safeHttpUrl(options.contactUrl);
    const assetPath = safeAssetPath(options.assetPath);
    const generatedAt = new Date().toISOString();

    const contactMarkup = contactUrl
      ? `<a class="action" href="${escapeAttribute(contactUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contactLabel)}</a>`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)} | Priv&eacute; Cartel</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root{
      --bg:#080b11;
      --surface:#101722;
      --surface-2:#141d2a;
      --line:#29374a;
      --text:#edf3fb;
      --muted:#a4afc0;
      --dim:#78869a;
      --accent:#5b8cff;
      --accent-strong:#78a2ff;
      --accent-soft:rgba(91,140,255,.14);
      --success:#45d483;
      --success-soft:rgba(69,212,131,.12);
    }
    *{box-sizing:border-box}
    html,body{min-height:100%}
    body{
      margin:0;
      display:grid;
      place-items:center;
      padding:2rem;
      overflow:hidden;
      color:var(--text);
      font-family:Inter,Arial,sans-serif;
      background:
        linear-gradient(180deg,rgba(255,255,255,.035),transparent 20rem),
        linear-gradient(135deg,#0b1018 0%,#080b11 58%,#0b111a 100%);
    }
    body::before{
      content:"";
      position:fixed;
      inset:0;
      background:
        linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
        linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px);
      background-size:40px 40px;
      mask-image:linear-gradient(180deg,rgba(0,0,0,.62),transparent 78%);
      pointer-events:none;
    }
    main{
      position:relative;
      isolation:isolate;
      width:min(100%,720px);
      padding:2rem;
      border:1px solid rgba(148,163,184,.18);
      border-radius:8px;
      background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 9rem),rgba(16,23,34,.96);
      box-shadow:0 28px 80px rgba(0,0,0,.48);
      animation:panel-in .62s cubic-bezier(.16,1,.3,1) both;
    }
    main::before{
      content:"";
      position:absolute;
      inset:0 auto 0 0;
      width:3px;
      background:linear-gradient(180deg,var(--accent),#28d2bf);
    }
    .brand{
      display:flex;
      align-items:center;
      gap:.85rem;
      margin-bottom:1.3rem;
    }
    .brand img{
      width:64px;
      height:64px;
      border:1px solid var(--line);
      border-radius:8px;
      object-fit:cover;
      background:var(--surface-2);
    }
    .brand img[hidden]{
      display:none;
    }
    .brand span{
      display:grid;
      gap:.18rem;
      color:var(--muted);
      font-size:.84rem;
      font-weight:700;
      letter-spacing:0;
    }
    .brand strong{
      display:block;
      color:#fff;
      font-size:1.08rem;
      font-weight:800;
      line-height:1.1;
    }
    .status{
      display:inline-flex;
      align-items:center;
      gap:.48rem;
      width:max-content;
      max-width:100%;
      padding:.36rem .68rem;
      border:1px solid rgba(69,212,131,.36);
      border-radius:8px;
      background:var(--success-soft);
      color:var(--success);
      font-size:.76rem;
      font-weight:800;
      text-transform:uppercase;
      letter-spacing:0;
    }
    .status::before{
      content:"";
      width:.46rem;
      height:.46rem;
      border-radius:50%;
      background:var(--success);
      box-shadow:0 0 16px rgba(69,212,131,.72);
      animation:pulse 1.8s ease-in-out infinite;
    }
    h1{
      margin:.85rem 0 .75rem;
      color:#fff;
      font-size:3.35rem;
      font-weight:800;
      line-height:1.02;
      letter-spacing:0;
    }
    p{
      max-width:54rem;
      margin:0;
      color:var(--muted);
      font-size:1.08rem;
      line-height:1.65;
    }
    .meta{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:.75rem;
      margin:1.45rem 0;
    }
    .meta div{
      min-width:0;
      padding:.85rem .9rem;
      border:1px solid rgba(148,163,184,.16);
      border-radius:8px;
      background:rgba(255,255,255,.035);
    }
    .meta span{
      display:block;
      color:var(--dim);
      font-size:.76rem;
      text-transform:uppercase;
      font-weight:800;
      letter-spacing:0;
    }
    .meta strong{
      display:block;
      margin-top:.18rem;
      overflow-wrap:anywhere;
      color:var(--text);
      font-size:1rem;
    }
    .actions{
      display:flex;
      flex-wrap:wrap;
      gap:.75rem;
      align-items:center;
    }
    .action{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:2.75rem;
      padding:.72rem 1.25rem;
      border:1px solid rgba(91,140,255,.45);
      border-radius:8px;
      background:linear-gradient(180deg,#78a2ff,#4e7ff1);
      color:#07111f;
      font-weight:800;
      text-decoration:none;
      box-shadow:0 14px 34px rgba(91,140,255,.22);
    }
    .stamp{
      color:var(--dim);
      font-size:.82rem;
    }
    @keyframes panel-in{
      from{opacity:0;transform:translateY(20px) scale(.985)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }
    @keyframes pulse{
      0%,100%{opacity:.5;transform:scale(.82)}
      50%{opacity:1;transform:scale(1)}
    }
    @media(max-width:620px){
      body{align-items:end;overflow:auto;padding:1rem}
      main{padding:1.2rem}
      .brand img{width:54px;height:54px}
      h1{font-size:2.35rem}
      p{font-size:1rem}
      .meta{grid-template-columns:1fr}
      .actions{display:grid}
      .action{width:100%}
    }
  </style>
</head>
<body>
  <!-- PC_DASHBOARD_MAINTENANCE generated ${escapeHtml(generatedAt)} -->
  <main>
    <div class="brand">
      <img src="${escapeAttribute(assetPath)}" alt="" onerror="this.hidden=true">
      <span><strong>Priv&eacute; Cartel</strong>Status Page</span>
    </div>
    <span class="status">Maintenance active</span>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    <div class="meta" aria-label="Maintenance details">
      <div><span>Status</span><strong>Offline for maintenance</strong></div>
      <div><span>ETA</span><strong>${escapeHtml(eta)}</strong></div>
    </div>
    <div class="actions">
      ${contactMarkup}
      <span class="stamp">Updated ${escapeHtml(generatedAt)}</span>
    </div>
  </main>
</body>
</html>`;
  }

  window.PCMaintenance = {
    buildMaintenanceHtml,
  };
})();
