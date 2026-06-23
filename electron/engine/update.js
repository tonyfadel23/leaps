// update.js — lightweight update check against GitHub Releases.
//
// LEAPs ships UNSIGNED (it's free OSS, no Apple Developer identity). On macOS a
// signed app is required for true silent self-update (Squirrel.Mac). So instead
// of pretending, we do the honest thing: CHECK the latest GitHub release and
// NOTIFY. The user updates by downloading the new build — or, if they run from
// source (the recommended path), by `git pull`.
//
// If a maintainer later signs + notarizes the app, swap this module for
// electron-updater pointed at the same GitHub releases feed — the seam is the
// same (checkForUpdates -> notify).

const https = require('https');

// Pull {owner, repo} out of package.json's repository field.
function parseRepo(pkg) {
  const url = (pkg && pkg.repository && (pkg.repository.url || pkg.repository)) || '';
  const m = String(url).match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

// Compare dotted versions. Returns 1 if a>b, -1 if a<b, 0 if equal. Ignores a
// leading "v" and any pre-release suffix.
function cmpVersions(a, b) {
  const norm = (v) => String(v).replace(/^v/, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const pa = norm(a), pb = norm(b);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function fetchLatest(owner, repo) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/latest`,
      headers: { 'User-Agent': 'LEAPs-app', 'Accept': 'application/vnd.github+json' },
      timeout: 6000,
    }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

// checkForUpdates(pkg, currentVersion) ->
//   { available: true, latest, url, current }   when a newer release exists
//   { available: false, current }               when up to date
//   { available: false, error }                 when the check couldn't run
async function checkForUpdates(pkg, currentVersion) {
  const repo = parseRepo(pkg);
  if (!repo) return { available: false, error: 'no GitHub repository configured in package.json' };
  try {
    const rel = await fetchLatest(repo.owner, repo.repo);
    const latest = rel.tag_name || rel.name || '';
    return {
      available: cmpVersions(latest, currentVersion) > 0,
      latest,
      url: rel.html_url,
      current: currentVersion,
    };
  } catch (e) {
    return { available: false, error: e.message, current: currentVersion };
  }
}

module.exports = { checkForUpdates, cmpVersions, parseRepo };
