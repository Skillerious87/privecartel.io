# GitHub Pages Gmail Contact Setup

GitHub Pages cannot run `/api/contact` because it only hosts static files. That is why the live site returned `405 Method Not Allowed`.

For GitHub Pages, use Google Apps Script as the free Gmail mail endpoint. The contact page posts to Apps Script, and Apps Script sends the email from your Google account.

This does not need an SMTP password. Do not put `SMTP_PASS` in GitHub Pages.

## Deploy the Gmail endpoint

1. Open https://script.google.com/ while signed in as `skillerious@gmail.com`.
2. Create a new Apps Script project.
3. Copy the contents of `apps-script/gmail-contact-mailer.gs` into `Code.gs`.
4. Open **Project Settings** > **Script Properties**.
5. Add this property:

```text
CONTACT_TO_EMAIL=skillerious@gmail.com
```

6. Click **Deploy** > **New deployment**.
7. Choose **Web app**.
8. Set **Execute as** to **Me**.
9. Set **Who has access** to **Anyone**.
10. Deploy and authorize the script when Google asks.
11. Copy the Web app URL. Use the `/exec` URL, not the `/dev` URL.

## Connect the website

Open `assets/contact-config.js` and replace:

```js
window.PRIVE_CONTACT_ENDPOINT = '';
```

with:

```js
window.PRIVE_CONTACT_ENDPOINT = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_EXEC_URL';
```

Commit and push the updated file to GitHub Pages.

## Test

1. Open `https://www.privecartel.com/contact.html`.
2. Fill in the application form.
3. Click **Send Application**.
4. Check `skillerious@gmail.com`.

## Security

The Gmail app password that was shared earlier is not needed for this GitHub Pages setup. Revoke that app password in your Google Account settings, because it has been exposed in chat.

If you specifically want to use `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASS`, the site must be hosted on a Node-capable platform instead of GitHub Pages.

## Submission Protection

The contact page blocks repeat clicks with a visible cooldown. The Apps Script mailer also rejects submissions that arrive too quickly and blocks the same applicant for a few minutes after a successful submission.

When `apps-script/gmail-contact-mailer.gs` changes, deploy a **new version** of the Apps Script Web App from **Deploy** > **Manage deployments**.

After deployment, open the Web App `/exec` URL in your browser. The JSON response should include:

```json
"templateVersion": "prive-theme-v3"
```

If it does not, Google is still serving an older Apps Script deployment.
