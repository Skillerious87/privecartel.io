require('dotenv').config();

const path = require('node:path');
const express = require('express');
const nodemailer = require('nodemailer');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_NAME = 'Prive Cartel';
const SOURCE_TOKEN = 'prive-contact-v1';
const PORT = Number(process.env.PORT || 3000);
const MAX_REQUESTS = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const rateBuckets = new Map();

const app = express();
app.set('trust proxy', 1);

app.use(express.json({limit: '32kb'}));
app.use(express.text({type: 'text/plain', limit: '32kb'}));

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({ok: false, error: 'Invalid JSON payload.'});
    return;
  }

  next(error);
});

app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && isAllowedOrigin(req, origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

app.post('/api/contact', rateLimit, async (req, res) => {
  try {
    if (req.get('origin') && !isAllowedOrigin(req, req.get('origin'))) {
      res.status(403).json({ok: false, error: 'Origin is not allowed.'});
      return;
    }

    const payload = parsePayload(req.body);
    validatePayload(payload);

    const config = getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: {
        user: config.user,
        pass: config.pass.replace(/\s+/g, ''),
      },
    });

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.user}>`,
      to: config.toEmail,
      replyTo: isValidEmail(payload.contact) ? payload.contact.trim() : undefined,
      subject: `[${SITE_NAME}] Application from ${clean(payload.name)}`,
      text: buildPlainBody(payload),
      html: buildHtmlBody(payload),
    });

    res.json({ok: true, messageId: info.messageId || ''});
  } catch (error) {
    console.error('Contact submission failed:', error);
    res.status(400).json({
      ok: false,
      error: error && error.message ? error.message : 'Submission failed.',
    });
  }
});

app.use(express.static(ROOT_DIR));

app.listen(PORT, () => {
  console.log(`${SITE_NAME} site running at http://127.0.0.1:${PORT}/`);
  console.log('Contact endpoint: /api/contact');
});

function getSmtpConfig() {
  const config = {
    host: requiredEnv('SMTP_HOST'),
    port: Number(requiredEnv('SMTP_PORT')),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: requiredEnv('SMTP_USER'),
    pass: requiredEnv('SMTP_PASS'),
    toEmail: process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER,
    fromName: process.env.MAIL_FROM_NAME || SITE_NAME,
  };

  if (!Number.isFinite(config.port) || config.port < 1) {
    throw new Error('SMTP_PORT must be a valid port number.');
  }

  if (!isValidEmail(config.user)) {
    throw new Error('SMTP_USER must be a valid email address.');
  }

  if (!isValidEmail(config.toEmail)) {
    throw new Error('CONTACT_TO_EMAIL must be a valid email address.');
  }

  return config;
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not configured.`);
  }
  return value;
}

function parsePayload(body) {
  if (typeof body === 'string') {
    return JSON.parse(body);
  }
  return body || {};
}

function validatePayload(payload) {
  if (!payload || payload.source !== SOURCE_TOKEN) {
    throw new Error('Invalid submission source.');
  }

  if (String(payload.website || '').trim()) {
    throw new Error('Spam rejected.');
  }

  const required = ['name', 'level', 'focus', 'activity', 'message'];
  required.forEach((key) => {
    if (!String(payload[key] || '').trim()) {
      throw new Error(`Missing field: ${key}`);
    }
  });

  const level = Number(payload.level);
  if (!Number.isFinite(level) || level < 1 || level > 100) {
    throw new Error('Level must be between 1 and 100.');
  }

  if (String(payload.name).length > 80) {
    throw new Error('Name is too long.');
  }

  if (String(payload.contact || '').length > 160) {
    throw new Error('Reply contact is too long.');
  }

  if (String(payload.message).length > 4000) {
    throw new Error('Message is too long.');
  }
}

function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((timestamp) => now - timestamp < RATE_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    res.status(429).json({ok: false, error: 'Too many submissions. Try again later.'});
    return;
  }

  recent.push(now);
  rateBuckets.set(key, recent);
  next();
}

function isAllowedOrigin(req, origin) {
  const configured = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.includes('*') || configured.includes(origin)) {
    return true;
  }

  if (!configured.length) {
    try {
      return new URL(origin).host === req.get('host');
    } catch (error) {
      return false;
    }
  }

  return false;
}

function buildPlainBody(payload) {
  return [
    `New ${SITE_NAME} contact submission`,
    '',
    `Torn name: ${clean(payload.name)}`,
    `Level: ${clean(payload.level)}`,
    `Contact: ${clean(payload.contact || 'Not provided')}`,
    `Focus: ${clean(payload.focus)}`,
    `Activity: ${clean(payload.activity)}`,
    `Page: ${clean(payload.page || 'Not provided')}`,
    '',
    'Message:',
    String(payload.message || '').trim(),
    '',
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n');
}

function buildHtmlBody(payload) {
  const rows = [
    ['Torn name', payload.name],
    ['Level', payload.level],
    ['Contact', payload.contact || 'Not provided'],
    ['Focus', payload.focus],
    ['Activity', payload.activity],
    ['Page', payload.page || 'Not provided'],
    ['Submitted', new Date().toISOString()],
  ];

  const rowHtml = rows.map(([label, value]) => (
    `<tr><th align="left" style="padding:6px 10px;border-bottom:1px solid #ddd;">${escapeHtml(label)}</th>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #ddd;">${escapeHtml(value)}</td></tr>`
  )).join('');

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">',
    `  <h2 style="margin:0 0 12px;">New ${escapeHtml(SITE_NAME)} Contact Submission</h2>`,
    `  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">${rowHtml}</table>`,
    '  <h3 style="margin:0 0 8px;">Message</h3>',
    `  <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml(payload.message)}</pre>`,
    '</div>',
  ].join('\n');
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
