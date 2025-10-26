# prompt-hub API Documentation

This document lists all backend models, their fields, and the corresponding REST API routes with example requests/responses. It also includes seed instructions.

## Models and Schemas

- User
  - Fields: username (string), email (string), password (string), tier (enum: Free|Pro|Enterprise), bio (string), isVerified (boolean), createdAt (date)
  - Example: { "username": "alice", "email": "alice@example.com", "password": "Password123!", "tier": "Free", "bio": "Writer", "isVerified": true }
- Category
  - Fields: name (string), slug (string), description (string), createdAt (date)
  - Example: { "name": "Writing", "slug": "writing", "description": "Prompts for writing" }
- Tag
  - Fields: name (string), slug (string)
  - Example: { "name": "chatgpt", "slug": "chatgpt" }
- Prompt
  - Fields: title (string), content (string), author (ObjectId->User), category (ObjectId->Category), tags (ObjectId[]->Tag), price (number), isPublic (boolean), createdAt (date)
  - Example: { "title": "Blog outline generator", "content": "Create a blog outline about {topic}", "author": "<userId>", "category": "<categoryId>", "tags": ["<tagId>"] }
- Subscription
  - Fields: user (ObjectId->User), plan (string), status (enum: active|canceled|past_due), startDate (date), endDate (date|null), renewal (boolean)
  - Example: { "user": "<userId>", "plan": "Pro", "status": "active" }
- Payment
  - Fields: user (ObjectId->User), amount (number), currency (string), provider (string: stripe), status (string), referenceId (string), createdAt (date)
  - Example: { "user": "<userId>", "amount": 29, "currency": "USD", "provider": "stripe", "status": "succeeded", "referenceId": "pi_test_123" }
- Transaction
  - Fields: buyer (ObjectId->User), seller (ObjectId->User), prompt (ObjectId->Prompt), amount (number), currency (string), status (string), createdAt (date)
  - Example: { "buyer": "<userId>", "seller": "<userId>", "prompt": "<promptId>", "amount": 4.99, "currency": "USD", "status": "completed" }
- Webhook
  - Fields: event (string), provider (string), payload (object), processed (boolean), receivedAt (date)
  - Example: { "event": "payment_intent.succeeded", "provider": "stripe", "payload": {"id":"evt_1"}, "processed": true }

## Routes Summary

- Auth: /api/auth
  - POST /register
  - POST /login
- Users: /api/users
  - GET /me (auth)
  - PATCH /me (auth)
- Categories: /api/categories
  - GET /
  - POST / (auth, admin)
  - GET /:id
  - PATCH /:id (auth, admin)
  - DELETE /:id (auth, admin)
- Tags: /api/tags
  - GET /
  - POST / (auth, admin)
  - GET /:id
  - PATCH /:id (auth, admin)
  - DELETE /:id (auth, admin)
- Prompts: /api/prompts
  - GET / (query: q, tag, category, author, page, limit, sort)
  - POST / (auth)
  - GET /:id
  - PATCH /:id (auth, owner)
  - DELETE /:id (auth, owner|admin)
- Payments: /api/payments
  - POST /intent (auth) — create payment intent
  - GET /me (auth) — list my payments
- Subscriptions: /api/subscriptions
  - GET /plans — list available plans
  - POST /subscribe (auth)
  - GET /me (auth)
  - POST /cancel (auth)
- Transactions: /api/transactions
  - GET /me (auth)
  - POST / (auth)
- Webhooks: /api/webhooks
  - POST /stripe — Stripe webhook endpoint

## Request/Response Examples

- Create Prompt (POST /api/prompts)
  - Request JSON: { "title": "Refactor JS function", "content": "Improve: {code}", "category": "<categoryId>", "tags": ["<tagId>"], "price": 4.99, "isPublic": true }
  - 201 Response: { "_id": "<promptId>", "title": "Refactor JS function", "author": {"_id": "<userId>", "username":"bob"} }

- Subscribe (POST /api/subscriptions/subscribe)
  - Request JSON: { "plan": "Pro", "paymentMethodId": "pm_test_123" }
  - 200 Response: { "status": "active", "plan": "Pro", "renewal": true }

- Purchase Prompt (POST /api/transactions)
  - Request JSON: { "promptId": "<promptId>" }
  - 201 Response: { "status": "completed", "amount": 4.99, "currency": "USD" }

## Seeding

- Seed script: backend/seed.js
- Environment: MONGODB_URI=mongodb://localhost:27017/prompt-hub
- Run: node backend/seed.js
- What it seeds: users, categories, tags, prompts, subscriptions, payments, transactions, webhooks; also defines API tiers (Free, Pro, Enterprise).

## Notes

- Authentication: JWT-based (see /api/auth)
- Pagination and filtering supported on list endpoints where applicable.
- Field validation and ownership checks enforced in routes/controllers.
