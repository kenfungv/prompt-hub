#!/usr/bin/env node
/*
  scripts/demo-prompt-upload.js
  Purpose: Bulk-create demo Prompts to your Prompt Marketplace API and verify via POST tests.

  Features
  - Reads demo prompts from local JSON or inlined fallback
  - Streams POST requests with rate limiting and retries (exponential backoff)
  - Optional dry-run to preview payloads
  - CI-friendly exit codes, concise summary, and JUnit-style report output
  - Supports API key auth via header

  Usage
  - API_BASE_URL=https://api.example.com PROMPT_API_KEY=xxxxx node scripts/demo-prompt-upload.js \
      --collection demo --tags demo,starter --concurrency 4 --limit 50
  - Add --dryRun to avoid actual POSTs
  - Add --junit out/report.xml to emit test report

  Expected API
  - POST `${API_BASE_URL}/v1/prompts` with JSON body:
    { title, description, content, tags: string[], collection: string }
  - Auth via header: Authorization: Bearer <key>
*/

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function log(msg) { console.log(`[demo-prompt-upload] ${msg}`); }
function err(msg) { console.error(`[demo-prompt-upload][ERR] ${msg}`); }

// Simple CLI args
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
  return def;
}

const API_BASE_URL = process.env.API_BASE_URL || getArg('base', 'http://localhost:3000');
const API_KEY = process.env.PROMPT_API_KEY || process.env.API_KEY || getArg('key');
const COLLECTION = getArg('collection', 'demo');
const TAGS = (getArg('tags', 'demo') || '').split(',').map(s => s.trim()).filter(Boolean);
const CONCURRENCY = parseInt(getArg('concurrency', '4'), 10);
const LIMIT = getArg('limit') ? parseInt(getArg('limit'), 10) : undefined;
const INPUT = getArg('input'); // path to JSON file array
const DRY_RUN = !!getArg('dryRun', false);
const TIMEOUT_MS = parseInt(getArg('timeout', '15000'), 10);
const JUNIT = getArg('junit'); // path to xml

// Default demo prompts (fallback)
const defaultPrompts = [
  {
    title: 'Email Summarizer',
    description: 'Summarize an email thread into bullet points and action items.',
    content: 'Summarize the following email thread into 5 bullets and list next actions.',
  },
  {
    title: 'SQL to Natural Language',
    description: 'Explain what a given SQL query does in plain English.',
    content: 'Explain this SQL query and potential performance issues: {{sql}}',
  },
  {
    title: 'Product Requirements Generator',
    description: 'Generate a concise PRD from a one-line product idea.',
    content: 'Turn this idea into a PRD with goals, requirements, and KPIs: {{idea}}',
  },
  {
    title: 'Customer Support Triage',
    description: 'Classify and route support tickets with priority suggestions.',
    content: 'Classify this ticket: category, urgency (1-5), and routing team. Ticket: {{text}}',
  },
];

function readInput(filePath) {
  if (!filePath) return defaultPrompts;
  const full = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(full, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Input JSON must be an array of prompts');
  return data;
}

function buildPayload(item) {
  return {
    title: item.title,
    description: item.description || '',
    content: item.content,
    tags: Array.from(new Set([...(item.tags || []), ...TAGS])).filter(Boolean),
    collection: item.collection || COLLECTION,
  };
}

function requestJson(method, urlStr, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === 'https:' ? https : http;
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + (u.search || ''),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
      timeout: TIMEOUT_MS,
    };
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        const status = res.statusCode || 0;
        const ok = status >= 200 && status < 300;
        let json;
        try { json = data ? JSON.parse(data) : {}; } catch (e) { json = { raw: data }; }
        if (ok) return resolve({ status, json, headers: res.headers });
        const error = new Error(`HTTP ${status}`);
        error.status = status;
        error.response = json;
        return reject(error);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Request timeout')));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function withRetry(fn, { retries = 3, baseDelay = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try { return await fn(); }
    catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function postPrompt(item) {
  const payload = buildPayload(item);
  if (DRY_RUN) {
    log(`DRY-RUN: would POST ${payload.title}`);
    return { status: 200, json: { dryRun: true, payload } };
  }
  const headers = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const url = `${API_BASE_URL.replace(/\/$/, '')}/v1/prompts`;
  return await withRetry(() => requestJson('POST', url, payload, headers));
}

async function run() {
  const items = readInput(INPUT);
  const total = LIMIT ? Math.min(LIMIT, items.length) : items.length;
  log(`Uploading ${total} prompts to ${API_BASE_URL} (collection=${COLLECTION}, tags=${TAGS.join(',') || '-'})`);
  if (DRY_RUN) log('Running in DRY-RUN mode. No data will be created.');

  let ok = 0, fail = 0;
  const results = [];

  // simple pool
  let idx = 0;
  async function worker(id) {
    while (idx < total) {
      const my = idx++;
      const item = items[my];
      try {
        const res = await postPrompt(item);
        ok++;
        results.push({ index: my, title: item.title, status: res.status, id: res.json.id });
        log(`OK [${my + 1}/${total}] ${item.title}`);
      } catch (e) {
        fail++;
        results.push({ index: my, title: item.title, error: e.message, status: e.status, response: e.response });
        err(`FAIL [${my + 1}/${total}] ${item.title} -> ${e.status || ''} ${e.message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, (_, i) => worker(i));
  await Promise.all(workers);

  // Summary
  log(`Done. Success=${ok}, Failed=${fail}`);

  if (JUNIT) {
    const xml = createJUnit(results, { suite: 'demo-prompt-upload', total });
    const outPath = path.resolve(process.cwd(), JUNIT === true ? 'junit-report.xml' : JUNIT);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, xml, 'utf8');
    log(`Wrote JUnit report to ${outPath}`);
  }

  // Exit code for CI
  process.exit(fail > 0 ? 1 : 0);
}

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createJUnit(results, { suite = 'suite', total = results.length } = {}) {
  const ts = new Date().toISOString();
  const cases = results.map((r) => {
    const name = escapeXml(`${r.index + 1}. ${r.title}`);
    if (r.error) {
      const msg = escapeXml(r.error);
      const details = escapeXml(JSON.stringify(r.response || {}, null, 2));
      return `<testcase name="${name}" time="0"><failure message="${msg}">${details}</failure></testcase>`;
    }
    return `<testcase name="${name}" time="0"/>`;
  }).join('');
  const failures = results.filter(r => r.error).length;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="${escapeXml(suite)}" tests="${total}" failures="${failures}" timestamp="${ts}">${cases}</testsuite>`;
}

if (require.main === module) {
  run().catch((e) => { err(e.stack || e.message); process.exit(1); });
}
