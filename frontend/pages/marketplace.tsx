import React, { useEffect, useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from '../components/SortableItem';
import PromptCard from '../components/PromptCard';
import './marketplace.css';

// Types
export type Prompt = {
  _id: string;
  title: string;
  description?: string;
  content?: string;
  format?: 'markdown' | 'text' | 'json' | 'yaml' | 'other';
  category?: string;
  tags: string[];
  price?: number;
  rating?: number;
  ratingsCount?: number;
  views?: number;
  visibility?: 'public' | 'private';
  updatedAt?: string;
  tier?: 'free' | 'pro' | 'enterprise';
};

const CATEGORIES = ['all', 'Writing', 'Coding', 'Marketing', 'Business', 'Education', 'Creative', 'Analytics', 'Other'] as const;
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;

const Marketplace: React.FC = () => {
  // State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filtered, setFiltered] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'rating'>('latest');
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch prompts
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts');
      if (!res.ok) throw new Error('Failed to fetch prompts');
      const data = await res.json();
      setPrompts(data);
      setFiltered(data);
    } catch (err: any) {
      setError(err.message || 'Error loading prompts');
    } finally {
      setLoading(false);
    }
  };

  // Filter & sort logic
  useEffect(() => {
    let result = [...prompts];

    // Category filter
    if (category !== 'all') {
      result = result.filter((p) => p.category === category);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'latest') {
      result.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    setFiltered(result);
    setCurrentPage(1);
  }, [prompts, category, search, sortBy]);

  // Pagination
  const paginatedPrompts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  // DnD handlers
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFiltered((items) => {
      const oldIndex = items.findIndex((i) => i._id === active.id);
      const newIndex = items.findIndex((i) => i._id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const openDetail = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsDetailOpen(true);
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedPrompt(null), 300);
  };

  return (
    <div className="marketplace-container">
      {/* Header */}
      <header className="marketplace-header">
        <h1>Prompt Marketplace</h1>
        <p className="subtitle">Discover and share high-quality AI prompts</p>
      </header>

      {/* Controls */}
      <div className="marketplace-controls">
        {/* Search bar */}
        <div className="search-wrapper">
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
              ✕
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="filter-group">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="filter-select">
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="filter-group">
          <label>Sort by</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="filter-select">
            <option value="latest">Latest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* Page size */}
        <div className="filter-group">
          <label>Show</label>
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="filter-select">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results info */}
      <div className="results-info">
        <span>
          {filtered.length} {filtered.length === 1 ? 'prompt' : 'prompts'} found
        </span>
      </div>

      {/* Loading / Error */}
      {loading && <div className="loading-state">Loading prompts...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* Grid */}
      {!loading && !error && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={paginatedPrompts.map((p) => p._id)} strategy={rectSortingStrategy}>
            <div className="prompts-grid">
              {paginatedPrompts.map((prompt) => (
                <SortableItem key={prompt._id} id={prompt._id}>
                  <PromptCard prompt={prompt} onClick={() => openDetail(prompt)} />
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <p>No prompts found matching your criteria.</p>
          <button onClick={() => { setSearch(''); setCategory('all'); }} className="reset-btn">
            Reset filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="page-btn">
            Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="page-btn">
            Next
          </button>
        </div>
      )}

      {/* Detail modal */}
      {isDetailOpen && selectedPrompt && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetail} aria-label="Close">
              ✕
            </button>
            <div className="modal-body">
              <h2>{selectedPrompt.title}</h2>
              {selectedPrompt.description && <p className="modal-description">{selectedPrompt.description}</p>}
              
              <div className="modal-meta">
                {selectedPrompt.category && <span className="meta-badge">{selectedPrompt.category}</span>}
                {selectedPrompt.rating !== undefined && (
                  <span className="meta-rating">★ {selectedPrompt.rating.toFixed(1)}</span>
                )}
                {selectedPrompt.views !== undefined && <span className="meta-views">{selectedPrompt.views} views</span>}
              </div>

              {selectedPrompt.tags.length > 0 && (
                <div className="modal-tags">
                  {selectedPrompt.tags.map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              {selectedPrompt.content && (
                <div className="modal-content-area">
                  <h3>Prompt Content</h3>
                  {selectedPrompt.format === 'markdown' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                      {selectedPrompt.content}
                    </ReactMarkdown>
                  ) : (
                    <pre className="prompt-code">{selectedPrompt.content}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
