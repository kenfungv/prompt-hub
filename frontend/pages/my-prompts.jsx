import React, { useState, useEffect } from 'react';

const MyPrompts = () => {
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    category: 'Writing',
    price: 0,
    tags: []
  });

  const categories = ['Writing', 'Coding', 'Marketing', 'Business', 'Education', 'Creative', 'Analytics', 'Other'];

  // Fetch user's prompts
  useEffect(() => {
    fetchMyPrompts();
  }, []);

  const fetchMyPrompts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await fetch(`/api/prompts/user/${user.googleId}`);
      if (!response.ok) throw new Error('Failed to fetch prompts');
      const data = await response.json();
      setPrompts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim());
    setFormData(prev => ({ ...prev, tags }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const url = editingPrompt 
        ? `/api/prompts/${editingPrompt._id}` 
        : '/api/prompts';
      const method = editingPrompt ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          author: user.googleId
        }),
      });

      if (!response.ok) throw new Error('Failed to save prompt');
      
      setShowModal(false);
      resetForm();
      fetchMyPrompts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      title: prompt.title,
      description: prompt.description,
      content: prompt.content,
      category: prompt.category,
      price: prompt.price,
      tags: prompt.tags || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete prompt');
      fetchMyPrompts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content: '',
      category: 'Writing',
      price: 0,
      tags: []
    });
    setEditingPrompt(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="my-prompts-container">
      <header className="my-prompts-header">
        <h1>My Prompts</h1>
        <button className="create-btn" onClick={openCreateModal}>
          + Create New Prompt
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}

      {isLoading && <div className="loading">Loading...</div>}

      {!isLoading && prompts.length === 0 && (
        <div className="empty-state">
          <p>You haven't created any prompts yet.</p>
          <button onClick={openCreateModal}>Create Your First Prompt</button>
        </div>
      )}

      <div className="prompts-list">
        {prompts.map(prompt => (
          <div key={prompt._id} className="prompt-item">
            <div className="prompt-item-header">
              <h3>{prompt.title}</h3>
              <span className="category-badge">{prompt.category}</span>
            </div>
            <p className="prompt-description">{prompt.description}</p>
            <div className="prompt-meta">
              <span>👁 {prompt.views || 0} views</span>
              <span>⭐ {prompt.rating || 0}/5</span>
              <span>💰 ${prompt.price || 'Free'}</span>
            </div>
            <div className="prompt-actions">
              <button onClick={() => handleEdit(prompt)} className="edit-btn">Edit</button>
              <button onClick={() => handleDelete(prompt._id)} className="delete-btn">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="prompt-form">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="content">Prompt Content *</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  rows="6"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price">Price ($)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags.join(', ')}
                  onChange={handleTagsChange}
                  placeholder="e.g., chatgpt, creative, business"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="submit-btn">
                  {isLoading ? 'Saving...' : editingPrompt ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPrompts;
