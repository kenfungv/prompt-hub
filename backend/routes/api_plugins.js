const express = require('express');
const router = express.Router();

// In-memory store fallback (replace with DB model e.g., Mongo/Prisma)
let STORE = [];
let ID = 1;

// Middleware: basic validation
function requireFields(fields) {
  return (req, res, next) => {
    for (const f of fields) {
      if (!(f in req.body)) return res.status(400).json({ error: `Missing field: ${f}` });
    }
    next();
  };
}

// List
router.get('/', (req, res) => {
  res.json(STORE);
});

// Create
router.post('/', requireFields(['name','slug']), (req, res) => {
  const exists = STORE.find(p => p.slug === req.body.slug);
  if (exists) return res.status(409).json({ error: 'Slug already exists' });
  const now = new Date().toISOString();
  const plugin = {
    id: String(ID++),
    installCount: 0,
    rating: 0,
    ratingCount: 0,
    listingStatus: 'draft',
    currency: 'USD',
    ...req.body,
    createdAt: now,
    updatedAt: now,
  };
  STORE.push(plugin);
  res.status(201).json(plugin);
});

// Update
router.put('/:id', (req, res) => {
  const idx = STORE.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  STORE[idx] = { ...STORE[idx], ...req.body, updatedAt: new Date().toISOString() };
  res.json(STORE[idx]);
});

// Delete
router.delete('/:id', (req, res) => {
  const idx = STORE.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const removed = STORE.splice(idx, 1)[0];
  res.json({ ok: true, removed });
});

// Submit for review
router.post('/:id/submit', (req, res) => {
  const p = STORE.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (p.listingStatus === 'approved') return res.status(400).json({ error: 'Already approved' });
  p.listingStatus = 'submitted';
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

// Approve/Reject (admin simulation)
router.post('/:id/review', (req, res) => {
  const p = STORE.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  const { action } = req.body; // 'approve' | 'reject'
  if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  p.listingStatus = action === 'approve' ? 'approved' : 'rejected';
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

// Refund simulation
router.post('/:id/refund', (req, res) => {
  const p = STORE.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  // TODO: integrate with payment provider
  res.json({ ok: true, id: p.id, message: 'Refund processed (simulated)' });
});

// Third-party connect stubs
router.get('/connect/:provider', (req, res) => {
  const { provider } = req.params; // zapier | notion | slack
  res.json({ ok: true, provider, message: `Connect flow for ${provider} (stub)` });
});

// Webhook endpoint to invoke prompt/agent microservice
router.post('/invoke/:slug', async (req, res) => {
  const { slug } = req.params;
  const plugin = STORE.find(p => p.slug === slug);
  if (!plugin) return res.status(404).json({ error: 'Plugin not found' });
  // TODO: route to corresponding prompt/agent execution with isolation/sandbox
  const payload = req.body || {};
  return res.json({ ok: true, slug, result: { echo: payload, note: 'Prompt microservice execution simulated' } });
});

module.exports = router;
