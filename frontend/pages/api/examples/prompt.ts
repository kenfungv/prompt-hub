/**
 * @openapi
 * /api/examples/prompt:
 *   get:
 *     summary: Get prompts with optional filters and pagination
 *     description: Retrieve a list of AI prompts with metadata, tags, and usage stats.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Free-text search across name, content, and tags
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: Filter by a single tag (exact match)
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *         description: Opaque cursor for pagination (from previous response.nextCursor)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *         description: Page size
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: ["recent", "popular", "updated"] , default: recent }
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of prompts
 *       400:
 *         description: Bad request
 *   post:
 *     summary: Create or upsert a prompt with metadata
 *     description: Creates a new prompt or updates if an id or unique slug exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, content]
 *             properties:
 *               id: { type: string, description: Optional ID for updates }
 *               name: { type: string }
 *               content: { type: string, description: Prompt template or text }
 *               tags: { type: array, items: { type: string } }
 *               metadata:
 *                 type: object
 *                 additionalProperties: true
 *               visibility: { type: string, enum: ["public", "private"], default: public }
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 * /api/examples/prompt/{id}:
 *   get:
 *     summary: Get a single prompt by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Prompt
 *       404:
 *         description: Not found
 *   patch:
 *     summary: Update a prompt's content or metadata
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               content: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               metadata: { type: object, additionalProperties: true }
 *               visibility: { type: string, enum: ["public", "private"] }
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a prompt
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */

import type { NextApiRequest, NextApiResponse } from 'next'

// In-memory demo store (replace with your DB/prisma/drizzle as needed)
// This keeps the example self-contained for CI/tests. Not for production!
const store = new Map<string, any>()

// Simple id generator for example purpose
const genId = () => Math.random().toString(36).slice(2, 10)

// Basic full-text search over name/content/tags
function matches(item: any, q?: string, tag?: string) {
  if (tag && !item.tags?.includes(tag)) return false
  if (!q) return true
  const hay = `${item.name}\n${item.content}\n${(item.tags||[]).join(',')}`.toLowerCase()
  return hay.includes(q.toLowerCase())
}

// Cursor encoding helper
function encodeCursor(lastId: string | null) {
  return lastId ? Buffer.from(lastId).toString('base64') : null
}
function decodeCursor(cursor?: string | string[]) {
  if (!cursor || Array.isArray(cursor)) return undefined
  try { return Buffer.from(cursor, 'base64').toString('utf8') } catch { return undefined }
}

// Common response helpers
const bad = (res: NextApiResponse, code: number, message: string) => res.status(code).json({ error: message })

// Router entry
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Support nested route /api/examples/prompt and /api/examples/prompt/[id]
  const idFromQuery = Array.isArray(req.query.id) ? req.query.id[0] : (req.query.id as string | undefined)
  const pathId = idFromQuery || (req.query.slug as string | undefined)

  // Delegate to item handler if path contains id via rewrite (Next.js catches all)
  if (pathId || req.url?.match(/\/api\/examples\/prompt\/(.+)/)) {
    return handleItem(req, res)
  }

  switch (req.method) {
    case 'GET':
      return listPrompts(req, res)
    case 'POST':
      return createOrUpsertPrompt(req, res)
    default:
      res.setHeader('Allow', 'GET, POST')
      return bad(res, 405, 'Method Not Allowed')
  }
}

