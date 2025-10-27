import React from 'react';
import { Star, Tag, DollarSign, TrendingUp, Clock, User, ExternalLink } from 'lucide-react';

/**
 * AI Prompt 資料結構
 */
export interface PromptData {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  currency?: string;
  author: {
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  rating?: number;
  reviewCount?: number;
  usageCount?: number;
  createdAt: string;
  updatedAt?: string;
  featured?: boolean;
  trending?: boolean;
  previewContent?: string;
  modelCompatibility?: string[];
}

/**
 * PromptCard 組件 Props
 */
export interface PromptCardProps {
  prompt: PromptData;
  variant?: 'default' | 'compact' | 'detailed';
  onView?: (promptId: string) => void;
  onPurchase?: (promptId: string) => void;
  onAddToCart?: (promptId: string) => void;
  showActions?: boolean;
  className?: string;
}

/**
 * PromptCard - 統一處理 AI Prompt 顯示組件
 * 
 * 功能：
 * - 顯示 Prompt 標題、分類、標籤、價格、描述
 * - 支援多種顯示模式（預設、緊湊、詳細）
 * - 顯示作者資訊、評分、使用次數
 * - 支援特色標記、熱門標記
 * - 響應式設計，符合市集需求
 * 
 * @example
 * ```tsx
 * <PromptCard 
 *   prompt={promptData} 
 *   variant="default"
 *   onView={handleView}
 *   onPurchase={handlePurchase}
 *   showActions={true}
 * />
 * ```
 */
const PromptCard: React.FC<PromptCardProps> = ({
  prompt,
  variant = 'default',
  onView,
  onPurchase,
  onAddToCart,
  showActions = true,
  className = '',
}) => {
  const {
    id,
    title,
    description,
    category,
    tags,
    price,
    currency = 'USD',
    author,
    rating,
    reviewCount,
    usageCount,
    createdAt,
    featured,
    trending,
    modelCompatibility,
  } = prompt;

  // 格式化價格顯示
  const formatPrice = (price: number, currency: string): string => {
    if (price === 0) return 'Free';
    const currencySymbol = currency === 'USD' ? '$' : currency;
    return `${currencySymbol}${price.toFixed(2)}`;
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  // 緊湊模式渲染
  if (variant === 'compact') {
    return (
      <div className={`prompt-card compact ${className}`}>
        <div className="card-header">
          <h3 className="title" onClick={() => onView?.(id)}>{title}</h3>
          {featured && <span className="badge featured">Featured</span>}
          {trending && <span className="badge trending"><TrendingUp size={14} /> Trending</span>}
        </div>
        <div className="category-price">
          <span className="category">{category}</span>
          <span className="price">{formatPrice(price, currency)}</span>
        </div>
        {showActions && (
          <div className="actions">
            <button onClick={() => onView?.(id)} className="btn-view">View</button>
            {price > 0 && <button onClick={() => onPurchase?.(id)} className="btn-purchase">Buy</button>}
          </div>
        )}
      </div>
    );
  }

  // 詳細模式渲染
  if (variant === 'detailed') {
    return (
      <div className={`prompt-card detailed ${className}`}>
        <div className="card-header">
          <div className="title-section">
            <h2 className="title">{title}</h2>
            <div className="badges">
              {featured && <span className="badge featured">⭐ Featured</span>}
              {trending && <span className="badge trending"><TrendingUp size={16} /> Trending</span>}
            </div>
          </div>
          <div className="price-section">
            <span className="price-label">Price</span>
            <span className="price">{formatPrice(price, currency)}</span>
          </div>
        </div>

        <div className="card-body">
          <div className="meta-info">
            <div className="category-wrapper">
              <Tag size={16} />
              <span className="category">{category}</span>
            </div>
            {rating && (
              <div className="rating">
                <Star size={16} fill="currentColor" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount && <span className="review-count">({reviewCount})</span>}
              </div>
            )}
            {usageCount && (
              <div className="usage">
                <TrendingUp size={16} />
                <span>{usageCount.toLocaleString()} uses</span>
              </div>
            )}
          </div>

          <p className="description">{description}</p>

          {tags.length > 0 && (
            <div className="tags">
              {tags.map((tag, index) => (
                <span key={index} className="tag">#{tag}</span>
              ))}
            </div>
          )}

          {modelCompatibility && modelCompatibility.length > 0 && (
            <div className="model-compatibility">
              <span className="label">Compatible with:</span>
              <div className="models">
                {modelCompatibility.map((model, index) => (
                  <span key={index} className="model-badge">{model}</span>
                ))}
              </div>
            </div>
          )}

          <div className="author-info">
            {author.avatar && <img src={author.avatar} alt={author.name} className="author-avatar" />}
            <div className="author-details">
              <span className="author-name">
                <User size={14} />
                {author.name}
                {author.verified && <span className="verified">✓</span>}
              </span>
              <span className="created-date">
                <Clock size={14} />
                {formatDate(createdAt)}
              </span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="card-actions">
            <button onClick={() => onView?.(id)} className="btn-secondary">
              <ExternalLink size={16} /> View Details
            </button>
            {onAddToCart && (
              <button onClick={() => onAddToCart(id)} className="btn-outline">
                Add to Cart
              </button>
            )}
            {price > 0 ? (
              <button onClick={() => onPurchase?.(id)} className="btn-primary">
                <DollarSign size={16} /> Purchase Now
              </button>
            ) : (
              <button onClick={() => onPurchase?.(id)} className="btn-primary">
                Get for Free
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // 預設模式渲染
  return (
    <div className={`prompt-card default ${className}`}>
      <div className="card-header">
        <div className="title-wrapper">
          <h3 className="title" onClick={() => onView?.(id)}>
            {title}
          </h3>
          {(featured || trending) && (
            <div className="badges">
              {featured && <span className="badge featured">Featured</span>}
              {trending && <span className="badge trending"><TrendingUp size={14} /></span>}
            </div>
          )}
        </div>
        <span className="price">{formatPrice(price, currency)}</span>
      </div>

      <div className="card-body">
        <div className="meta">
          <span className="category">
            <Tag size={14} />
            {category}
          </span>
          {rating && (
            <span className="rating">
              <Star size={14} fill="currentColor" />
              {rating.toFixed(1)}
            </span>
          )}
        </div>

        <p className="description">{description}</p>

        {tags.length > 0 && (
          <div className="tags">
            {tags.slice(0, 5).map((tag, index) => (
              <span key={index} className="tag">#{tag}</span>
            ))}
            {tags.length > 5 && <span className="tag-more">+{tags.length - 5}</span>}
          </div>
        )}

        <div className="footer">
          <div className="author">
            <User size={14} />
            <span>{author.name}</span>
            {author.verified && <span className="verified">✓</span>}
          </div>
          {usageCount && (
            <span className="usage">{usageCount.toLocaleString()} uses</span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="card-actions">
          <button onClick={() => onView?.(id)} className="btn-view">
            View Details
          </button>
          {price > 0 ? (
            <button onClick={() => onPurchase?.(id)} className="btn-purchase">
              <DollarSign size={16} /> Buy Now
            </button>
          ) : (
            <button onClick={() => onPurchase?.(id)} className="btn-purchase">
              Get Free
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptCard;

/**
 * CSS 樣式建議 (需要在對應的 CSS/SCSS 檔案中實作)
 * 
 * .prompt-card {
 *   border: 1px solid #e5e7eb;
 *   border-radius: 12px;
 *   padding: 16px;
 *   background: white;
 *   transition: all 0.3s ease;
 *   cursor: pointer;
 * }
 * 
 * .prompt-card:hover {
 *   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
 *   transform: translateY(-2px);
 * }
 * 
 * .prompt-card.compact {
 *   padding: 12px;
 * }
 * 
 * .prompt-card.detailed {
 *   padding: 24px;
 *   max-width: 800px;
 * }
 * 
 * // 更多樣式請參考設計系統
 */
