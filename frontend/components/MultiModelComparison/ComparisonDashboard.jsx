import React, { useState, useEffect } from 'react';
import ModelResultCard from './ModelResultCard';
import ComparisonStats from './ComparisonStats';
import ComparisonCharts from './ComparisonCharts';
import { aggregateModelResults, calculateSimilarity } from '../../utils/comparisonAlgorithms';
import './ComparisonDashboard.css';

/**
 * Multi-Model Result Comparison Dashboard
 * Inspired by promptfoo and FlowiseAI's comparison modules
 * Features:
 * - Side-by-side model result comparison
 * - Statistical aggregation and distribution
 * - Radar and bar chart visualizations
 * - Configurable comparison metrics
 */
const ComparisonDashboard = ({ prompt, modelResults = [], config = {} }) => {
  const [viewMode, setViewMode] = useState('grid'); // grid, list, split
  const [selectedMetrics, setSelectedMetrics] = useState([
    'responseTime',
    'tokenCount',
    'quality',
    'coherence',
    'relevance'
  ]);
  const [aggregatedData, setAggregatedData] = useState(null);
  const [sortBy, setSortBy] = useState('quality');
  const [filterModel, setFilterModel] = useState('all');

  // Configuration from promptfoo-inspired settings
  const defaultConfig = {
    showStatistics: true,
    showCharts: true,
    enableComparison: true,
    metrics: selectedMetrics,
    ...config
  };

  useEffect(() => {
    if (modelResults.length > 0) {
      const aggregated = aggregateModelResults(modelResults, selectedMetrics);
      setAggregatedData(aggregated);
    }
  }, [modelResults, selectedMetrics]);

  const handleMetricToggle = (metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handleSortChange = (sortMetric) => {
    setSortBy(sortMetric);
  };

  const filteredResults = filterModel === 'all' 
    ? modelResults 
    : modelResults.filter(r => r.model === filterModel);

  const sortedResults = [...filteredResults].sort((a, b) => {
    return (b.metrics?.[sortBy] || 0) - (a.metrics?.[sortBy] || 0);
  });

  const availableModels = [...new Set(modelResults.map(r => r.model))];

  return (
    <div className="comparison-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Multi-Model Result Comparison</h1>
        <div className="prompt-display">
          <span className="label">Prompt:</span>
          <p className="prompt-text">{prompt}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="control-group">
          <label>View Mode:</label>
          <div className="button-group">
            <button 
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button 
              className={viewMode === 'split' ? 'active' : ''}
              onClick={() => setViewMode('split')}
            >
              Split
            </button>
          </div>
        </div>

        <div className="control-group">
          <label>Filter Model:</label>
          <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}>
            <option value="all">All Models</option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Sort By:</label>
          <select value={sortBy} onChange={(e) => handleSortChange(e.target.value)}>
            {selectedMetrics.map(metric => (
              <option key={metric} value={metric}>
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group metrics-selector">
          <label>Metrics:</label>
          <div className="metrics-checkboxes">
            {['responseTime', 'tokenCount', 'quality', 'coherence', 'relevance', 'accuracy'].map(metric => (
              <label key={metric} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedMetrics.includes(metric)}
                  onChange={() => handleMetricToggle(metric)}
                />
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      {defaultConfig.showStatistics && aggregatedData && (
        <ComparisonStats 
          data={aggregatedData} 
          modelCount={modelResults.length}
          metrics={selectedMetrics}
        />
      )}

      {/* Charts Section */}
      {defaultConfig.showCharts && aggregatedData && (
        <ComparisonCharts 
          data={aggregatedData}
          modelResults={sortedResults}
          metrics={selectedMetrics}
        />
      )}

      {/* Model Results Display */}
      <div className={`results-container view-${viewMode}`}>
        <h2>Model Results ({sortedResults.length})</h2>
        <div className="results-grid">
          {sortedResults.map((result, index) => (
            <ModelResultCard
              key={`${result.model}-${index}`}
              result={result}
              metrics={selectedMetrics}
              showComparison={defaultConfig.enableComparison}
              comparisonData={aggregatedData}
            />
          ))}
        </div>
      </div>

      {sortedResults.length === 0 && (
        <div className="no-results">
          <p>No results to display. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default ComparisonDashboard;
