import React, { useState, useEffect } from 'react';
import './PromptLintUI.css';

interface LintViolation {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  position?: { start: number; end: number };
  autoFixable: boolean;
}

interface LintResult {
  passed: boolean;
  violations: LintViolation[];
  score: number;
  fixable: boolean;
}

interface LintConfig {
  maxLength: number;
  minLength: number;
  requireContext: boolean;
  forbiddenPatterns: string[];
  namingConvention: 'camelCase' | 'snake_case' | 'kebab-case' | 'PascalCase';
  requireRoleDefinition: boolean;
  checkForSensitiveData: boolean;
  maxConsecutiveSpaces: number;
}

interface PromptLintUIProps {
  initialPrompt?: string;
  initialName?: string;
  onLintComplete?: (result: LintResult) => void;
  onAutoFix?: (fixedPrompt: string) => void;
}

const PromptLintUI: React.FC<PromptLintUIProps> = ({
  initialPrompt = '',
  initialName = '',
  onLintComplete,
  onAutoFix,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [promptName, setPromptName] = useState(initialName);
  const [lintResult, setLintResult] = useState<LintResult | null>(null);
  const [isLinting, setIsLinting] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  const [config, setConfig] = useState<LintConfig>({
    maxLength: 8000,
    minLength: 10,
    requireContext: true,
    forbiddenPatterns: ['<script>', 'eval(', 'javascript:'],
    namingConvention: 'camelCase',
    requireRoleDefinition: true,
    checkForSensitiveData: true,
    maxConsecutiveSpaces: 2,
  });
  const [showConfig, setShowConfig] = useState(false);

  // Auto-lint on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (prompt) {
        handleLint();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [prompt, promptName, config]);

  const handleLint = async () => {
    setIsLinting(true);
    try {
      // Call backend API
      const response = await fetch('/api/lint/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          promptName,
          config,
        }),
      });

      const result: LintResult = await response.json();
      setLintResult(result);
      if (onLintComplete) {
        onLintComplete(result);
      }
    } catch (error) {
      console.error('Lint error:', error);
    } finally {
      setIsLinting(false);
    }
  };

  const handleAutoFix = async () => {
    setAutoFixing(true);
    try {
      const response = await fetch('/api/lint/autofix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      const { fixed, changes } = await response.json();
      setPrompt(fixed);
      if (onAutoFix) {
        onAutoFix(fixed);
      }
      // Re-lint after fixing
      setTimeout(() => handleLint(), 100);
    } catch (error) {
      console.error('Auto-fix error:', error);
    } finally {
      setAutoFixing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'info':
        return '#17a2b8';
      default:
        return '#6c757d';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#28a745';
    if (score >= 70) return '#ffc107';
    if (score >= 50) return '#fd7e14';
    return '#dc3545';
  };

  return (
    <div className="prompt-lint-container">
      <div className="lint-header">
        <h2>🔍 Prompt Quality Control Sandbox</h2>
        <button
          className="config-toggle-btn"
          onClick={() => setShowConfig(!showConfig)}
        >
          ⚙️ Configuration
        </button>
      </div>

      {showConfig && (
        <div className="config-panel">
          <h3>Lint Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>Min Length:</label>
              <input
                type="number"
                value={config.minLength}
                onChange={(e) =>
                  setConfig({ ...config, minLength: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="config-item">
              <label>Max Length:</label>
              <input
                type="number"
                value={config.maxLength}
                onChange={(e) =>
                  setConfig({ ...config, maxLength: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="config-item">
              <label>Naming Convention:</label>
              <select
                value={config.namingConvention}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    namingConvention: e.target.value as any,
                  })
                }
              >
                <option value="camelCase">camelCase</option>
                <option value="snake_case">snake_case</option>
                <option value="kebab-case">kebab-case</option>
                <option value="PascalCase">PascalCase</option>
              </select>
            </div>
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.requireContext}
                  onChange={(e) =>
                    setConfig({ ...config, requireContext: e.target.checked })
                  }
                />
                Require Context
              </label>
            </div>
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.requireRoleDefinition}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      requireRoleDefinition: e.target.checked,
                    })
                  }
                />
                Require Role Definition
              </label>
            </div>
            <div className="config-item">
              <label>
                <input
                  type="checkbox"
                  checked={config.checkForSensitiveData}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      checkForSensitiveData: e.target.checked,
                    })
                  }
                />
                Check for Sensitive Data
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="lint-input-section">
        <div className="input-group">
          <label htmlFor="prompt-name">Prompt Name:</label>
          <input
            id="prompt-name"
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            placeholder="Enter prompt name (e.g., summarizeArticle)"
            className="prompt-name-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="prompt-content">Prompt Content:</label>
          <textarea
            id="prompt-content"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt here for quality checking..."
            className="prompt-textarea"
            rows={10}
          />
          <div className="char-counter">
            {prompt.length} / {config.maxLength} characters
          </div>
        </div>

        <div className="action-buttons">
          <button
            className="lint-btn primary"
            onClick={handleLint}
            disabled={isLinting || !prompt}
          >
            {isLinting ? '🔄 Linting...' : '🔍 Validate Now'}
          </button>
          {lintResult?.fixable && (
            <button
              className="lint-btn success"
              onClick={handleAutoFix}
              disabled={autoFixing}
            >
              {autoFixing ? '🔧 Fixing...' : '🔧 Auto-Fix Issues'}
            </button>
          )}
        </div>
      </div>

      {lintResult && (
        <div className="lint-results">
          <div className="results-header">
            <h3>Lint Results</h3>
            <div
              className="score-badge"
              style={{ backgroundColor: getScoreColor(lintResult.score) }}
            >
              Score: {lintResult.score}/100
            </div>
          </div>

          <div className="status-indicator">
            {lintResult.passed ? (
              <div className="status-success">
                ✅ Prompt passes all critical checks!
              </div>
            ) : (
              <div className="status-error">
                ❌ Prompt has critical issues that must be fixed
              </div>
            )}
          </div>

          {lintResult.violations.length > 0 ? (
            <div className="violations-list">
              <h4>
                Issues Found: {lintResult.violations.length}
              </h4>
              {lintResult.violations.map((violation, index) => (
                <div
                  key={index}
                  className="violation-item"
                  style={{
                    borderLeftColor: getSeverityColor(violation.severity),
                  }}
                >
                  <div className="violation-header">
                    <span className="violation-icon">
                      {getSeverityIcon(violation.severity)}
                    </span>
                    <span className="violation-title">
                      {violation.ruleName}
                    </span>
                    <span
                      className="violation-severity"
                      style={{ color: getSeverityColor(violation.severity) }}
                    >
                      {violation.severity.toUpperCase()}
                    </span>
                    {violation.autoFixable && (
                      <span className="fixable-badge">🔧 Auto-fixable</span>
                    )}
                  </div>
                  <div className="violation-message">{violation.message}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-violations">
              🎉 No issues found! Your prompt looks great!
            </div>
          )}

          <div className="lint-summary">
            <div className="summary-item">
              <span className="summary-label">Errors:</span>
              <span className="summary-value error">
                {lintResult.violations.filter((v) => v.severity === 'error').length}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Warnings:</span>
              <span className="summary-value warning">
                {lintResult.violations.filter((v) => v.severity === 'warning').length}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Info:</span>
              <span className="summary-value info">
                {lintResult.violations.filter((v) => v.severity === 'info').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptLintUI;
