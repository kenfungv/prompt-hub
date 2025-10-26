import React, { useState, useEffect } from 'react';

const Marketplace = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      } catch (err) {
        setError(err.message);
        console.error('Error fetching prompts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Filter prompts based on search and category
  useEffect(() => {
    let filtered = prompts;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(prompt =>
        prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredPrompts(filtered);
  }, [searchTerm, selectedCategory, prompts]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const PromptCard = ({ prompt }) => (
    <div className="prompt-card">
      <div className="prompt-header">
        <h3>{prompt.title}</h3>
        <span className="prompt-category">{prompt.category}</span>
      </div>
      <p className="prompt-description">{prompt.description}</p>
      <div className="prompt-meta">
        <div className="prompt-author">
          <img src={prompt.author?.avatar} alt={prompt.author?.name} />
          <span>{prompt.author?.name}</span>
        </div>
        <div className="prompt-stats">
          <span>👁 {prompt.views || 0}</span>
          <span>⭐ {prompt.rating || 0}</span>
          <span>💰 ${prompt.price || 'Free'}</span>
        </div>
      </div>
      <div className="prompt-tags">
        {prompt.tags?.map((tag, index) => (
          <span key={index} className="tag">{tag}</span>
        ))}
      </div>
      <button className="view-prompt-button" onClick={() => window.location.href = `/prompts/${prompt._id}`}>
        View Details
      </button>
    </div>
  );

  return (
    <div className="marketplace-container">
      <header className="marketplace-header">
        <h1>Prompt Marketplace</h1>
        <p>Discover and purchase high-quality AI prompts</p>
      </header>

      <div className="marketplace-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          <label>Category:</label>
          <div className="category-buttons">
            {categories.map((category) => (
              <button
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="marketplace-content">
        {isLoading && (
          <div className="loading-state">
            <p>Loading prompts...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Error: {error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}

        {!isLoading && !error && filteredPrompts.length === 0 && (
          <div className="empty-state">
            <p>No prompts found. Try adjusting your search or filters.</p>
          </div>
        )}

        {!isLoading && !error && filteredPrompts.length > 0 && (
          <div className="prompts-grid">
            {filteredPrompts.map((prompt) => (
              <PromptCard key={prompt._id} prompt={prompt} />
            ))}
          </div>
        )}
      </div>

      <div className="marketplace-footer">
        <p>Showing {filteredPrompts.length} of {prompts.length} prompts</p>
      </div>
    </div>
  );
};

export default Marketplace;
