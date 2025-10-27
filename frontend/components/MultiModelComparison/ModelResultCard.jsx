import React from 'react';
import './ModelResultCard.css';

/**
 * Individual Model Result Card Component
 * Displays result from a single model with metrics and comparison indicators
 */
const ModelResultCard = ({ result, metrics, showComparison, comparisonData }) => {
  const {
    model,
    response,
    metrics: resultMetrics = {},
    timestamp,
    error
  } = result;

  // Calculate performance indicators relative to other models
  const getPerformanceIndicator = (metric, value) => {
    if (!showComparison || !comparisonData) return null;
    
    const avg = comparisonData.averages?.[metric];
    if (!avg) return null;
    
    const diff = ((value - avg) / avg) * 100;
    
    if (Math.abs(diff) < 5) return { status: 'neutral', text: '≈ avg' };
    if (diff > 0) return { status: 'above', text: `+${diff.toFixed(1)}%` };
    return { status: 'below', text: `${diff.toFixed(1)}%` };
  };

  const formatMetricValue = (metric, value) => {
    if (metric === 'responseTime') return `${value.toFixed(2)}s`;
    if (metric === 'tokenCount') return value.toLocaleString();
    return value.toFixed(2);
  };

  const getMetricLabel = (metric) => {
    const labels = {
      responseTime: 'Response Time',
      tokenCount: 'Token Count',
      quality: 'Quality Score',
      coherence: 'Coherence',
      relevance: 'Relevance',
      accuracy: 'Accuracy'
    };
    return labels[metric] || metric;
  };

  return (
    <div className={`model-result-card ${error ? 'error' : ''}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="model-info">
          <h3 className="model-name">{model}</h3>
          {timestamp && (
            <span className="timestamp">
              {new Date(timestamp).toLocaleString()}
            </span>
          )}
        </div>
        {error && (
          <div className="error-badge">
            <span>⚠️ Error</span>
          </div>
        )}
      </div>

      {/* Response Content */}
      <div className="card-body">
        {error ? (
          <div className="error-message">
            <p>{error}</p>
          </div>
        ) : (
          <div className="response-content">
            <div className="response-text">{response}</div>
          </div>
        )}
      </div>

      {/* Metrics */}
      {!error && metrics && metrics.length > 0 && (
        <div className="card-metrics">
          <h4>Performance Metrics</h4>
          <div className="metrics-grid">
            {metrics.map(metric => {
              const value = resultMetrics[metric];
              if (value === undefined) return null;
              
              const indicator = getPerformanceIndicator(metric, value);
              
              return (
                <div key={metric} className="metric-item">
                  <div className="metric-label">{getMetricLabel(metric)}</div>
                  <div className="metric-value-container">
                    <span className="metric-value">
                      {formatMetricValue(metric, value)}
                    </span>
                    {indicator && (
                      <span className={`metric-indicator ${indicator.status}`}>
                        {indicator.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="card-footer">
        <button className="view-details-btn">View Details</button>
        <button className="copy-response-btn">Copy Response</button>
      </div>
    </div>
  );
};

export default ModelResultCard;
