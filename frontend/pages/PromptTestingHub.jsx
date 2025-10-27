import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

/*
  PromptTestingHub.jsx
  - Real-time Prompt Markdown editor with multi-AI providers test & side-by-side diff
  - Providers supported via APIKeyManager storage or environment proxy endpoints
  - Zero-dep diff view (word-level) to avoid extra libs in repo

  Expected integrations (front-end calls):
    - /api/proxy/openai
    - /api/proxy/anthropic
    - /api/proxy/google
    - /api/proxy/azureOpenAI
    - /api/proxy/ollama (optional)

  You can adapt endpoints to your backend. Each endpoint should accept:
    { model, messages | prompt, temperature, max_tokens, system }
  and return a JSON: { content: string, usage?: {...}, provider: string, model: string }
*/

const DEFAULT_PROMPT = `# Product description generator

You are a helpful assistant. Generate a concise, compelling description.

Context:
- Product: "UltraLight Running Shoes"
- Audience: health-conscious urban professionals
- Tone: energetic, premium, trustworthy

Return:
- 1 paragraph (60-90 words)
- End with a short CTA
`;

const DEFAULT_MODELS = [
  { provider: 'openai', label: 'OpenAI - gpt-4o-mini', model: 'gpt-4o-mini' },
  { provider: 'anthropic', label: 'Anthropic - Claude 3.5 Sonnet', model: 'claude-3-5-sonnet-20241022' },
  { provider: 'google', label: 'Google - Gemini 1.5 Flash', model: 'gemini-1.5-flash' },
];

function wordDiff(a, b) {
  // simple LCS-based diff at word granularity
  const A = a.split(/(\s+)/);
  const B = b.split(/(\s+)/);
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const chunks = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      chunks.push({ type: 'equal', text: A[i] }); i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      chunks.push({ type: 'del', text: A[i] }); i++;
    } else {
      chunks.push({ type: 'ins', text: B[j] }); j++;
    }
  }
  while (i < n) { chunks.push({ type: 'del', text: A[i++] }); }
  while (j < m) { chunks.push({ type: 'ins', text: B[j++] }); }
  return chunks;
}

