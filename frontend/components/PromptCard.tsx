import React from 'react';

export interface Prompt {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  tags: string[];
  price?: number;
  rating?: number;
  ratingsCount?: number;
  views?: number;
  tier?: 'free' | 'pro' | 'enterprise';
  updatedAt?: string;
}

interface PromptCardProps {
  prompt: Prompt;
  onClick?: () => void;
}

const PromptCard: React.FC<PromptCardProps> = ({ prompt, onClick }) => {
  const getTierBadge = () => {
    if (!prompt.tier || prompt.tier === 'free') return null;
    return (
      <span className={`tier-badge tier-${prompt.tier}`}>
        {prompt.tier.toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="prompt-card" onClick={onClick}>
      {/* Header */}
      <div className="prompt-card-header">
        <h3 className="prompt-card-title">{prompt.title}</h3>
        {getTierBadge()}
      </div>

      {/* Description */}
      {prompt.description && (
        <p className="prompt-card-description">{prompt.description}</p>
      )}

      {/* Category */}
      {prompt.category && (
        <div className="prompt-card-category">
          <span className="category-badge">{prompt.category}</span>
        </div>
      )}

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="prompt-card-tags">
          {prompt.tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="tag">
              {tag}
            </span>
          ))}
          {prompt.tags.length > 3 && (
            <span className="tag tag-more">+{prompt.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="prompt-card-footer">
        {/* Rating */}
        {prompt.rating !== undefined && (
          <div className="rating">
            <span className="star">★</span>
            <span className="rating-value">{prompt.rating.toFixed(1)}</span>
            {prompt.ratingsCount !== undefined && (
              <span className="rating-count">({prompt.ratingsCount})</span>
            )}
          </div>
        )}

        {/* Views */}
        {prompt.views !== undefined && (
          <div className="views">
            <span className="views-count">{prompt.views.toLocaleString()} views</span>
          </div>
        )}

        {/* Date */}
        {prompt.updatedAt && (
          <div className="date">
            <span className="date-text">{formatDate(prompt.updatedAt)}</span>
          </div>
        )}

        {/* Price */}
        {prompt.price !== undefined && prompt.price > 0 && (
          <div className="price">
            <span className="price-value">${prompt.price}</span>
          </div>
        )}
        {(!prompt.price || prompt.price === 0) && (
          <div className="price">
            <span className="price-free">Free</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptCard;
