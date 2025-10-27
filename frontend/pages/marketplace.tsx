import React, { useEffect, useMemo, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
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
};

const CATEGORIES = ['all','Writing','Coding','Marketing','Business','Education','Creative','Analytics','Other'];
const PAGE_SIZE_OPTIONS = [12, 24, 48];

const Marketplace: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filtered, setFiltered] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // sorting
  const [sortKey, setSortKey] = useState<'trending'|'newest'|'popular'|'rating'|'price'>('trending');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('desc');

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  // dnd-kit sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // Fetch prompts
  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/prompts');
        if (!res.ok) throw new Error('Failed to fetch prompts');
        const data: Prompt[] = await res.json();
        const normalized = (data || []).map(p => ({
          ...p,
          tags: Array.isArray(p.tags) ? p.tags : [],
          rating: Number(p.rating || (p as any).avgRating || 0),
          ratingsCount: Number(p.ratingsCount || (p as any).reviews?.length || 0),
          views: Number(p.views || 0),
          visibility: (p.visibility as any) || 'public',
          format: (p.format as any) || (p.content?.includes('```') ? 'markdown' : 'text'),
        }));
        setPrompts(normalized);
        setFiltered(normalized);
        const tagSet = new Set<string>();
        normalized.forEach(pr => pr.tags.forEach(t => tagSet.add(t)));
        setAllTags(Array.from(tagSet).sort());
      } catch (e: any) {
        setError(e.message || 'Unknown error');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, []);

  // Filtering + sorting
  const applyFilterSort = useMemo(() => {
    const lower = search.toLowerCase();
    const result = prompts.filter(p => {
      const inCategory = selectedCategory === 'all' || (p.category || 'Other') === selectedCategory;
      const inTags = selectedTags.length === 0 || selectedTags.every(t => p.tags.includes(t));
      const inText = !lower || `${p.title} ${p.description ?? ''} ${p.tags.join(' ')}`.toLowerCase().includes(lower);
      return inCategory && inTags && inText;
    }).sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'price': return ((a.price||0) - (b.price||0)) * dir;
        case 'rating': return ((a.rating||0) - (b.rating||0)) * dir;
        case 'popular': return ((a.ratingsCount||0) - (b.ratingsCount||0)) * dir;
        case 'newest': return (new Date(a.updatedAt||0).getTime() - new Date(b.updatedAt||0).getTime()) * dir;
        case 'trending': default:
          return (((a.views||0) + (a.ratingsCount||0)*10 + (a.rating||0)*20) - ((b.views||0) + (b.ratingsCount||0)*10 + (b.rating||0)*20)) * dir;
      }
    });
    return result;
  }, [prompts, search, selectedCategory, selectedTags, sortKey, sortOrder]);

  useEffect(() => {
    setFiltered(applyFilterSort);
    setPage(1);
  }, [applyFilterSort]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // drag & drop reordering within current page only
  const currentPageItems = useMemo(() => filtered.slice((page-1)*pageSize, page*pageSize), [filtered, page, pageSize]);
  const ids = currentPageItems.map(p => p._id);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    const newPageItems = arrayMove(currentPageItems, oldIndex, newIndex);
    // merge reordered page items back into filtered
    const start = (page-1)*pageSize;
    const updated = [...filtered];
    newPageItems.forEach((item, i) => { updated[start + i] = item; });
    setFiltered(updated);
  };

  return (
    <div className="marketplace-page">
      <aside className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">分類</div>
          <ul className="category-list">
            {CATEGORIES.map(cat => (
              <li key={cat}>
                <button className={`category-item ${selectedCategory===cat ? 'active' : ''}`} onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-title">標籤</div>
          <div className="tag-cloud">
            {allTags.slice(0, 50).map(tag => (
              <button key={tag} className={`tag-chip ${selectedTags.includes(tag) ? 'selected' : ''}`} onClick={() => toggleTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="main">
        <div className="toolbar">
          <div className="search-box">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋標題、描述或標籤..."
              aria-label="search prompts"
            />
          </div>
          <div className="sort-controls">
            <select value={sortKey} onChange={e => setSortKey(e.target.value as any)}>
              <option value="trending">趨勢</option>
              <option value="newest">最新</option>
              <option value="popular">最受關注</option>
              <option value="rating">評分</option>
              <option value="price">價格</option>
            </select>
            {sortKey !== 'trending' && (
              <select aria-label="sort order" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
                <option value="desc">由高到低</option>
                <option value="asc">由低到高</option>
              </select>
            )}
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}/頁</option>)}
            </select>
          </div>
        </div>

        {(search || selectedCategory!=='all' || selectedTags.length>0) && (
          <div className="active-filters">
            {search && <span className="filter-chip">關鍵字: "{search}" <button onClick={() => setSearch('')}>✕</button></span>}
            {selectedCategory!=='all' && <span className="filter-chip">分類: {selectedCategory} <button onClick={() => setSelectedCategory('all')}>✕</button></span>}
            {selectedTags.map(tag => (
              <span key={tag} className="filter-chip">標籤: {tag} <button onClick={() => toggleTag(tag)}>✕</button></span>
            ))}
            <button className="clear-all-btn" onClick={clearAllFilters}>清除全部篩選</button>
          </div>
        )}

        {isLoading && <div className="loading-state"><div className="spinner" />載入 Prompt 中...</div>}
        {error && <div className="error-state">錯誤：{error} <button onClick={() => location.reload()}>重試</button></div>}
        {!isLoading && !error && filtered.length===0 && (
          <div className="empty-state"><div className="empty-icon">📭</div>未找到 Prompt/ 請嘗試調整搜尋或篩選<button className="clear-all-btn" onClick={clearAllFilters}>清除所有篩選</button></div>
        )}

        {!isLoading && !error && filtered.length>0 && (
          <>
            <div className="results-info">顯示 {Math.min(page*pageSize, filtered.length)} / {filtered.length} 個 Prompt</div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={ids} strategy={rectSortingStrategy}>
                <div className="prompts-grid">
                  {currentPageItems.map(p => (
                    <SortableItem key={p._id} id={p._id}>
                      <PromptCard prompt={p} renderContent={(content?: string, format?: string) => (
                        format === 'markdown' ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                            {content || ''}
                          </ReactMarkdown>
                        ) : (
                          <pre className="prompt-content-pre">{content}</pre>
                        )
                      )} />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="pagination">
              <button disabled={page===1} onClick={() => setPage(1)}>«</button>
              <button disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))}>‹</button>
              <span>第 {page} / {totalPages} 頁</span>
              <button disabled={page===totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>›</button>
              <button disabled={page===totalPages} onClick={() => setPage(totalPages)}>»</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Marketplace;
