#!/usr/bin/env node
/**
 * data-cleaner.js
 * One-click cleaner for test temp data and expired test accounts.
 * - Safe by default (dry-run), enable --apply to execute deletions/updates
 * - Structured JSON logs for CI/CD, human-friendly console output
 * - Exit codes for pipelines (0: success, 1: failure)
 * - Supports local scripts and HTTP webhook cleanup targets
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');
const http = require('http');

// -------- Config --------
const CONFIG = {
  // Patterns/folders to purge (temp artifacts, reports, caches)
  paths: [
    'tmp',
    'temp',
    'coverage',
    'reports/tmp',
    'reports/.cache',
    '.cache',
    'playwright-report',
    'artifacts',
  ],
  // File glob-like suffixes considered disposable
  fileSuffixes: ['.tmp', '.log.old', '.bak', '.retry', '.failed-screenshots.zip'],
  // Expired test account rule
  testAccount: {
    prefix: process.env.TEST_USER_PREFIX || 'test+',
    domain: process.env.TEST_USER_DOMAIN || 'example.com',
    expireDays: Number(process.env.TEST_USER_EXPIRE_DAYS || 7),
  },
  // Optional webhooks for external cleanup services
  webhooks: (process.env.DATA_CLEANER_WEBHOOKS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
  // Shell commands to run for framework-specific cleanup
  commands: [
    // e.g., clear Playwright traces
    'npx playwright show-trace --help > nul 2>&1 || true',
  ],
};

// -------- CLI Flags --------
const FLAGS = {
  apply: process.argv.includes('--apply') || process.env.DATA_CLEANER_APPLY === 'true',
  verbose: process.argv.includes('--verbose') || process.env.DATA_CLEANER_VERBOSE === 'true',
  json: process.argv.includes('--json') || process.env.DATA_CLEANER_JSON === 'true',
};

function log(level, message, meta = {}) {
  const entry = { ts: new Date().toISOString(), level, message, ...meta };
  if (FLAGS.json) {
    console.log(JSON.stringify(entry));
  } else {
    const tag = level.toUpperCase().padEnd(5);
    console.log(`[${tag}] ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`);
  }
}

function resolvePath(p) {
  return path.resolve(process.cwd(), p);
}

function isOlderThan(filePath, days) {
  try {
    const stat = fs.statSync(filePath);
    const ageMs = Date.now() - stat.mtimeMs;
    return ageMs > days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function safeUnlink(file) {
  if (FLAGS.apply) {
    try {
      fs.unlinkSync(file);
      log('info', 'Deleted file', { file });
    } catch (e) {
      log('error', 'Failed to delete file', { file, error: String(e) });
      return false;
    }
  } else {
    log('info', 'Dry-run delete file', { file });
  }
  return true;
}

function safeRmdir(dir) {
  if (FLAGS.apply) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      log('info', 'Removed directory', { dir });
    } catch (e) {
      log('error', 'Failed to remove directory', { dir, error: String(e) });
      return false;
    }
  } else {
    log('info', 'Dry-run remove directory', { dir });
  }
  return true;
}

function walkDir(dir, cb) {
  try {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      const stat = fs.lstatSync(full);
      cb(full, stat);
      if (stat.isDirectory()) walkDir(full, cb);
    }
  } catch (e) {
    // ignore missing folders
  }
}

async function runCommand(cmd) {
  return new Promise(resolve => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) {
        log('warn', 'Command failed', { cmd, error: err.code || String(err) });
        return resolve({ ok: false, stdout, stderr });
      }
      if (FLAGS.verbose && stdout) log('info', 'Command stdout', { cmd, stdout: stdout.slice(0, 2000) });
      if (FLAGS.verbose && stderr) log('info', 'Command stderr', { cmd, stderr: stderr.slice(0, 2000) });
      resolve({ ok: true, stdout, stderr });
    });
  });
}

async function callWebhook(url, payload) {
  return new Promise(resolve => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          const ok = res.statusCode >= 200 && res.statusCode < 300;
          if (!ok) log('warn', 'Webhook non-2xx', { url, status: res.statusCode, body: data.slice(0, 2000) });
          else if (FLAGS.verbose) log('info', 'Webhook ok', { url, status: res.statusCode });
          resolve({ ok, status: res.statusCode, body: data });
        });
      });
      req.on('error', err => {
        log('error', 'Webhook error', { url, error: String(err) });
        resolve({ ok: false, error: String(err) });
      });
      req.write(JSON.stringify(payload));
      req.end();
    } catch (e) {
      log('error', 'Webhook exception', { url, error: String(e) });
      resolve({ ok: false, error: String(e) });
    }
  });
}

function buildTestEmailRegex(prefix, domain) {
  // Matches: prefixANYTHING@domain
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${esc(prefix)}.+@${esc(domain)}$`, 'i');
}

async function cleanFileSystem() {
  log('info', 'Start filesystem cleanup');
  let removed = 0;

  // Remove known folders
  for (const p of CONFIG.paths) {
    const abs = resolvePath(p);
    if (fs.existsSync(abs)) {
      if (safeRmdir(abs)) removed++;
    } else if (FLAGS.verbose) {
      log('info', 'Path not found (skip)', { path: abs });
    }
  }

  // Remove disposable files and old artifacts under repo
  walkDir(process.cwd(), (full, stat) => {
    if (stat.isFile()) {
      if (CONFIG.fileSuffixes.some(suf => full.endsWith(suf))) {
        if (safeUnlink(full)) removed++;
        return;
      }
      // delete junit or trx older than 14 days
      if ((full.endsWith('.xml') || full.endsWith('.trx')) && /junit|test/i.test(full)) {
        if (isOlderThan(full, 14) && safeUnlink(full)) removed++;
      }
    }
  });

  return { removed };
}

async function cleanTestAccounts() {
  // Placeholder: integrates with your user store.
  // Expose hook via webhook or local script `npm run users:prune`
  const regex = buildTestEmailRegex(CONFIG.testAccount.prefix, CONFIG.testAccount.domain);
  const payload = {
    action: FLAGS.apply ? 'prune' : 'preview',
    rule: { prefix: CONFIG.testAccount.prefix, domain: CONFIG.testAccount.domain, expireDays: CONFIG.testAccount.expireDays },
  };

  let ok = true;

  // Try local script if present
  const pkgPath = resolvePath('package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.scripts && pkg.scripts['users:prune']) {
        const cmd = FLAGS.apply ? 'npm run -s users:prune' : 'npm run -s users:prune -- --dry-run';
        const res = await runCommand(cmd);
        ok = ok && !!res.ok;
      }
    } catch (e) {
      log('warn', 'Failed to read package.json', { error: String(e) });
    }
  }

  // Webhooks
  for (const url of CONFIG.webhooks) {
    const res = await callWebhook(url, payload);
    ok = ok && res.ok;
  }

  // In absence of integrations, just log a guidance message
  if (CONFIG.webhooks.length === 0) {
    log('warn', 'No webhooks configured for account pruning. Set DATA_CLEANER_WEBHOOKS.');
  }

  return { ok };
}

async function main() {
  const start = Date.now();
  log('info', 'Data cleaner started', { flags: FLAGS, config: { paths: CONFIG.paths, suffixes: CONFIG.fileSuffixes } });

  let success = true;
  const fsRes = await cleanFileSystem();
  log('info', 'Filesystem cleanup finished', { removed: fsRes.removed });

  const accRes = await cleanTestAccounts();
  success = success && accRes.ok;
  log('info', 'Account cleanup finished', { ok: accRes.ok });

  // Framework-specific commands
  for (const cmd of CONFIG.commands) {
    const res = await runCommand(cmd);
    success = success && !!res.ok;
  }

  const ms = Date.now() - start;
  log(success ? 'info' : 'error', 'Data cleaner completed', { durationMs: ms, success });
  process.exitCode = success ? 0 : 1;
}

main().catch(e => {
  log('error', 'Unhandled error', { error: String(e) });
  process.exitCode = 1;
});
