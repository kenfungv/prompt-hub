import React from 'react';
import './ComparisonStats.css';

/**
 * Comparison Statistics Component
 * Displays aggregated statistics and distributions from multi-model results
 * Inspired by promptfoo's statistical analysis approach
 */
const ComparisonStats = ({ data, modelCount, metrics }) => {
  if (!data) {
    return (
      <div className="comparison-stats empty">
        <p>No statistical data available</p>
      </div>
    );
  }

  const { averages, distributions, similarities } = data;

  // Calculate average similarity
  const avgSimilarity = similarities && similarities.length > 0
    ? similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length
    : 0;

  return (
    <div className="comparison-stats">
      <h2>Statistical Summary</h2>
      
      {/* Overview Cards */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Models Compared</h3>
            <p className="stat-value">{modelCount}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Metrics Analyzed</h3>
            <p className="stat-value">{metrics.length}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Average Similarity</h3>
            <p className="stat-value">{(avgSimilarity * 100).toFixed(1)}%</p>
            <p className="stat-description">Response alignment</p>
          </div>
        </div>
      </div>

      {/* Metric Distributions */}
      <div className="metric-distributions">
        <h3>Metric Distributions</h3>
        <div className="distributions-grid">
          {metrics.map(metric => {
            const dist = distributions[metric];
            if (!dist) return null;

            return (
              <div key={metric} className="distribution-card">
                <h4>{formatMetricName(metric)}</h4>
                <div className="distribution-stats">
                  <div className="stat-row">
                    <span className="label">Mean:</span>
                    <span className="value">{dist.mean.toFixed(3)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Min:</span>
                    <span className="value">{dist.min.toFixed(3)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Max:</span>
                    <span className="value">{dist.max.toFixed(3)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="label">Std Dev:</span>
                    <span className="value">{dist.stdDev.toFixed(3)}</span>
                  </div>
                </div>
                
                {/* Visual distribution bar */}
                <div className="distribution-visual">
                  <div className="range-bar">
                    <div 
                      className="value-marker min"
                      style={{ left: '0%' }}
                      title={`Min: ${dist.min.toFixed(3)}`}
                    />
                    <div 
                      className="value-marker mean"
                      style={{ 
                        left: `${((dist.mean - dist.min) / (dist.max - dist.min)) * 100}%` 
                      }}
                      title={`Mean: ${dist.mean.toFixed(3)}`}
                    />
                    <div 
                      className="value-marker max"
                      style={{ left: '100%' }}
                      title={`Max: ${dist.max.toFixed(3)}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Similarity Matrix */}
      {similarities && similarities.length > 0 && (
        <div className="similarity-matrix">
          <h3>Response Similarity Matrix</h3>
          <p className="matrix-description">
            Pairwise comparison of model response similarity (0-100%)
          </p>
          <div className="similarity-list">
            {similarities.map((sim, index) => {
              const percentage = (sim.similarity * 100).toFixed(1);
              const similarityClass = getSimilarityClass(sim.similarity);
              
              return (
                <div key={index} className="similarity-item">
                  <div className="model-pair">
                    <span className="model-name">{sim.models[0]}</span>
                    <span className="vs">vs</span>
                    <span className="model-name">{sim.models[1]}</span>
                  </div>
                  <div className="similarity-bar-container">
                    <div 
                      className={`similarity-bar ${similarityClass}`}
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="percentage">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Insights Section */}
      <div className="insights-section">
        <h3>Key Insights</h3>
        <div className="insights-list">
          {generateInsights(data, modelCount, avgSimilarity).map((insight, index) => (
            <div key={index} className="insight-item">
              <span className="insight-icon">{insight.icon}</span>
              <p>{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to format metric names
 */
const formatMetricName = (metric) => {
  return metric
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Helper function to determine similarity class for styling
 */
const getSimilarityClass = (similarity) => {
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.5) return 'medium';
  return 'low';
};

/**
 * Generate insights based on the statistical data
 */
const generateInsights = (data, modelCount, avgSimilarity) => {
  const insights = [];

  // Response similarity insight
  if (avgSimilarity >= 0.7) {
    insights.push({
      icon: '✅',
      text: `High response similarity (${(avgSimilarity * 100).toFixed(1)}%) indicates consistent model behavior across different providers.`
    });
  } else if (avgSimilarity < 0.5) {
    insights.push({
      icon: '⚠️',
      text: `Low response similarity (${(avgSimilarity * 100).toFixed(1)}%) suggests significant differences in model outputs.`
    });
  }

  // Performance variance insight
  const { distributions } = data;
  if (distributions && distributions.quality) {
    const qualityStdDev = distributions.quality.stdDev;
    const qualityMean = distributions.quality.mean;
    const coefficientOfVariation = (qualityStdDev / qualityMean) * 100;
    
    if (coefficientOfVariation > 20) {
      insights.push({
        icon: '📊',
        text: `High variability in quality scores (CV: ${coefficientOfVariation.toFixed(1)}%) - consider standardizing evaluation criteria.`
      });
    }
  }

  // Model count insight
  if (modelCount >= 3) {
    insights.push({
      icon: '🎯',
      text: `Comparing ${modelCount} models provides a comprehensive view of available options.`
    });
  }

  return insights;
};

export default ComparisonStats;
