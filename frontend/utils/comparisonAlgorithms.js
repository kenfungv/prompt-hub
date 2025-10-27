/**
 * Multi-Model Result Comparison Algorithms
 * Inspired by promptfoo's evaluation framework and FlowiseAI's comparison logic
 * 
 * Features:
 * - Statistical aggregation of model results
 * - Similarity calculation between responses
 * - Performance metric normalization
 * - Distribution analysis
 */

/**
 * Calculate cosine similarity between two text strings
 * Used for comparing model responses
 */
export const calculateCosineSimilarity = (text1, text2) => {
  const tokenize = (text) => text.toLowerCase().split(/\s+/);
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);
  
  const allTokens = [...new Set([...tokens1, ...tokens2])];
  const vector1 = allTokens.map(token => tokens1.filter(t => t === token).length);
  const vector2 = allTokens.map(token => tokens2.filter(t => t === token).length);
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Calculate Levenshtein distance between two strings
 * Useful for measuring response similarity
 */
export const calculateLevenshteinDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity score between two responses
 * Returns a normalized score between 0 and 1
 */
export const calculateSimilarity = (response1, response2) => {
  // Use cosine similarity as primary metric
  const cosineSim = calculateCosineSimilarity(response1, response2);
  
  // Also consider Levenshtein distance for fine-grained comparison
  const maxLen = Math.max(response1.length, response2.length);
  const levenshteinDist = calculateLevenshteinDistance(response1, response2);
  const levenshteinSim = 1 - (levenshteinDist / maxLen);
  
  // Weighted combination (70% cosine, 30% Levenshtein)
  return cosineSim * 0.7 + levenshteinSim * 0.3;
};

/**
 * Aggregate results from multiple models
 * Calculates averages, distributions, and rankings
 */
export const aggregateModelResults = (results, metrics = []) => {
  if (!results || results.length === 0) {
    return null;
  }
  
  // Calculate averages for each metric
  const averages = {};
  const distributions = {};
  const rankings = {};
  
  metrics.forEach(metric => {
    const values = results
      .map(r => r.metrics?.[metric])
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return;
    
    // Calculate average
    averages[metric] = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Calculate distribution (min, max, stdDev)
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - averages[metric], 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    distributions[metric] = {
      min,
      max,
      mean: averages[metric],
      stdDev,
      values
    };
    
    // Create rankings
    const sorted = [...values].sort((a, b) => b - a);
    rankings[metric] = results.map((r, idx) => ({
      model: r.model,
      value: r.metrics?.[metric],
      rank: sorted.indexOf(r.metrics?.[metric]) + 1
    }));
  });
  
  // Calculate response similarities
  const similarities = [];
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      if (results[i].response && results[j].response) {
        similarities.push({
          models: [results[i].model, results[j].model],
          similarity: calculateSimilarity(results[i].response, results[j].response)
        });
      }
    }
  }
  
  return {
    totalModels: results.length,
    averages,
    distributions,
    rankings,
    similarities,
    timestamp: new Date().toISOString()
  };
};

/**
 * Normalize metric values for radar chart display
 * Converts all metrics to 0-1 scale
 */
export const normalizeMetrics = (results, metrics) => {
  const normalized = results.map(result => ({
    ...result,
    normalizedMetrics: {}
  }));
  
  metrics.forEach(metric => {
    const values = results
      .map(r => r.metrics?.[metric])
      .filter(v => v !== undefined && v !== null);
    
    if (values.length === 0) return;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    normalized.forEach((result, idx) => {
      const value = results[idx].metrics?.[metric];
      if (value !== undefined && value !== null) {
        result.normalizedMetrics[metric] = range === 0 ? 1 : (value - min) / range;
      }
    });
  });
  
  return normalized;
};

/**
 * Calculate aggregate statistics for chart display
 * Returns data formatted for radar and bar charts
 */
export const prepareChartData = (results, metrics) => {
  const normalized = normalizeMetrics(results, metrics);
  
  // Radar chart data
  const radarData = normalized.map(result => ({
    model: result.model,
    data: metrics.map(metric => ({
      metric,
      value: result.normalizedMetrics[metric] || 0
    }))
  }));
  
  // Bar chart data
  const barData = metrics.map(metric => ({
    metric,
    models: results.map(result => ({
      model: result.model,
      value: result.metrics?.[metric] || 0
    }))
  }));
  
  return {
    radarData,
    barData
  };
};

/**
 * Compare two specific models
 * Returns detailed comparison including differences and similarities
 */
export const compareModels = (model1Result, model2Result, metrics) => {
  const comparison = {
    models: [model1Result.model, model2Result.model],
    responseSimilarity: calculateSimilarity(
      model1Result.response,
      model2Result.response
    ),
    metricDifferences: {}
  };
  
  metrics.forEach(metric => {
    const value1 = model1Result.metrics?.[metric];
    const value2 = model2Result.metrics?.[metric];
    
    if (value1 !== undefined && value2 !== undefined) {
      comparison.metricDifferences[metric] = {
        [model1Result.model]: value1,
        [model2Result.model]: value2,
        difference: value1 - value2,
        percentageDiff: ((value1 - value2) / value2) * 100
      };
    }
  });
  
  return comparison;
};

export default {
  calculateSimilarity,
  aggregateModelResults,
  normalizeMetrics,
  prepareChartData,
  compareModels
};
