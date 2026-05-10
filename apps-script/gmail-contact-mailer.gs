const SITE_NAME = 'Prive Cartel';
const SOURCE_TOKEN = 'prive-contact-v1';
const DEFAULT_TO_EMAIL = 'skillerious@gmail.com';
const SITE_URL = 'https://www.privecartel.com';
const EMBLEM_URL = `${SITE_URL}/images/Emblem.png`;

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
  const submitted = new Date().toISOString();

  return [
    `${SITE_NAME} application dossier`,
    '================================',
    '',
    `Torn name: ${clean_(payload.name)}`,
    `Level: ${clean_(payload.level)}`,
    `Contact: ${clean_(payload.contact || 'Not provided')}`,
    `Focus: ${clean_(payload.focus)}`,
    `Activity: ${clean_(payload.activity)}`,
    `Page: ${clean_(payload.page || 'Not provided')}`,
    `Submitted: ${submitted}`,
    '',
    'Message:',
    String(payload.message || '').trim(),
  ].join('\n');
}

function buildHtmlBody_(payload) {
  const submitted = new Date().toISOString();
  const name = clean_(payload.name);
  const level = clean_(payload.level);
  const contact = clean_(payload.contact || 'Not provided');
  const focus = clean_(payload.focus);
  const activity = clean_(payload.activity);
  const page = clean_(payload.page || SITE_URL);
  const contactHtml = isValidEmail_(payload.contact)
    ? `<a href="mailto:${escapeAttr_(contact)}" style="color:#d6c579;text-decoration:none;">${escapeHtml_(contact)}</a>`
    : escapeHtml_(contact);
  const pageHtml = isValidUrl_(page)
    ? `<a href="${escapeAttr_(page)}" style="color:#d6c579;text-decoration:none;">${escapeHtml_(page)}</a>`
    : escapeHtml_(page);

  const rows = [
    ['Torn name', escapeHtml_(name)],
    ['Reply contact', contactHtml],
    ['Primary focus', escapeHtml_(focus)],
    ['Activity pattern', escapeHtml_(activity)],
    ['Source page', pageHtml],
    ['Submitted', escapeHtml_(submitted)],
  ];

  const rowHtml = rows.map(([label, valueHtml]) => infoRow_(label, valueHtml)).join('');
  const messageHtml = escapeHtml_(String(payload.message || '').trim()).replace(/\n/g, '<br>');

  return [
    '<!doctype html>',
    '<html>',
    '<body style="margin:0;padding:0;background:#050505;color:#e8e2ce;font-family:Arial,Helvetica,sans-serif;">',
    `  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">New ${escapeHtml_(SITE_NAME)} application from ${escapeHtml_(name)}.</div>`,
    '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#050505" style="width:100%;background:#050505;margin:0;padding:0;">',
    '    <tr>',
    '      <td align="center" style="padding:28px 12px;">',
    '        <table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;border-collapse:separate;border-spacing:0;background:#100f0b;border:1px solid #3a3322;border-radius:12px;overflow:hidden;">',
    '          <tr>',
    '            <td style="padding:24px 26px;background:#080807;border-bottom:1px solid #3a3322;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '                <tr>',
    `                  <td width="76" valign="middle" style="width:76px;padding-right:16px;"><img src="${escapeAttr_(EMBLEM_URL)}" alt="${escapeAttr_(SITE_NAME)}" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:50%;border:1px solid #d6c579;background:#050505;"></td>`,
    '                  <td valign="middle">',
    '                    <div style="color:#d6c579;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">New Contact Submission</div>',
    `                    <h1 style="margin:7px 0 6px;color:#f5edcf;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;font-weight:600;">Application from ${escapeHtml_(name)}</h1>`,
    `                    <div style="color:#aaa080;font-size:14px;line-height:1.5;">Level ${escapeHtml_(level)} | ${escapeHtml_(focus)} | ${escapeHtml_(activity)}</div>`,
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:22px 26px 8px;background:#100f0b;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '                <tr>',
    `                  ${metricCard_('Applicant', name)}`,
    `                  ${metricCard_('Level', level)}`,
    `                  ${metricCard_('Focus', focus)}`,
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:10px 26px 0;background:#100f0b;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border-spacing:0;background:#17140f;border:1px solid #3a3322;border-radius:10px;">',
    '                <tr>',
    '                  <td style="padding:16px 18px;">',
    '                    <div style="color:#d6c579;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Applicant Message</div>',
    `                    <div style="color:#f2ead0;font-size:15px;line-height:1.65;white-space:pre-wrap;">${messageHtml}</div>`,
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:18px 26px 24px;background:#100f0b;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">',
    `                ${rowHtml}`,
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td style="padding:16px 26px;background:#080807;border-top:1px solid #3a3322;color:#807861;font-size:12px;line-height:1.5;">',
    `              Sent from <a href="${escapeAttr_(SITE_URL)}" style="color:#d6c579;text-decoration:none;">${escapeHtml_(SITE_URL)}</a>. If the reply contact is an email address, reply directly to this message.`,
    '            </td>',
    '          </tr>',
    '        </table>',
    '      </td>',
    '    </tr>',
    '  </table>',
    '</body>',
    '</html>',
  ].join('\n');
}

function metricCard_(label, value) {
  return [
    '<td width="33.333%" valign="top" style="padding:0 6px 12px 0;">',
    '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#17140f;border:1px solid #3a3322;border-radius:9px;">',
    '    <tr>',
    '      <td style="padding:12px 14px;">',
    `        <div style="color:#8f8464;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;">${escapeHtml_(label)}</div>`,
    `        <div style="color:#f5edcf;font-size:16px;line-height:1.35;font-weight:700;margin-top:4px;">${escapeHtml_(value || 'Not provided')}</div>`,
    '      </td>',
    '    </tr>',
    '  </table>',
    '</td>',
  ].join('');
}

function infoRow_(label, valueHtml) {
  return [
    '<tr>',
    `  <th align="left" valign="top" style="width:150px;padding:10px 0;border-bottom:1px solid #292316;color:#8f8464;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;">${escapeHtml_(label)}</th>`,
    `  <td valign="top" style="padding:10px 0 10px 14px;border-bottom:1px solid #292316;color:#e8e2ce;font-size:14px;line-height:1.45;">${valueHtml}</td>`,
    '</tr>',
  ].join('');
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

function isValidUrl_(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value || '').trim());
}

function escapeAttr_(value) {
  return escapeHtml_(value);
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
