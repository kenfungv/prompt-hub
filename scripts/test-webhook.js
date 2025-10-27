#!/usr/bin/env node
/*
 E2E Webhook tester
 Usage: node scripts/test-webhook.js --base http://localhost:3000 --token $TOKEN --webhookId 123 --url http://hook.site/xxx
*/
const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('base', { type: 'string', default: process.env.API_BASE || 'http://localhost:3000', describe: 'API base URL' })
  .option('token', { type: 'string', default: process.env.API_TOKEN, describe: 'Bearer token' })
  .option('webhookId', { type: 'string', describe: 'Existing webhook ID to test' })
  .option('url', { type: 'string', describe: 'Create new webhook with this URL' })
  .help().argv;

async function main() {
  const base = argv.base.replace(/\/$/, '');
  const headers = argv.token ? { Authorization: `Bearer ${argv.token}` } : {};

  let webhookId = argv.webhookId;

  // 1) Optionally create webhook
  if (!webhookId && argv.url) {
    const create = await axios.post(`${base}/api/webhooks`, { url: argv.url, events: ['test.event'] }, { headers });
    webhookId = create.data.data.id;
    console.log('Created webhook:', webhookId);
  }
  if (!webhookId) throw new Error('Missing --webhookId or --url');

  // 2) Verify echo
  const echo = Math.random().toString(36).slice(2);
  const verify = await axios.post(`${base}/api/webhooks/${webhookId}/verify`, { echo }, { headers });
  console.log('Verify:', verify.data);

  // 3) Send test event
  const test = await axios.post(`${base}/api/webhooks/${webhookId}/test`, {}, { headers });
  console.log('Test:', test.data);

  // 4) Get event types, logs, stats
  const types = await axios.get(`${base}/api/webhooks/events/types`, { headers });
  const logs = await axios.get(`${base}/api/webhooks/${webhookId}/logs`, { headers });
  const stats = await axios.get(`${base}/api/webhooks/${webhookId}/stats`, { headers });
  console.log('Types:', types.data);
  console.log('Logs:', logs.data);
  console.log('Stats:', stats.data);

  // 5) Retry mock delivery
  await axios.post(`${base}/api/webhooks/${webhookId}/retry/0`, {}, { headers });
  console.log('Retry: success');

  console.log('Webhook E2E test completed.');
}

main().catch((e) => {
  console.error('Webhook test failed:', e.response?.data || e.message);
  process.exit(1);
});
