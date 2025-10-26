import React, { useState, useEffect } from 'react';
import './PromptMarketplace.css';

const PromptMarketplace = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    sortBy: 'popular',
    searchQuery: ''
  });
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  // API Integration - Fetch prompts from marketplace
  useEffect(() => {
    fetchPrompts();
  }, [filters]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        category: filters.category,
        sort: filters.sortBy,
        search: filters.searchQuery
      });
      const response = await fetch(`/api/prompts/marketplace?${queryParams}`);
      const data = await response.json();
      setPrompts(data.prompts || []);
    } catch (error) {
      console.error('Failed to fetch prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (promptId) => {
    try {
      const response = await fetch(`/api/prompts/purchase/${promptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        alert('Prompt purchased successfully!');
        fetchPrompts();
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handlePreview = (prompt) => {
    setSelectedPrompt(prompt);
  };

  return (
    <div className="prompt-marketplace">
      <header className="marketplace-header">
        <h1>Prompt Marketplace</h1>
        <p>Discover and purchase high-quality prompts from the community</p>
      </header>

      <div className="marketplace-filters">
        <input
          type="text"
          placeholder="Search prompts..."
          value={filters.searchQuery}
          onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
          className="search-input"
        />
        
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          <option value="writing">Writing</option>
          <option value="coding">Coding</option>
          <option value="marketing">Marketing</option>
          <option value="design">Design</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          className="filter-select"
        >
          <option value="popular">Most Popular</option>
          <option value="recent">Most Recent</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="marketplace-content">
        {loading ? (
          <div className="loading-spinner">Loading prompts...</div>
        ) : (
          <div className="prompts-grid">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="prompt-card">
                <div className="prompt-card-header">
                  <h3>{prompt.title}</h3>
                  <span className="prompt-price">${prompt.price}</span>
                </div>
                <p className="prompt-description">{prompt.description}</p>
                <div className="prompt-meta">
                  <span className="prompt-category">{prompt.category}</span>
                  <span className="prompt-rating">⭐ {prompt.rating}</span>
                  <span className="prompt-purchases">{prompt.purchases} purchases</span>
                </div>
                <div className="prompt-actions">
                  <button
                    onClick={() => handlePreview(prompt)}
                    className="btn-preview"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handlePurchase(prompt.id)}
                    className="btn-purchase"
                  >
                    Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPrompt && (
        <div className="prompt-preview-modal">
          <div className="modal-content">
            <button
              onClick={() => setSelectedPrompt(null)}
              className="modal-close"
            >
              ×
            </button>
            <h2>{selectedPrompt.title}</h2>
            <p className="preview-description">{selectedPrompt.description}</p>
            <div className="preview-content">
              <h4>Prompt Preview:</h4>
              <pre>{selectedPrompt.content}</pre>
            </div>
            <button
              onClick={() => handlePurchase(selectedPrompt.id)}
              className="btn-purchase-modal"
            >
              Purchase for ${selectedPrompt.price}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptMarketplace;
