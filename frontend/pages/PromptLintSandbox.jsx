import React from 'react';
import PromptLintUI from '../components/PromptLintUI';
import './PromptLintSandbox.css';

/**
 * Prompt Lint Sandbox Page
 * Provides a dedicated interface for prompt quality testing and validation
 */
const PromptLintSandbox = () => {
  const handleLintComplete = (result) => {
    console.log('Lint completed:', result);
    // Additional handling logic can be added here
    // e.g., logging to analytics, storing results, etc.
  };

  const handleAutoFix = (fixedPrompt) => {
    console.log('Auto-fix applied:', fixedPrompt);
    // Additional handling logic can be added here
  };

  return (
    <div className="prompt-lint-sandbox-page">
      <div className="sandbox-header">
        <div className="header-content">
          <h1>🧪 Prompt Quality Control Sandbox</h1>
          <p className="header-description">
            Test and validate your prompts for quality, syntax, and best practices.
            Get instant feedback with automated checks and suggestions.
          </p>
        </div>
      </div>

      <div className="sandbox-content">
        <div className="info-cards">
          <div className="info-card">
            <div className="card-icon">✅</div>
            <h3>Quality Checks</h3>
            <p>Validate syntax, naming conventions, and content structure</p>
          </div>
          <div className="info-card">
            <div className="card-icon">🔒</div>
            <h3>Security Scan</h3>
            <p>Detect sensitive data and potentially dangerous patterns</p>
          </div>
          <div className="info-card">
            <div className="card-icon">🔧</div>
            <h3>Auto-Fix</h3>
            <p>Automatically fix common issues with one click</p>
          </div>
          <div className="info-card">
            <div className="card-icon">📊</div>
            <h3>Scoring</h3>
            <p>Get a quality score based on multiple criteria</p>
          </div>
        </div>

        <div className="lint-section">
          <PromptLintUI
            onLintComplete={handleLintComplete}
            onAutoFix={handleAutoFix}
          />
        </div>

        <div className="guidelines-section">
          <h2>📝 Best Practices for Prompt Quality</h2>
          <div className="guidelines-grid">
            <div className="guideline-item">
              <h4>🎯 Clear Role Definition</h4>
              <p>
                Start your prompt with a clear role definition (e.g., "You are an expert...").
                This helps the AI understand the context and respond appropriately.
              </p>
            </div>
            <div className="guideline-item">
              <h4>📝 Provide Context</h4>
              <p>
                Include relevant background information and context. The more specific you are,
                the better the AI can understand and fulfill your request.
              </p>
            </div>
            <div className="guideline-item">
              <h4>📊 Use Clear Instructions</h4>
              <p>
                Use imperative verbs ("analyze", "summarize", "create") and be explicit about
                what you want. Avoid ambiguous language.
              </p>
            </div>
            <div className="guideline-item">
              <h4>🔒 Avoid Sensitive Data</h4>
              <p>
                Never include personal information, credentials, API keys, or other sensitive
                data in your prompts. Always use placeholders instead.
              </p>
            </div>
            <div className="guideline-item">
              <h4>⚖️ Keep It Balanced</h4>
              <p>
                Prompts should be neither too short nor too long. Aim for 50-500 characters
                for simple tasks, 500-2000 for complex ones.
              </p>
            </div>
            <div className="guideline-item">
              <h4>⚙️ Follow Conventions</h4>
              <p>
                Use consistent naming conventions (camelCase, snake_case, etc.) for better
                organization and maintainability.
              </p>
            </div>
          </div>
        </div>

        <div className="features-section">
          <h2>✨ Lint Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-badge">Syntax</span>
              <p>Validates balanced quotes, brackets, and proper formatting</p>
            </div>
            <div className="feature-item">
              <span className="feature-badge">Length</span>
              <p>Checks minimum and maximum character limits</p>
            </div>
            <div className="feature-item">
              <span className="feature-badge">Naming</span>
              <p>Enforces naming convention standards</p>
            </div>
            <div className="feature-item">
              <span className="feature-badge">Security</span>
              <p>Detects forbidden patterns and sensitive data</p>
            </div>
            <div className="feature-item">
              <span className="feature-badge">Quality</span>
              <p>Checks for role definitions, context, and clear instructions</p>
            </div>
            <div className="feature-item">
              <span className="feature-badge">Whitespace</span>
              <p>Removes excessive spaces and trailing/leading whitespace</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="sandbox-footer">
        <p>
          <strong>Pro Tip:</strong> Use the configuration panel to customize lint rules
          according to your specific requirements and project standards.
        </p>
      </footer>
    </div>
  );
};

export default PromptLintSandbox;
