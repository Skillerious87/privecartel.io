const SITE_NAME = 'Prive Cartel';
const SOURCE_TOKEN = 'prive-contact-v1';
const DEFAULT_TO_EMAIL = 'skillerious@gmail.com';

function doPost(event) {
  try {
    const payload = parsePayload_(event);
    validatePayload_(payload);

    const toEmail = getToEmail_();
    const subject = `[${SITE_NAME}] Application from ${clean_(payload.name)}`;
    const plainBody = buildPlainBody_(payload);
    const htmlBody = buildHtmlBody_(payload);
    const options = {
      name: `${SITE_NAME} Contact`,
      htmlBody,
    };

    if (isValidEmail_(payload.contact)) {
      options.replyTo = String(payload.contact).trim();
    }

    MailApp.sendEmail(toEmail, subject, plainBody, options);

    return json_({
      ok: true,
      remainingDailyQuota: MailApp.getRemainingDailyQuota(),
    });
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function doGet() {
  return json_({
    ok: true,
    service: `${SITE_NAME} Gmail contact mailer`,
  });
}

function getToEmail_() {
  const configured = PropertiesService.getScriptProperties().getProperty('CONTACT_TO_EMAIL');
  const toEmail = String(configured || DEFAULT_TO_EMAIL).trim();
  if (!isValidEmail_(toEmail)) {
    throw new Error('CONTACT_TO_EMAIL must be a valid email address.');
  }
  return toEmail;
}

function parsePayload_(event) {
  const postData = event && event.postData;
  if (postData && postData.contents) {
    const contents = String(postData.contents || '');
    if (contents.trim().charAt(0) === '{') {
      return JSON.parse(contents);
    }
  }

  return event && event.parameter ? event.parameter : {};
}

function validatePayload_(payload) {
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

function buildPlainBody_(payload) {
  return [
    `New ${SITE_NAME} contact submission`,
    '',
    `Torn name: ${clean_(payload.name)}`,
    `Level: ${clean_(payload.level)}`,
    `Contact: ${clean_(payload.contact || 'Not provided')}`,
    `Focus: ${clean_(payload.focus)}`,
    `Activity: ${clean_(payload.activity)}`,
    `Page: ${clean_(payload.page || 'Not provided')}`,
    '',
    'Message:',
    String(payload.message || '').trim(),
    '',
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n');
}

function buildHtmlBody_(payload) {
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
    `<tr><th align="left" style="padding:6px 10px;border-bottom:1px solid #ddd;">${escapeHtml_(label)}</th>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #ddd;">${escapeHtml_(value)}</td></tr>`
  )).join('');

  return [
    '<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111;">',
    `  <h2 style="margin:0 0 12px;">New ${escapeHtml_(SITE_NAME)} Contact Submission</h2>`,
    `  <table cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">${rowHtml}</table>`,
    '  <h3 style="margin:0 0 8px;">Message</h3>',
    `  <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${escapeHtml_(payload.message)}</pre>`,
    '</div>',
  ].join('\n');
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isValidEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
