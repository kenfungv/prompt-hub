import React from 'react';

/**
 * PromptCard Component
 * Displays a single prompt with metadata in a card format
 */
const PromptCard = ({ prompt, onClick }) => {
  const {
    id,
    title,
    description,
    category,
    tags = [],
    author,
    likes = 0,
    uses = 0,
    createdAt,
    previewText
  } = prompt;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Format number for display (e.g., 1000 -> 1k)
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="prompt-card" onClick={() => onClick && onClick(id)}>
      <style>{`
        .prompt-card {
          border: 1px solid #e1e4e8;
          border-radius: 8px;
          padding: 16px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        .prompt-card:hover {
          border-color: #0969da;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #24292f;
          margin: 0;
          line-height: 1.4;
        }
        .card-category {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          background: #0969da;
          color: #fff;
        }
        .card-description {
          font-size: 14px;
          color: #57606a;
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-preview {
          padding: 10px;
          background: #f6f8fa;
          border-radius: 6px;
          font-size: 13px;
          color: #24292f;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow: hidden;
          max-height: 60px;
          position: relative;
        }
        .card-preview::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(transparent, #f6f8fa);
        }
        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .card-tag {
          padding: 3px 8px;
          background: #ddf4ff;
          color: #0969da;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid #e1e4e8;
          font-size: 12px;
          color: #57606a;
        }
        .card-author {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .author-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0969da;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
        }
        .card-stats {
          display: flex;
          gap: 12px;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stat-icon {
          font-size: 14px;
        }
        .card-date {
          font-size: 11px;
          color: #8c959f;
        }
      `}</style>

      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {category && <span className="card-category">{category}</span>}
      </div>

      {description && (
        <p className="card-description">{description}</p>
      )}

      {previewText && (
        <div className="card-preview">{previewText}</div>
      )}

      {tags && tags.length > 0 && (
        <div className="card-tags">
          {tags.slice(0, 5).map((tag, index) => (
            <span key={index} className="card-tag">
              {tag}
            </span>
          ))}
          {tags.length > 5 && (
            <span className="card-tag">+{tags.length - 5}</span>
          )}
        </div>
      )}

      <div className="card-footer">
        <div className="card-author">
          <div className="author-avatar">
            {author ? author.charAt(0).toUpperCase() : 'A'}
          </div>
          <span>{author || 'Anonymous'}</span>
        </div>

        <div className="card-stats">
          <div className="stat-item">
            <span className="stat-icon">♥</span>
            <span>{formatNumber(likes)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">📊</span>
            <span>{formatNumber(uses)}</span>
          </div>
        </div>

        {createdAt && (
          <div className="card-date">{formatDate(createdAt)}</div>
        )}
      </div>
    </div>
  );
};

export default PromptCard;
