# prompt-hub API Documentation

This document lists backend models, REST API routes, and includes seed instructions.

## New: Security Review (Prompt Red Team/Filter)

A new security review module provides batch and automated prompt security scanning with severity grading and remediation suggestions.

### Backend: backend/services/filter.ts
- SecurityFilterService with:
  - Sensitive word categorization (hate speech, violence, PII, spam)
  - Prompt injection detection (override/disregard instructions, system manipulation)
  - Privacy leak detection (SSN, credit cards, passwords, API keys, emails)
  - Basic toxicity analysis
  - Batch checking API and severity-based scoring
  - Recommendations generation

Example usage:
```
import { securityFilter } from './backend/services/filter';
const result = await securityFilter.checkPrompt('example prompt');
```

### Frontend: frontend/pages/SecurityCheck.tsx
- Security Check page provides:
  - Batch input and Auto mode scanning
  - Severity levels: CRITICAL, HIGH, MEDIUM, LOW, SAFE
  - Score and detailed issues list
  - Remediation suggestions and JSON export

### Integration Plan
- Wire backend API endpoint to replace mock in SecurityCheck.tsx
- Gate prompt publishing with security pass threshold
- Add audit logs for each security check run

### Roadmap
- Integrate external NLP safety frameworks/providers (e.g., Perspective API, OpenAI Moderation, Azure Content Safety)
- Add multilingual sensitive lexicons and contextual classification
- Extend to output red-team test cases and replay harness