function DiffView({ left, right }) {
  const chunks = useMemo(() => wordDiff(left || '', right || ''), [left, right]);
  return (
    <div style={{ fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)', lineHeight: 1.6 }}>
      {chunks.map((c, idx) => {
        if (c.type === 'equal') return <span key={idx}>{c.text}</span>;
        if (c.type === 'del') return <span key={idx} style={{ background: 'rgba(255,0,0,0.12)', textDecoration: 'line-through' }}>{c.text}</span>;
        if (c.type === 'ins') return <span key={idx} style={{ background: 'rgba(0,200,0,0.12)' }}>{c.text}</span>;
        return null;
      })}
    </div>
  );
}

function useAbortableFetch() {
  const controllerRef = useRef(null);
  const abort = () => { if (controllerRef.current) controllerRef.current.abort(); };
  const run = async (url, options) => {
    abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return { run, abort };
}

export default function PromptTestingHub() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [system, setSystem] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(300);
  const [models, setModels] = useState(DEFAULT_MODELS);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]); // {provider, model, content, usage}
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [error, setError] = useState('');

  const { run, abort } = useAbortableFetch();

  const handleRun = async () => {
    setError('');
    setRunning(true);
    setResults([]);
    try {
      const tasks = models.map(async ({ provider, model }) => {
        const endpoint = `/api/proxy/${provider}`;
        const body = { model, temperature, max_tokens: maxTokens };
        // choose messages vs prompt for wide compatibility
        body.messages = [];
        if (system) body.messages.push({ role: 'system', content: system });
        body.messages.push({ role: 'user', content: prompt });

        try {
          const json = await run(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          return {
            ok: true,
            provider,
            model: json.model || model,
            content: json.content || json.text || '',
            usage: json.usage,
          };
        } catch (e) {
          return { ok: false, provider, model, error: e.message };
        }
      });

      const settled = await Promise.all(tasks);
      setResults(settled);
      const oks = settled.filter(r => r.ok);
      if (oks.length >= 2) {
        setSelectedLeft(oks[0]);
        setSelectedRight(oks[1]);
      } else if (oks.length === 1) {
        setSelectedLeft(oks[0]);
        setSelectedRight(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleStop = () => {
    abort();
    setRunning(false);
  };

  const addModel = () => setModels(m => [...m, { provider: 'openai', model: 'gpt-4o-mini', label: 'OpenAI - gpt-4o-mini' }]);
  const removeModel = (idx) => setModels(m => m.filter((_, i) => i !== idx));
  const updateModel = (idx, patch) => setModels(m => m.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const leftText = selectedLeft?.content || '';
  const rightText = selectedRight?.content || '';

  return (
    <div style={{ padding: 16, maxWidth: 1400, margin: '0 auto' }}>
      <h1>Prompt Markdown Testing Hub</h1>
      <p style={{ color: '#666' }}>即時測試 Prompt Markdown，串接多個 AI 供應商並做差異比對。</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div>
          <label style={{ fontWeight: 600 }}>System</label>
          <textarea value={system} onChange={(e) => setSystem(e.target.value)} placeholder="Optional system instruction" rows={3} style={{ width: '100%', fontFamily: 'inherit' }} />

          <label style={{ fontWeight: 600, marginTop: 12, display: 'block' }}>Prompt Markdown</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={12} style={{ width: '100%', fontFamily: 'inherit' }} />

          <details style={{ marginTop: 8 }}>
            <summary>Live Markdown Preview</summary>
            <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <ReactMarkdown>{prompt}</ReactMarkdown>
            </div>
          </details>

          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label>Temperature
              <input type="range" min={0} max={2} step={0.1} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
              <span>{temperature.toFixed(1)}</span>
            </label>
            <label>Max tokens
              <input type="number" min={64} max={4096} value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value || '0', 10))} style={{ width: 100 }} />
            </label>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {!running ? (
              <button onClick={handleRun} style={{ padding: '8px 12px' }}>Run All</button>
            ) : (
              <button onClick={handleStop} style={{ padding: '8px 12px' }}>Stop</button>
            )}
            <button onClick={() => setPrompt(DEFAULT_PROMPT)} style={{ padding: '8px 12px' }}>Reset Example</button>
          </div>

          {error && <div style={{ color: 'red', marginTop: 8 }}>Error: {error}</div>}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Models</h3>
            <button onClick={addModel}>+ Add</button>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {models.map((m, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                <select value={m.provider} onChange={(e) => updateModel(idx, { provider: e.target.value })}>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="azureOpenAI">Azure OpenAI</option>
                  <option value="ollama">Ollama</option>
                </select>
                <input value={m.model} onChange={(e) => updateModel(idx, { model: e.target.value })} placeholder="model id" />
                <input value={m.label || ''} onChange={(e) => updateModel(idx, { label: e.target.value })} placeholder="display label" />
                <button onClick={() => removeModel(idx)} aria-label="remove">✕</button>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <h3>Results</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {results.map((r, i) => (
                <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{r.provider} / {r.model}</strong>
                    {r.ok && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setSelectedLeft(r)}>Set Left</button>
                        <button onClick={() => setSelectedRight(r)}>Set Right</button>
                      </div>
                    )}
                  </div>
                  {!r.ok ? (
                    <div style={{ color: 'red' }}>Failed: {r.error}</div>
                  ) : (
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{r.content}</pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Diff View</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{selectedLeft ? (selectedLeft.label || `${selectedLeft.provider}/${selectedLeft.model}`) : 'Left: not selected'}</div>
            <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #eee', borderRadius: 8, padding: 8, minHeight: 120 }}>{leftText}</pre>
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{selectedRight ? (selectedRight.label || `${selectedRight.provider}/${selectedRight.model}`) : 'Right: not selected'}</div>
            <pre style={{ whiteSpace: 'pre-wrap', border: '1px solid #eee', borderRadius: 8, padding: 8, minHeight: 120 }}>{rightText}</pre>
          </div>
        </div>
        <details style={{ marginTop: 8 }} open>
          <summary>Inline word diff</summary>
          <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
            <DiffView left={leftText} right={rightText} />
          </div>
        </details>
      </div>
    </div>
  );
}
