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
  content?: string; // raw prompt content (can be markdown)
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
  // data
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filtered, setFiltered] = useState<Prompt[]>([]);

  // query state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');
  const [tier, setTier] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all');

  // ui state
  const [sortBy, setSortBy] = useState<'updated' | 'popular' | 'rating' | 'priceAsc' | 'priceDesc'>('updated');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(PAGE_SIZE_OPTIONS[0]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // dnd
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // fetch
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setIsLoading(true);
        // Replace with real API call
        const res = await fetch('/api/prompts');
        if (!res.ok) throw new Error('Failed to load prompts');
        const data: Prompt[] = await res.json();
        setPrompts(data);
        setFiltered(data);
      } catch (e: any) {
        setError(e?.message || 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  // derived
  const allTags = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach(p => (p.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [prompts]);

  // filter + sort
  useEffect(() => {
    let list = [...prompts];
    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q)
      );
    }
    // category
    if (selectedCategory !== 'all') {
      list = list.filter(p => (p.category || 'Other') === selectedCategory);
    }
    // tags
    if (selectedTags.length) {
      list = list.filter(p => selectedTags.every(t => (p.tags || []).includes(t)));
    }
    // visibility
    if (visibility !== 'all') {
      list = list.filter(p => (p.visibility || 'public') === visibility);
    }
    // tier
    if (tier !== 'all') {
      list = list.filter(p => (p.tier || 'free') === tier);
    }
    // sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return (b.views || 0) - (a.views || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'priceAsc':
          return (a.price || 0) - (b.price || 0);
        case 'priceDesc':
          return (b.price || 0) - (a.price || 0);
        case 'updated':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    setFiltered(list);
    setPage(1);
  }, [prompts, search, selectedCategory, selectedTags, visibility, tier, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // dnd handlers
  const ids = currentPageItems.map(p => p._id);
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const pageCloned = arrayMove(currentPageItems, oldIndex, newIndex);
    // apply back to filtered + prompts maintaining other pages order
    const newFiltered = [...filtered];
    const start = (page - 1) * pageSize;
    for (let i = 0; i < pageCloned.length; i++) newFiltered[start + i] = pageCloned[i];
    setFiltered(newFiltered);
  }

  // helpers
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };
  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedTags([]);
    setVisibility('all');
    setTier('all');
    setSortBy('updated');
    setPage(1);
  };

  return (
    <div className="marketplace">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15.5 15.5L21 21" stroke="#9aa4b2" strokeWidth="2" strokeLinecap="round"/><circle cx="10" cy="10" r="6" stroke="#9aa4b2" strokeWidth="2"/></svg>
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="快速搜尋..." />
        </div>

        <h3>分類</h3>
        <div className="category-list">
          {CATEGORIES.map(c => (
            <button key={c} className={`category-chip ${selectedCategory === c ? 'active' : ''}`} onClick={() => setSelectedCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        <h3>標籤</h3>
        <div className="tag-list">
          {allTags.map(t => (
            <button key={t} className={`tag-chip ${selectedTags.includes(t) ? 'active' : ''}`} onClick={() => toggleTag(t)}>
              #{t}
            </button>
          ))}
        </div>

        <h3>可見性 / 權限</h3>
        <div className="filters">
          <select className="select" value={visibility} onChange={e => setVisibility(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="public">公共</option>
            <option value="private">私人</option>
          </select>
          <select className="select" value={tier} onChange={e => setTier(e.target.value as any)}>
            <option value="all">全部權限</option>
            <option value="free">免費</option>
            <option value="pro">專業</option>
            <option value="enterprise">企業</option>
          </select>
        </div>
      </aside>

      {/* Content */}
      <section className="content">
        <div className="toolbar">
          <div className="active-filters">
            {(search || selectedCategory !== 'all' || selectedTags.length > 0) && (
              <>
                {search && (
                  <span className="filter-chip">關鍵字: "{search}" <button onClick={() => setSearch('')}>✕</button></span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="filter-chip">分類: {selectedCategory} <button onClick={() => setSelectedCategory('all')}>✕</button></span>
                )}
                {selectedTags.map(tag => (
                  <span key={tag} className="filter-chip">標籤: {tag} <button onClick={() => toggleTag(tag)}>✕</button></span>
                ))}
              </>
            )}
          </div>
          <button className="clear-all-btn" onClick={clearAllFilters}>清除全部篩選</button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <select className="select" value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="updated">最近更新</option>
              <option value="popular">最熱門</option>
              <option value="rating">最高評分</option>
              <option value="priceAsc">價格（低到高）</option>
              <option value="priceDesc">價格（高到低）</option>
            </select>
            <select className="select" value={pageSize} onChange={e => setPageSize(parseInt(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}/頁</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="loading-state"><div className="spinner" />載入 Prompt 中...</div>
        )}
        {error && (
          <div className="error-state">錯誤：{error} <button onClick={() => location.reload()}>重試</button></div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="empty-state"><div className="empty-icon">📭</div>未找到 Prompt，請調整搜尋或篩選 <button className="clear-all-btn" onClick={clearAllFilters}>清除所有篩選</button></div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <>
            <div className="results-info">顯示 {Math.min(page * pageSize, filtered.length)} / {filtered.length} 個 Prompt</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <div className="prompts-grid">
                  {currentPageItems.map(p => (
                    <SortableItem key={p._id} id={p._id}>
                      <PromptCard
                        prompt={p}
                        renderContent={(content?: string, format?: string) => (
                          format === 'markdown' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                              {content || ''}
                            </ReactMarkdown>
                          ) : (
                            <pre className="prompt-content-pre">{content}</pre>
                          )
                        )}
                      />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(1)}>«</button>
              <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
              <span>第 {page} / {totalPages} 頁</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
              <button disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Marketplace;
