#!/usr/bin/env node
/**
 * deploy-to-vibe-pipelines.js — Upload pipeline ideas to vibe-pipelines.lths.ai
 *
 * Usage:
 *   node scripts/deploy-to-vibe-pipelines.js breakfast-occasions
 *   node scripts/deploy-to-vibe-pipelines.js --all
 *
 * Uploads all files in pipeline/{slug}/ via the /api/pipelines/upload endpoint.
 * The React app renders them with full navigation (brief, sketches, competitors, etc.)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PIPELINE_DIR = path.join(__dirname, '..', 'pipeline');
const API_BASE = 'https://vibe-pipelines.lths.ai';

const SKIP_FILES = new Set(['.DS_Store', '.state.json', '.claims.json', '.pipeline-id']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'hifi']);

function collectFiles(dir, baseDir, files = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (SKIP_FILES.has(entry)) continue;
    if (entry.startsWith('.') && entry !== '.briefdata.json') continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      collectFiles(full, baseDir, files);
    } else {
      const rel = path.relative(baseDir, full);
      files.push({ path: rel, fullPath: full });
    }
  }
  return files;
}

function uploadPipeline(slug) {
  return new Promise((resolve, reject) => {
    const ideaDir = path.join(PIPELINE_DIR, slug);
    if (!fs.existsSync(ideaDir)) {
      return reject(new Error(`Directory not found: pipeline/${slug}/`));
    }

    // Read pipeline ID for the folder name
    const pidFile = path.join(ideaDir, '.pipeline-id');
    const pid = fs.existsSync(pidFile) ? fs.readFileSync(pidFile, 'utf8').trim() : slug;

    const files = collectFiles(ideaDir, ideaDir);
    if (files.length === 0) {
      return reject(new Error(`No files found in pipeline/${slug}/`));
    }

    // Build multipart form data
    const boundary = '----PipelineUpload' + Date.now();
    const parts = [];

    // Add paths[] JSON field
    const pathsJson = JSON.stringify(files.map(f => `${pid}/${f.path}`));
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="paths"\r\n\r\n` +
      pathsJson + '\r\n'
    );

    // Add each file
    for (const f of files) {
      const content = fs.readFileSync(f.fullPath);
      const filename = f.path.replace(/\//g, '_'); // flatten for multipart
      parts.push(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="folder"; filename="${filename}"\r\n` +
        `Content-Type: application/octet-stream\r\n\r\n`
      );
      parts.push(content);
      parts.push('\r\n');
    }

    parts.push(`--${boundary}--\r\n`);

    // Concatenate into a single buffer
    const buffers = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
    const body = Buffer.concat(buffers);

    const url = new URL(`${API_BASE}/api/pipelines/upload`);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    };

    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const result = JSON.parse(data);
            resolve({ slug: pid, files: files.length, ...result.data });
          } catch {
            resolve({ slug: pid, files: files.length, raw: data });
          }
        } else {
          reject(new Error(`Upload failed (${res.statusCode}): ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);

  let slugs;
  if (args.includes('--all')) {
    slugs = fs.readdirSync(PIPELINE_DIR).filter(d => {
      const full = path.join(PIPELINE_DIR, d);
      return fs.statSync(full).isDirectory() && !d.startsWith('.') && !d.startsWith('_');
    });
  } else {
    slugs = args.filter(a => !a.startsWith('-'));
  }

  if (slugs.length === 0) {
    console.error('Usage: deploy-to-vibe-pipelines.js <slug> [<slug>...] | --all');
    process.exit(1);
  }

  console.log(`Deploying ${slugs.length} idea(s) to ${API_BASE}\n`);

  for (const slug of slugs) {
    try {
      const result = await uploadPipeline(slug);
      console.log(`  ✓ ${slug} → ${result.slug} (${result.files} files)`);
      if (result.title) console.log(`    Title: ${result.title}`);
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
    }
  }

  console.log(`\nDone. View at ${API_BASE}`);
}

main().catch(err => { console.error(err); process.exit(1); });
