const SITE_NAME = 'Privé Cartel';
const SOURCE_TOKEN = 'prive-contact-v1';
const DEFAULT_TO_EMAIL = 'skillerious@gmail.com';
const SITE_URL = 'https://www.privecartel.com';
const EMBLEM_URL = `${SITE_URL}/images/Emblem.png`;
const EMAIL_TEMPLATE_VERSION = 'prive-application-v4';
const GLOBAL_COOLDOWN_SECONDS = 10;
const APPLICANT_COOLDOWN_SECONDS = 5 * 60;

function doPost(event) {
  try {
    const payload = parsePayload_(event);
    validatePayload_(payload);
    enforceSubmissionCooldown_(payload);

    const toEmail = getToEmail_();
    const subject = `[${SITE_NAME}] New application — ${clean_(payload.name)}, Level ${clean_(payload.level)}`;
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
      templateVersion: EMAIL_TEMPLATE_VERSION,
      remainingDailyQuota: MailApp.getRemainingDailyQuota(),
    });
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function enforceSubmissionCooldown_(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const cache = CacheService.getScriptCache();
    const globalKey = 'contact_global_cooldown';
    const applicantKey = `contact_applicant_${digestKey_([
      clean_(payload.name).toLowerCase(),
      clean_(payload.contact).toLowerCase(),
    ].join('|'))}`;

    if (cache.get(globalKey)) {
      throw new Error('Submissions are arriving too quickly. Please wait a few seconds and try again.');
    }

    if (cache.get(applicantKey)) {
      throw new Error('This applicant was submitted recently. Please wait a few minutes before trying again.');
    }

    cache.put(globalKey, '1', GLOBAL_COOLDOWN_SECONDS);
    cache.put(applicantKey, '1', APPLICANT_COOLDOWN_SECONDS);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({
    ok: true,
    service: `${SITE_NAME} Gmail contact mailer`,
    templateVersion: EMAIL_TEMPLATE_VERSION,
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
    `${SITE_NAME.toUpperCase()} — NEW FACTION APPLICATION`,
    '================================================',
    '',
    'APPLICANT',
    `Torn name: ${clean_(payload.name)}`,
    `Level: ${clean_(payload.level)}`,
    `Focus: ${clean_(payload.focus)}`,
    `Activity: ${clean_(payload.activity)}`,
    '',
    'REPLY CONTACT',
    clean_(payload.contact || 'Not provided'),
    '',
    'APPLICANT MESSAGE',
    String(payload.message || '').trim(),
    '',
    'SUBMISSION RECORD',
    `Source page: ${clean_(payload.page || 'Not provided')}`,
    `Submitted: ${submitted}`,
    '',
    'PRIVACY & RETENTION',
    'Keep applicant contact details restricted to council review. Securely delete this email and any copied details after the application decision is recorded.',
  ].join('\n');
}

function buildHtmlBody_(payload) {
  const submittedDate = new Date();
  const submitted = submittedDate.toISOString();
  const submittedDisplay = submittedDate.toUTCString().replace('GMT', 'UTC');
  const name = clean_(payload.name);
  const level = clean_(payload.level);
  const contact = clean_(payload.contact || 'Not provided');
  const focus = clean_(payload.focus);
  const activity = clean_(payload.activity);
  const page = clean_(payload.page || SITE_URL);
  const contactKind = getContactKind_(payload.contact);
  const contactHref = contactKind === 'Email address'
    ? `mailto:${contact}?subject=${encodeURIComponent(`[${SITE_NAME}] Application follow-up`)}`
    : contactKind === 'Torn ID'
      ? `https://www.torn.com/profiles.php?XID=${encodeURIComponent(contact)}`
      : '';
  const contactAction = contactKind === 'Email address'
    ? 'Reply by email'
    : contactKind === 'Torn ID'
      ? 'Open Torn profile'
      : '';
  const contactHtml = contactHref
    ? `<a href="${escapeAttr_(contactHref)}" style="color:#f7edc8;text-decoration:none;">${escapeHtml_(contact)}</a>`
    : escapeHtml_(contact);
  const pageHtml = isValidUrl_(page)
    ? `<a href="${escapeAttr_(page)}" style="color:#d6c579;text-decoration:none;">Open submission page</a>`
    : escapeHtml_(page);

  const rows = [
    ['Source page', pageHtml],
    ['Submitted', `<span title="${escapeAttr_(submitted)}">${escapeHtml_(submittedDisplay)}</span>`],
  ];

  const rowHtml = rows.map(([label, valueHtml]) => infoRow_(label, valueHtml)).join('');
  const messageHtml = escapeHtml_(String(payload.message || '').trim()).replace(/\n/g, '<br>');
  const contactActionHtml = contactAction
    ? [
      '                  <td class="reply-action" valign="middle" align="right" style="padding:16px 18px 16px 0;">',
      '                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="reply-button" style="border-collapse:separate;">',
      '                      <tr>',
      '                        <td bgcolor="#d6b85c" style="background:#d6b85c;border:1px solid #efd989;border-radius:7px;">',
      `                          <a href="${escapeAttr_(contactHref)}" style="display:inline-block;padding:11px 15px;color:#0b0a08;font-size:13px;line-height:1;font-weight:700;text-decoration:none;white-space:nowrap;">${escapeHtml_(contactAction)} &nbsp;→</a>`,
      '                        </td>',
      '                      </tr>',
      '                    </table>',
      '                  </td>',
    ].join('\n')
    : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width,initial-scale=1">',
    '  <meta name="color-scheme" content="dark">',
    '  <meta name="supported-color-schemes" content="dark">',
    '  <style>',
    '    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}',
    '    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}',
    '    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}',
    '    @media screen and (max-width:640px){',
    '      .email-outer{padding:0!important;}',
    '      .email-shell{width:100%!important;border-left:0!important;border-right:0!important;border-radius:0!important;}',
    '      .email-pad{padding-left:20px!important;padding-right:20px!important;}',
    '      .email-header-logo{width:58px!important;padding-right:13px!important;}',
    '      .email-header-logo img{width:48px!important;height:48px!important;}',
    '      .email-title{font-size:27px!important;}',
    '      .header-status{display:none!important;}',
    '      .metric-cell{display:block!important;width:100%!important;padding:0 0 8px!important;}',
    '      .reply-copy,.reply-action{display:block!important;width:100%!important;text-align:left!important;}',
    '      .reply-action{padding-top:0!important;padding-left:18px!important;padding-bottom:16px!important;}',
    '      .detail-label,.detail-value{display:block!important;width:100%!important;padding-left:0!important;}',
    '      .detail-label{padding-bottom:3px!important;border-bottom:0!important;}',
    '      .detail-value{padding-top:0!important;}',
    '    }',
    '  </style>',
    '</head>',
    '<body style="margin:0;padding:0;background:#050505;color:#e8e2ce;font-family:Arial,Helvetica,sans-serif;">',
    `  <div aria-hidden="true" style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">New faction application from ${escapeHtml_(name)} · Level ${escapeHtml_(level)} · ${escapeHtml_(focus)}.</div>`,
    '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#050505" style="width:100%;background:#050505;margin:0;padding:0;">',
    '    <tr>',
    '      <td align="center" class="email-outer" style="padding:32px 12px;">',
    '        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" bgcolor="#100f0b" class="email-shell" style="width:100%;max-width:620px;border-collapse:separate;border-spacing:0;background:#100f0b;border:1px solid #413821;border-radius:10px;overflow:hidden;">',
    '          <tr>',
    '            <td height="3" bgcolor="#d6b85c" style="height:3px;line-height:3px;background:#d6b85c;font-size:0;">&nbsp;</td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#090908" class="email-pad" style="padding:25px 28px 23px;background:#090908;border-bottom:1px solid #332d1e;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '                <tr>',
    `                  <td width="70" valign="middle" class="email-header-logo" style="width:70px;padding-right:16px;"><img src="${escapeAttr_(EMBLEM_URL)}" alt="${escapeAttr_(SITE_NAME)}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;border:1px solid #a98f47;background:#050505;"></td>`,
    '                  <td valign="middle">',
    '                    <div style="color:#d6b85c;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Faction application</div>',
    `                    <h1 class="email-title" style="margin:6px 0 3px;color:#f7f0dc;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.08;font-weight:600;">${escapeHtml_(name)}</h1>`,
    `                    <div style="color:#a9a18d;font-size:13px;line-height:1.5;">Level ${escapeHtml_(level)} applicant · Submitted for council review</div>`,
    '                  </td>',
    '                  <td valign="top" align="right" class="header-status" style="padding-left:12px;">',
    '                    <span style="display:inline-block;padding:7px 9px;border:1px solid #5b4d28;border-radius:999px;color:#d6b85c;font-size:9px;line-height:1;letter-spacing:1px;text-transform:uppercase;font-weight:700;white-space:nowrap;">New application</span>',
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#100f0b" class="email-pad" style="padding:22px 28px 0;background:#100f0b;">',
    '              <div style="margin-bottom:11px;color:#8f8468;font-size:10px;line-height:1;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">Applicant snapshot</div>',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">',
    '                <tr>',
    `                  ${metricCard_('Level', level)}`,
    `                  ${metricCard_('Primary focus', focus)}`,
    `                  ${metricCard_('Activity', activity, true)}`,
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#100f0b" class="email-pad" style="padding:12px 28px 0;background:#100f0b;">',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1a1710" style="border-collapse:separate;border-spacing:0;background:#1a1710;border:1px solid #5a4c28;border-radius:8px;">',
    '                <tr>',
    '                  <td class="reply-copy" valign="middle" style="padding:16px 18px;">',
    `                    <div style="color:#9a8d69;font-size:10px;line-height:1;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:7px;">Best reply route · ${escapeHtml_(contactKind)}</div>`,
    `                    <div style="color:#f7edc8;font-size:16px;line-height:1.35;font-weight:700;word-break:break-word;">${contactHtml}</div>`,
    '                  </td>',
    contactActionHtml,
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#100f0b" class="email-pad" style="padding:20px 28px 0;background:#100f0b;">',
    '              <div style="margin-bottom:10px;color:#d6b85c;font-size:10px;line-height:1;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">Applicant message</div>',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0c0b09" style="border-collapse:separate;border-spacing:0;background:#0c0b09;border-left:3px solid #d6b85c;">',
    '                <tr>',
    '                  <td style="padding:17px 18px;color:#eee7d3;font-size:15px;line-height:1.7;word-break:break-word;">',
    `                    ${messageHtml}`,
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#100f0b" class="email-pad" style="padding:21px 28px 25px;background:#100f0b;">',
    '              <div style="margin-bottom:6px;color:#8f8468;font-size:10px;line-height:1;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">Submission record</div>',
    '              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">',
    `                ${rowHtml}`,
    '              </table>',
    '            </td>',
    '          </tr>',
    '          <tr>',
    '            <td bgcolor="#090908" class="email-pad" style="padding:17px 28px 19px;background:#090908;border-top:1px solid #332d1e;color:#817966;font-size:11px;line-height:1.55;">',
    '              <strong style="display:block;margin-bottom:4px;color:#b9aa7f;font-size:10px;letter-spacing:1.2px;text-transform:uppercase;">Privacy &amp; retention</strong>',
    '              This message contains applicant contact details. Keep access restricted to council review and securely delete this email and any copied details after the application decision is recorded.',
    `              <div style="margin-top:10px;color:#5f594b;">Sent from <a href="${escapeAttr_(SITE_URL)}" style="color:#9f916b;text-decoration:none;">${escapeHtml_(SITE_NAME)}</a> · ${escapeHtml_(EMAIL_TEMPLATE_VERSION)}</div>`,
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

function metricCard_(label, value, isLast) {
  return [
    `<td width="33.333%" valign="top" class="metric-cell" style="padding:0 ${isLast ? '0' : '7px'} 8px 0;">`,
    '  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#17140f" style="background:#17140f;border:1px solid #332d1e;border-radius:7px;">',
    '    <tr>',
    '      <td style="padding:12px 13px;">',
    `        <div style="color:#847b65;font-size:9px;letter-spacing:1.25px;text-transform:uppercase;font-weight:700;">${escapeHtml_(label)}</div>`,
    `        <div style="color:#f5edcf;font-size:15px;line-height:1.35;font-weight:700;margin-top:5px;word-break:break-word;">${escapeHtml_(value || 'Not provided')}</div>`,
    '      </td>',
    '    </tr>',
    '  </table>',
    '</td>',
  ].join('');
}

function infoRow_(label, valueHtml) {
  return [
    '<tr>',
    `  <th align="left" valign="top" class="detail-label" style="width:132px;padding:10px 0;border-bottom:1px solid #292419;color:#817862;font-size:10px;letter-spacing:1.15px;text-transform:uppercase;font-weight:700;">${escapeHtml_(label)}</th>`,
    `  <td valign="top" class="detail-value" style="padding:10px 0 10px 14px;border-bottom:1px solid #292419;color:#d9d2bf;font-size:13px;line-height:1.45;word-break:break-word;">${valueHtml}</td>`,
    '</tr>',
  ].join('');
}

function getContactKind_(value) {
  const contact = clean_(value);
  if (isValidEmail_(contact)) return 'Email address';
  if (/^\d{1,10}$/.test(contact)) return 'Torn ID';
  if (contact && contact !== 'Not provided') return 'Discord contact';
  return 'Not provided';
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function digestKey_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );

  return bytes
    .map((byte) => (`0${(byte & 0xff).toString(16)}`).slice(-2))
    .join('')
    .slice(0, 32);
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
