import React from 'react';
import { prepareChartData } from '../../utils/comparisonAlgorithms';
import './ComparisonCharts.css';

/**
 * Comparison Charts Component
 * Displays radar and bar charts for multi-model comparison
 * Using native SVG for charts (no external libraries needed)
 * Inspired by promptfoo's visualization approach
 */
const ComparisonCharts = ({ data, modelResults, metrics }) => {
  const chartData = prepareChartData(modelResults, metrics);
  
  return (
    <div className="comparison-charts">
      <h2>Visual Comparison</h2>
      
      <div className="charts-container">
        {/* Radar Chart Section */}
        <div className="chart-section radar-section">
          <h3>Performance Radar Chart</h3>
          <div className="chart-wrapper">
            <RadarChart 
              data={chartData.radarData} 
              metrics={metrics}
            />
          </div>
        </div>
        
        {/* Bar Chart Section */}
        <div className="chart-section bar-section">
          <h3>Metric Comparison Bars</h3>
          <div className="chart-wrapper">
            <BarChart 
              data={chartData.barData} 
              metrics={metrics}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Radar Chart Component using SVG
 * Displays multi-model performance across all metrics
 */
const RadarChart = ({ data, metrics }) => {
  const width = 400;
  const height = 400;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 40;
  const levels = 5;
  
  // Calculate angle for each metric
  const angleStep = (2 * Math.PI) / metrics.length;
  
  // Generate polygon points for each model
  const getPolygonPoints = (modelData) => {
    return modelData.data.map((point, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const radius = point.value * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };
  
  // Generate level circles
  const levelCircles = Array.from({ length: levels }, (_, i) => {
    const radius = maxRadius * ((i + 1) / levels);
    return (
      <circle
        key={i}
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke="#e0e0e0"
        strokeWidth="1"
      />
    );
  });
  
  // Generate axis lines
  const axisLines = metrics.map((metric, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const x = centerX + maxRadius * Math.cos(angle);
    const y = centerY + maxRadius * Math.sin(angle);
    
    return (
      <g key={index}>
        <line
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={y}
          stroke="#d0d0d0"
          strokeWidth="1"
        />
        <text
          x={x + (x - centerX) * 0.2}
          y={y + (y - centerY) * 0.2}
          textAnchor="middle"
          fontSize="12"
          fill="#333"
        >
          {metric}
        </text>
      </g>
    );
  });
  
  // Color palette for models
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  
  return (
    <div className="radar-chart">
      <svg width={width} height={height}>
        {/* Background levels */}
        {levelCircles}
        
        {/* Axis lines */}
        {axisLines}
        
        {/* Model data polygons */}
        {data.map((modelData, index) => (
          <polygon
            key={modelData.model}
            points={getPolygonPoints(modelData)}
            fill={colors[index % colors.length]}
            fillOpacity="0.2"
            stroke={colors[index % colors.length]}
            strokeWidth="2"
          />
        ))}
      </svg>
      
      {/* Legend */}
      <div className="chart-legend">
        {data.map((modelData, index) => (
          <div key={modelData.model} className="legend-item">
            <div 
              className="legend-color" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span>{modelData.model}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Bar Chart Component using SVG
 * Displays side-by-side comparison for each metric
 */
const BarChart = ({ data, metrics }) => {
  const width = 600;
  const barHeight = 40;
  const padding = 60;
  const groupSpacing = 20;
  const height = data.length * (barHeight + groupSpacing) + padding * 2;
  
  // Find max value for scaling
  const maxValue = Math.max(
    ...data.flatMap(metric => 
      metric.models.map(m => m.value)
    )
  );
  
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  
  return (
    <div className="bar-chart">
      <svg width={width} height={height}>
        {data.map((metricData, metricIndex) => {
          const yBase = metricIndex * (barHeight + groupSpacing) + padding;
          
          return (
            <g key={metricData.metric}>
              {/* Metric label */}
              <text
                x="10"
                y={yBase + barHeight / 2}
                fontSize="12"
                fill="#333"
                alignmentBaseline="middle"
              >
                {metricData.metric}
              </text>
              
              {/* Bars for each model */}
              {metricData.models.map((model, modelIndex) => {
                const barWidth = (model.value / maxValue) * (width - padding * 2 - 100);
                const y = yBase + modelIndex * (barHeight / metricData.models.length);
                const barHeightAdjusted = barHeight / metricData.models.length - 2;
                
                return (
                  <g key={model.model}>
                    <rect
                      x={padding + 50}
                      y={y}
                      width={barWidth}
                      height={barHeightAdjusted}
                      fill={colors[modelIndex % colors.length]}
                      opacity="0.8"
                    />
                    <text
                      x={padding + 55 + barWidth}
                      y={y + barHeightAdjusted / 2}
                      fontSize="10"
                      fill="#666"
                      alignmentBaseline="middle"
                    >
                      {model.value.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default ComparisonCharts;
