import React, { useState, useEffect } from 'react';
import './marketplace.css'; // Import CSS for better styling

const Marketplace = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allTags, setAllTags] = useState([]);

  const categories = [
    'all',
    'Writing',
    'Coding',
    'Marketing',
    'Business',
    'Education',
    'Creative',
    'Analytics',
    'Other'
  ];

  // Fetch prompts from API
  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/prompts');
        if (!response.ok) {
          throw new Error('Failed to fetch prompts');
        }
        const data = await response.json();
        setPrompts(data);
        setFilteredPrompts(data);
        
        // Extract all unique tags from prompts
        const tags = new Set();
        data.forEach(prompt => {
          if (prompt.tags && Array.isArray(prompt.tags)) {
            prompt.tags.forEach(tag => tags.add(tag));
          }
        });
        setAllTags(Array.from(tags));
      } catch (err) {
        setError(err.message);
        console.error('Error fetching prompts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Enhanced filter logic with keyword, category, and tags
  useEffect(() => {
    let filtered = prompts;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }

    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(prompt =>
        prompt.tags?.some(tag => selectedTags.includes(tag))
      );
    }

    // Filter by search term (searches in title, description, and tags)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(prompt =>
        prompt.title?.toLowerCase().includes(searchLower) ||
        prompt.description?.toLowerCase().includes(searchLower) ||
        prompt.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        prompt.author?.name?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPrompts(filtered);
  }, [searchTerm, selectedCategory, selectedTags, prompts]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedTags([]);
  };

  const PromptCard = ({ prompt }) => (
    <div className="prompt-card">
      <div className="prompt-header">
        <h3 className="prompt-title">{prompt.title}</h3>
        <span className="prompt-category-badge">{prompt.category}</span>
      </div>
      <p className="prompt-description">{prompt.description}</p>
      <div className="prompt-meta">
        <div className="prompt-author">
          {prompt.author?.avatar && (
            <img
              src={prompt.author.avatar}
              alt={prompt.author?.name}
              className="author-avatar"
            />
          )}
          <span>{prompt.author?.name}</span>
        </div>
        <div className="prompt-stats">
          <span title="Views">👁 {prompt.views || 0}</span>
          <span title="Rating">⭐ {prompt.rating || 0}</span>
          <span title="Price" className="price-tag">
            {prompt.price ? `$${prompt.price}` : 'Free'}
          </span>
        </div>
      </div>
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="prompt-tags">
          {prompt.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      )}
      <button
        className="view-prompt-button"
        onClick={() => window.location.href = `/prompts/${prompt._id}`}
      >
        查看詳情
      </button>
    </div>
  );

  return (
    <div className="marketplace-container">
      {/* Header Section */}
      <header className="marketplace-header">
        <h1>Prompt 市集</h1>
        <p className="subtitle">探索及購買高質量的 AI Prompt</p>
      </header>

      {/* Enhanced Search and Filter Section */}
      <div className="marketplace-controls">
        {/* Search Bar with Icon */}
        <div className="search-section">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="搜尋 Prompt（關鍵字、標題、描述、標籤）..."
              value={searchTerm}
              onChange={handleSearch}
              className="search-input"
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchTerm('')}
                title="清除搜尋"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="filter-section">
          <label className="filter-label">
            <span className="filter-icon">📂</span>
            分類篩選：
          </label>
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category === 'all' ? '全部' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="filter-section">
            <label className="filter-label">
              <span className="filter-icon">🏷️</span>
              標籤篩選：
            </label>
            <div className="tag-buttons">
              {allTags.slice(0, 15).map((tag) => (
                <button
                  key={tag}
                  className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {(searchTerm || selectedCategory !== 'all' || selectedTags.length > 0) && (
          <div className="active-filters">
            <span className="filter-label">已套用篩選：</span>
            {searchTerm && (
              <span className="filter-chip">
                關鍵字: "{searchTerm}"
                <button onClick={() => setSearchTerm('')}>✕</button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="filter-chip">
                分類: {selectedCategory}
                <button onClick={() => setSelectedCategory('all')}>✕</button>
              </span>
            )}
            {selectedTags.map(tag => (
              <span key={tag} className="filter-chip">
                標籤: {tag}
                <button onClick={() => handleTagToggle(tag)}>✕</button>
              </span>
            ))}
            <button className="clear-all-btn" onClick={clearAllFilters}>
              清除全部篩選
            </button>
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="marketplace-content">
        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>載入 Prompt 中...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>錯誤：{error}</p>
            <button onClick={() => window.location.reload()}>重試</button>
          </div>
        )}

        {!isLoading && !error && filteredPrompts.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>未找到 Prompt</h3>
            <p>請嘗試調整您的搜尋條件或篩選器</p>
            <button className="clear-all-btn" onClick={clearAllFilters}>
              清除所有篩選
            </button>
          </div>
        )}

        {!isLoading && !error && filteredPrompts.length > 0 && (
          <>
            <div className="results-info">
              <p>
                顯示 <strong>{filteredPrompts.length}</strong> / {prompts.length} 個 Prompt
              </p>
            </div>
            <div className="prompts-grid">
              {filteredPrompts.map((prompt) => (
                <PromptCard key={prompt._id} prompt={prompt} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
