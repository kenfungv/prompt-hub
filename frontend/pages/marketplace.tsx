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
  // New UI fields (client-only)
  likes?: number;
  liked?: boolean;
  bookmarked?: boolean;
  comments?: Array<{ id: string; author: string; text: string; createdAt: string }>; 
};

const CATEGORIES = ['all','Writing','Coding','Marketing','Business','Education','Creative','Analytics','Other'] as const;
const PAGE_SIZE_OPTIONS = [12, 24, 48] as const;
const SORTS = [
  { key: 'latest', label: 'Latest' },
  { key: 'popular', label: 'Popular' },
  { key: 'rating', label: 'Rating' },
  { key: 'price_low', label: 'Price: Low' },
  { key: 'price_high', label: 'Price: High' },
] as const;

const Marketplace: React.FC = () => {
  // State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filtered, setFiltered] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<(typeof SORTS)[number]['key']>('latest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(12);

  // Modal state
  const [isDetailOpen, setDetailOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);

  // Sensors (DnD)
  const sensors = useSensors(useSensor(PointerSensor));

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [promptsRes] = await Promise.all([
          fetch('/api/prompts'),
        ]);
        const promptsData: Prompt[] = await promptsRes.json();

        // Hydrate client-only fields
        const enriched = promptsData.map(p => ({
          likes: 0,
          liked: false,
          bookmarked: false,
          comments: [],
          ...p,
        }));

        setPrompts(enriched);
      } catch (e) {
        console.error('Failed to fetch', e);
      }
    };
    fetchAll();
  }, []);

  // Derived tag cloud
  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    prompts.forEach(p => p.tags?.forEach(t => map.set(t, (map.get(t) || 0) + 1)));
    return [...map.entries()].sort((a,b) => b[1]-a[1]).map(([t]) => t).slice(0, 30);
  }, [prompts]);

  // Filtering + search + category + tag filter
  useEffect(() => {
    let list = [...prompts];

    if (category !== 'all') list = list.filter(p => p.category === category);
    if (activeTags.length) list = list.filter(p => activeTags.every(t => p.tags?.includes(t)));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a,b) => {
      switch (sortKey) {
        case 'popular': return (b.views || 0) - (a.views || 0);
        case 'rating': return (b.rating || 0) - (a.rating || 0);
        case 'price_low': return (a.price || 0) - (b.price || 0);
        case 'price_high': return (b.price || 0) - (a.price || 0);
        case 'latest':
        default:
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      }
    });

    setFiltered(list);
    setPage(1);
  }, [prompts, search, category, activeTags, sortKey]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Handlers
  const toggleTag = (t: string) => {
    setActiveTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const clearTags = () => setActiveTags([]);

  const openDetail = (p: Prompt) => {
    setSelectedPrompt(p);
    setDetailOpen(true);
  };
  const closeDetail = () => setDetailOpen(false);

  const onLike = (id: string) => {
    setPrompts(prev => prev.map(p => p._id === id ? {
      ...p,
      liked: !p.liked,
      likes: (p.likes || 0) + (p.liked ? -1 : 1)
    } : p));
    // TODO: POST /api/prompts/:id/like
  };

  const onBookmark = (id: string) => {
    setPrompts(prev => prev.map(p => p._id === id ? { ...p, bookmarked: !p.bookmarked } : p));
    // TODO: POST /api/prompts/:id/bookmark
  };

  const addComment = async (id: string, text: string) => {
    if (!text.trim()) return;
    const newComment = {
      id: Math.random().toString(36).slice(2),
      author: 'You',
      text,
      createdAt: new Date().toISOString(),
    };
    setPrompts(prev => prev.map(p => p._id === id ? { ...p, comments: [newComment, ...(p.comments || [])] } : p));
    // TODO: POST /api/prompts/:id/comments
  };

  // DnD reorder (local only)
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFiltered((items) => {
      const oldIndex = items.findIndex(i => i._id === active.id);
      const newIndex = items.findIndex(i => i._id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  return (
    <div className="marketplace">
      {/* Header actions */}
      <div className="marketplace-topbar">
        <div className="search-box">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, tags, descriptions..."
            aria-label="Search prompts"
          />
          {search && (
            <button className="ghost" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
          )}
        </div>
        <div className="filters">
          <div className="categories" role="tablist" aria-label="Categories">
            {CATEGORIES.map(c => (
              <button
                key={c}
                role="tab"
                aria-selected={category === c}
                className={category === c ? 'chip active' : 'chip'}
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
          </div>
          <div className="sort">
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} aria-label="Sort prompts">
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) as any)} aria-label="Items per page">
              {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
            </select>
          </div>
        </div>
        {!!activeTags.length && (
          <div className="active-tags">
            {activeTags.map(t => (
              <button key={t} className="chip active" onClick={() => toggleTag(t)} aria-pressed>
                #{t} ✕
              </button>
            ))}
            <button className="ghost" onClick={clearTags}>Clear</button>
          </div>
        )}
      </div>

      {/* Tag cloud */}
      {!!allTags.length && (
        <div className="tag-cloud" aria-label="Popular tags">
          {allTags.map(t => (
            <button key={t} className={activeTags.includes(t) ? 'tag active' : 'tag'} onClick={() => toggleTag(t)}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pageItems.map(i => i._id)} strategy={rectSortingStrategy}>
          <div className="grid">
            {pageItems.map(p => (
              <SortableItem id={p._id} key={p._id}>
                <PromptCard
                  prompt={p}
                  onClick={() => openDetail(p)}
                  onLike={() => onLike(p._id)}
                  onBookmark={() => onBookmark(p._id)}
                />
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Pagination */}
      <div className="pagination">
        <button className="ghost" disabled={page === 1} onClick={() => setPage(1)} aria-label="First page">⏮</button>
        <button className="ghost" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p-1))} aria-label="Previous page">◀</button>
        <span className="page-indicator" aria-live="polite">{page} / {totalPages}</span>
        <button className="ghost" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} aria-label="Next page">▶</button>
        <button className="ghost" disabled={page === totalPages} onClick={() => setPage(totalPages)} aria-label="Last page">⏭</button>
      </div>

      {/* Detail modal */}
      {isDetailOpen && selectedPrompt && (
        <div className="modal-overlay" onClick={closeDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDetail} aria-label="Close">✕</button>
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
                  {selectedPrompt.tags.map(tag => (
                    <button key={tag} className="tag" onClick={() => toggleTag(tag)}>#{tag}</button>
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

              {/* Actions */}
              <div className="modal-actions">
                <button className={selectedPrompt.liked ? 'btn like active' : 'btn like'} onClick={() => onLike(selectedPrompt._id)}>
                  {selectedPrompt.liked ? '♥' : '♡'} {selectedPrompt.likes || 0}
                </button>
                <button className={selectedPrompt.bookmarked ? 'btn bookmark active' : 'btn bookmark'} onClick={() => onBookmark(selectedPrompt._id)}>
                  {selectedPrompt.bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
                </button>
              </div>

              {/* Comments */}
              <CommentsSection prompt={selectedPrompt} onAdd={(t) => addComment(selectedPrompt._id, t)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Local Comments Component (minimalist)
const CommentsSection: React.FC<{ prompt: Prompt; onAdd: (text: string) => void }> = ({ prompt, onAdd }) => {
  const [text, setText] = useState('');
  const list = prompt.comments || [];
  return (
    <div className="comments">
      <h3>Comments</h3>
      <div className="comment-input">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." aria-label="Add comment" />
        <button onClick={() => { onAdd(text); setText(''); }} disabled={!text.trim()} className="btn">Post</button>
      </div>
      <ul className="comment-list">
        {list.length === 0 && <li className="empty">No comments yet.</li>}
        {list.map(c => (
          <li key={c.id} className="comment-item">
            <div className="avatar" aria-hidden>👤</div>
            <div className="body">
              <div className="meta">
                <span className="author">{c.author}</span>
                <span className="time">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p>{c.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Marketplace;
