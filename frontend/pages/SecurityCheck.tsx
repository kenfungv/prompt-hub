import React, { useCallback, useMemo, useState } from 'react';
import { SecuritySeverity } from '../../backend/services/filter';

type Issue = {
  type: string;
  description: string;
  severity: SecuritySeverity;
  position?: { start: number; end: number };
  matchedPattern?: string;
};

type Result = {
  id: string;
  promptText: string;
  severity: SecuritySeverity;
  issues: Issue[];
  score: number; // 0-100, higher is safer
  timestamp: string;
  recommendations: string[];
};

const severityColors: Record<SecuritySeverity, string> = {
  [SecuritySeverity.CRITICAL]: '#dc2626',
  [SecuritySeverity.HIGH]: '#f97316',
  [SecuritySeverity.MEDIUM]: '#f59e0b',
  [SecuritySeverity.LOW]: '#10b981',
  [SecuritySeverity.SAFE]: '#22c55e',
};

const mockApiCheck = async (prompts: string[]): Promise<Result[]> => {
  // In real app, call backend API endpoint. For now, mock minimal shape for UI wiring.
  return prompts.map((p, idx) => ({
    id: `mock_${idx}`,
    promptText: p,
    severity: SecuritySeverity.SAFE,
    issues: [],
    score: 100,
    timestamp: new Date().toISOString(),
    recommendations: ['No major security concerns detected'],
  }));
};

export default function SecurityCheck() {
  const [input, setInput] = useState<string>('');
  const [auto, setAuto] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [results, setResults] = useState<Result[]>([]);

  const prompts = useMemo(() => input
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean), [input]);

  const onRun = useCallback(async () => {
    if (!prompts.length) return;
    setRunning(true);
    try {
      const res = await mockApiCheck(prompts);
      setResults(res);
    } finally {
      setRunning(false);
    }
  }, [prompts]);

  // Auto mode demo: re-run when input changes
  React.useEffect(() => {
    if (auto && prompts.length) {
      onRun();
    }
  }, [auto, prompts, onRun]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Security Check</h1>
      <p>Batch and automated prompt security scanning with severity grading and fix suggestions.</p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <textarea
          placeholder="Enter one prompt per line"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={6}
          style={{ width: '100%', fontFamily: 'monospace' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
          <label>
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto mode
          </label>
          <button onClick={onRun} disabled={running || !prompts.length}>
            {running ? 'Running…' : 'Run Security Check'}
          </button>
          <button onClick={exportJSON} disabled={!results.length}>Export Report (JSON)</button>
        </div>
      </div>

      {!!results.length && (
        <div style={{ marginTop: 24 }}>
          <h2>Results</h2>
          <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
            {results.map((r) => (
              <li key={r.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>Severity: <span style={{ color: severityColors[r.severity] }}>{r.severity}</span></strong>
                  <span>Score: {r.score}</span>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap' }}>{r.promptText}</pre>
                {r.issues.length ? (
                  <div>
                    <strong>Issues:</strong>
                    <ul>
                      {r.issues.map((i, idx) => (
                        <li key={idx}>
                          [{i.severity}] {i.type} - {i.description}
                          {i.matchedPattern ? ` ("${i.matchedPattern}")` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div>No issues detected.</div>
                )}
                <div>
                  <strong>Recommendations:</strong>
                  <ul>
                    {r.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
