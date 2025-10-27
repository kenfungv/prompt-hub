// scripts/regression-test.js
// CI-friendly regression test covering Members, Prompts, Marketplace, Payments, Audit, AI Tests
// Fails fast with non-zero exit and prints a final summary.

/* Usage
 *   NODE_ENV=test node scripts/regression-test.js
 * CI: run in workflow with `continue-on-error: false`
 */

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const { setTimeout: wait } = require('timers/promises');

// Read base config from env
const BASE_URL = process.env.API_BASE_URL || 'https://api.prompt-hub.example.com';
const API_KEY = process.env.API_KEY; // Bearer token
const TIMEOUT_MS = parseInt(process.env.TEST_TIMEOUT_MS || '20000', 10);
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

if (!API_KEY) {
  console.error('Missing API_KEY env variable');
  process.exit(2);
}

function hdr(extra={}) {
  return {
    'authorization': `Bearer ${API_KEY}`,
    'content-type': 'application/json',
    ...extra,
  };
}

function deadlineAbort(ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function now() { return new Date().toISOString(); }

const summary = {
  startedAt: now(),
  passed: [],
  failed: [],
  contexts: {},
};

async function safe(name, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    summary.passed.push({ name, ms: Date.now() - t0 });
    return out;
  } catch (err) {
    summary.failed.push({ name, ms: Date.now() - t0, error: err.message, stack: err.stack });
    throw err;
  }
}

async function req(path, options={}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const { signal, cancel } = deadlineAbort();
  try {
    const res = await fetch(url, { ...options, signal });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : undefined; } catch (_) { body = text; }
    if (!res.ok) {
      const msg = `HTTP ${res.status} ${res.statusText} at ${url} body=${typeof body==='string'? body: JSON.stringify(body)}`;
      const e = new Error(msg);
      e.status = res.status;
      e.body = body;
      throw e;
    }
    return body;
  } finally { cancel(); }
}

// Fixtures
function randSuffix() { return Math.random().toString(36).slice(2, 8); }

async function testMembers() {
  const email = `reg.user+${randSuffix()}@example.com`;
  const payload = { email, name: 'Reg Test', password: 'P@ssw0rd!'+randSuffix() };
  const created = await req('/v1/members', { method: 'POST', headers: hdr(), body: JSON.stringify(payload) });
  if (!created?.id) throw new Error('member create missing id');

  const got = await req(`/v1/members/${created.id}`, { headers: hdr() });
  if (got.email !== email) throw new Error('member get mismatch');

  const listed = await req('/v1/members?limit=5', { headers: hdr() });
  if (!Array.isArray(listed.data)) throw new Error('members list not array');

  summary.contexts.memberId = created.id;
}

async function testPrompts() {
  const prompt = {
    name: 'Reg Smoke '+randSuffix(),
    content: 'You are a helpful assistant. Say OK.',
    tags: ['regression','smoke']
  };
  const created = await req('/v1/prompts', { method: 'POST', headers: hdr(), body: JSON.stringify(prompt) });
  if (!created?.id) throw new Error('prompt create missing id');

  const versioned = await req(`/v1/prompts/${created.id}/versions`, { method: 'POST', headers: hdr(), body: JSON.stringify({ note: 'initial' }) });
  if (!versioned?.version) throw new Error('prompt version missing');

  const exec = await req(`/v1/prompts/${created.id}:run`, { method: 'POST', headers: hdr(), body: JSON.stringify({ input: { text: 'ping' }, model: AI_MODEL }) });
  if (!exec?.output) throw new Error('prompt run missing output');

  summary.contexts.promptId = created.id;
}

async function testMarketplace() {
  const create = await req('/v1/marketplace/items', { method: 'POST', headers: hdr(), body: JSON.stringify({
    title: 'Reg Pack '+randSuffix(),
    description: 'Automated test pack',
    price: 199,
    currency: 'USD',
    visibility: 'private'
  })});
  if (!create?.id) throw new Error('market item create missing id');

  const publish = await req(`/v1/marketplace/items/${create.id}:publish`, { method: 'POST', headers: hdr() });
  if (!publish?.status || publish.status !== 'published') throw new Error('market publish failed');

  const list = await req('/v1/marketplace/items?limit=5', { headers: hdr() });
  if (!Array.isArray(list.data)) throw new Error('market list not array');

  summary.contexts.marketItemId = create.id;
}

async function testPayments() {
  const intent = await req('/v1/payments/intents', { method: 'POST', headers: hdr(), body: JSON.stringify({
    amount: 199,
    currency: 'USD',
    metadata: { reason: 'regression' }
  })});
  if (!intent?.id) throw new Error('payment intent missing id');

  const confirm = await req(`/v1/payments/intents/${intent.id}:confirm`, { method: 'POST', headers: hdr(), body: JSON.stringify({ test: true }) });
  if (!confirm?.status) throw new Error('payment confirm missing status');

  summary.contexts.paymentIntentId = intent.id;
}

async function testAudit() {
  const write = await req('/v1/audit/events', { method: 'POST', headers: hdr(), body: JSON.stringify({
    type: 'test.event',
    actor: 'regression-bot',
    data: { from: 'regression' }
  })});
  if (!write?.id) throw new Error('audit write missing id');

  const read = await req(`/v1/audit/events/${write.id}`, { headers: hdr() });
  if (read.type !== 'test.event') throw new Error('audit read mismatch');

  const search = await req('/v1/audit/events?type=test.event&limit=1', { headers: hdr() });
  if (!Array.isArray(search.data)) throw new Error('audit search not array');
}

async function testAI() {
  const chat = await req('/v1/ai/chat/completions', { method: 'POST', headers: hdr(), body: JSON.stringify({
    model: AI_MODEL,
    messages: [
      { role: 'system', content: 'You are a test bot.' },
      { role: 'user', content: 'Say READY' }
    ],
    max_tokens: 16,
    temperature: 0
  })});
  const text = JSON.stringify(chat);
  if (!text.toLowerCase().includes('ready')) throw new Error('ai output missing READY');
}

async function main() {
  console.log('Regression start', summary.startedAt, 'base', BASE_URL);
  try {
    await safe('Members', testMembers);
    await safe('Prompts', testPrompts);
    await safe('Marketplace', testMarketplace);
    await safe('Payments', testPayments);
    await safe('Audit', testAudit);
    await safe('AI', testAI);
  } catch (e) {
    // continue to summary and fail exit below
  }

  const stats = {
    passed: summary.passed.length,
    failed: summary.failed.length,
    durationMs: Date.now() - new Date(summary.startedAt).getTime(),
  };
  summary.finishedAt = now();
  console.log('\n=== Regression Summary ===');
  console.table({ passed: stats.passed, failed: stats.failed, durationMs: stats.durationMs });
  console.log('Contexts:', summary.contexts);
  if (summary.failed.length) {
    console.log('\nFailures:');
    for (const f of summary.failed) {
      console.log(`- ${f.name} (${f.ms}ms): ${f.error}`);
    }
  }

  // Emit CI-friendly line
  const ciNote = `[regression] passed=${stats.passed} failed=${stats.failed} durationMs=${stats.durationMs}`;
  console.log(ciNote);

  // Non-zero exit if any failures
  process.exit(summary.failed.length ? 1 : 0);
}

main().catch(err => {
  console.error('Unhandled', err);
  process.exit(1);
});