async function listPrompts(req: NextApiRequest, res: NextApiResponse) {
  const { q, tag, limit = '20', cursor, sort = 'recent' } = req.query as Record<string, string>
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20))
  const cursorId = decodeCursor(cursor)

  // Convert store to array with synthetic timestamps/metrics for demo
  const items = Array.from(store.values()).map((x) => ({
    ...x,
    createdAt: x.createdAt || new Date(x.__createdAt || Date.now()).toISOString(),
    updatedAt: x.updatedAt || new Date(x.__updatedAt || Date.now()).toISOString(),
    usageCount: x.usageCount ?? 0,
  }))
  .filter((x) => matches(x, q, tag))
  .sort((a, b) => {
    if (sort === 'popular') return (b.usageCount ?? 0) - (a.usageCount ?? 0)
    if (sort === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  let startIndex = 0
  if (cursorId) {
    const idx = items.findIndex((x) => x.id === cursorId)
    startIndex = idx >= 0 ? idx + 1 : 0
  }

  const page = items.slice(startIndex, startIndex + limitNum)
  const nextCursor = page.length === limitNum ? encodeCursor(page[page.length - 1].id) : null

  return res.status(200).json({ items: page, nextCursor })
}

async function createOrUpsertPrompt(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, name, content, tags = [], metadata = {}, visibility = 'public' } = req.body || {}
    if (!name || !content) return bad(res, 400, 'name and content are required')

    const now = new Date().toISOString()
    const existing = id ? store.get(id) : undefined
    const promptId = existing?.id || id || genId()
    const record = {
      id: promptId,
      name,
      content,
      tags: Array.isArray(tags) ? tags : [],
      metadata: typeof metadata === 'object' && metadata ? metadata : {},
      visibility,
      __createdAt: existing?.__createdAt || Date.now(),
      __updatedAt: Date.now(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      usageCount: existing?.usageCount ?? 0,
    }
    store.set(promptId, record)
    return res.status(201).json(record)
  } catch (e: any) {
    return bad(res, 400, e?.message || 'Invalid payload')
  }
}

async function handleItem(req: NextApiRequest, res: NextApiResponse) {
  // Extract id from path e.g. /api/examples/prompt/abc123
  const match = req.url?.match(/\/api\/examples\/prompt\/([^?]+)/)
  const id = match?.[1] || (Array.isArray(req.query.id) ? req.query.id[0] : (req.query.id as string | undefined))
  if (!id) return bad(res, 400, 'Missing id')

  const existing = store.get(id)
  if (req.method === 'GET') {
    if (!existing) return bad(res, 404, 'Not found')
    return res.status(200).json(existing)
  }
  if (req.method === 'PATCH') {
    if (!existing) return bad(res, 404, 'Not found')
    const { name, content, tags, metadata, visibility } = req.body || {}
    const now = new Date().toISOString()
    const updated = {
      ...existing,
      name: name ?? existing.name,
      content: content ?? existing.content,
      tags: Array.isArray(tags) ? tags : (tags === undefined ? existing.tags : []),
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : (metadata === undefined ? existing.metadata : {}),
      visibility: visibility ?? existing.visibility,
      __updatedAt: Date.now(),
      updatedAt: now,
    }
    store.set(id, updated)
    return res.status(200).json(updated)
  }
  if (req.method === 'DELETE') {
    store.delete(id)
    return res.status(204).end()
  }

  res.setHeader('Allow', 'GET, PATCH, DELETE')
  return bad(res, 405, 'Method Not Allowed')
}

// Example: Increment usage metric when a prompt is used for AI inference.
// This shows how SDKs or server actions could record telemetry.
export async function recordPromptUsage(id: string, count = 1) {
  const existing = store.get(id)
  if (!existing) return false
  existing.usageCount = (existing.usageCount ?? 0) + count
  existing.__updatedAt = Date.now()
  existing.updatedAt = new Date().toISOString()
  store.set(id, existing)
  return true
}

// Minimal SDK example for client-side usage (fetch wrapper)
export const PromptAPI = {
  async list(params: { q?: string; tag?: string; cursor?: string; limit?: number; sort?: 'recent'|'popular'|'updated' } = {}) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) qs.set(k, String(v)) })
    const res = await fetch(`/api/examples/prompt?${qs.toString()}`)
    if (!res.ok) throw new Error(`List failed: ${res.status}`)
    return res.json()
  },
  async create(data: { name: string; content: string; tags?: string[]; metadata?: Record<string, any>; visibility?: 'public'|'private' }) {
    const res = await fetch('/api/examples/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error(`Create failed: ${res.status}`)
    return res.json()
  },
  async get(id: string) {
    const res = await fetch(`/api/examples/prompt/${id}`)
    if (!res.ok) throw new Error(`Get failed: ${res.status}`)
    return res.json()
  },
  async update(id: string, data: Partial<{ name: string; content: string; tags: string[]; metadata: Record<string, any>; visibility: 'public'|'private' }>) {
    const res = await fetch(`/api/examples/prompt/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) throw new Error(`Update failed: ${res.status}`)
    return res.json()
  },
  async remove(id: string) {
    const res = await fetch(`/api/examples/prompt/${id}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 204) throw new Error(`Delete failed: ${res.status}`)
    return true
  },
}
