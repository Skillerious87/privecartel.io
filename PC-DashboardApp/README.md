# Priv&eacute; Cartel Dashboard

Static GitHub Pages dashboard for publishing and restoring a maintenance lander.

## Files

- `index.html` - dashboard shell
- `assets/css/dashboard.css` - dashboard styling
- `assets/js/github-api.js` - browser GitHub REST/Git Data API client
- `assets/js/maintenance-template.js` - generated maintenance page template
- `assets/js/app.js` - dashboard state and button workflow
- `assets/media/emblem.png` - local brand asset

## GitHub Token

Use a fine-grained GitHub token with read/write Contents permission for the target repository. The app runs entirely in the browser. The token is sent only to GitHub API requests and, if you opt in, is retained only for the current browser session.

## What Publish Does

The publish button creates one Git commit that:

- backs up the current `index.html` to `pc-dashboard/backups/`
- replaces `index.html` with the generated maintenance lander
- writes `pc-dashboard/maintenance-state.json`

## What Restore Does

The restore button creates one Git commit that:

- reads the backup path from `pc-dashboard/maintenance-state.json`
- restores the backup to `index.html`
- marks maintenance as inactive in the state file

## Running

Open `index.html` directly, or publish this folder to GitHub Pages. A static server is recommended for local testing:

```powershell
python -m http.server 8080
```
