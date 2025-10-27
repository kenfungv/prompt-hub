import React, { useEffect, useMemo, useState } from 'react';
import './marketplace.css';

const Marketplace = () => {
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [allTags, setAllTags] = useState([]);

  const [visibility, setVisibility] = useState('public'); // all | public | private
  const [sortKey, setSortKey] = useState('trending');
  const [sortOrder, setSortOrder] = useState('desc');

  const [reviewPageByPrompt, setReviewPageByPrompt] = useState({});
  const REVIEWS_PER_PAGE = 3;

  const categories = ['all','Writing','Coding','Marketing','Business','Education','Creative','Analytics','Other'];

  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const q = visibility && visibility !== 'all' ? `?visibility=${visibility}` : '';
        const res = await fetch(`/api/prompts${q}`);
        if (!res.ok) throw new Error('Failed to fetch prompts');
        const data = await res.json();
        const normalized = (data||[]).map(p=>({
          ...p,
          views: Number(p.views||0),
          rating: Number(p.rating||p.avgRating||0),
          ratingsCount: Number(p.ratingsCount||p.reviews?.length||0),
          tags: Array.isArray(p.tags)?p.tags:[],
          visibility: p.visibility||'public'
        }));
        setPrompts(normalized);
        setFilteredPrompts(normalized);
        const tags = new Set();
        normalized.forEach(pr=>pr.tags.forEach(t=>tags.add(t)));
        setAllTags(Array.from(tags));
      } catch (e) {
        setError(e.message||'Unknown error');
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, [visibility]);

  const comparator = useMemo(()=>{
    const dir = sortOrder==='asc'?1:-1;
    if (sortKey==='price') return (a,b)=>(Number(a.price||0)-Number(b.price||0))*dir;
    if (sortKey==='rating') return (a,b)=>(Number(a.rating||0)-Number(b.rating||0))*dir;
    if (sortKey==='popular') return (a,b)=>(Number(a.views||0)-Number(b.views||0))*dir;
    if (sortKey==='newest') return (a,b)=>(new Date(a.createdAt||0)-new Date(b.createdAt||0))*dir;
    const score = p => (Number(p.rating||0)*2) + Math.log10(Number(p.views||0)+1);
    return (a,b)=> score(b)-score(a);
  }, [sortKey, sortOrder]);

  useEffect(()=>{
    let list = prompts;
    if (visibility!=='all') list = list.filter(p=>(p.visibility||'public')===visibility);
    if (selectedCategory!=='all') list = list.filter(p=>p.category===selectedCategory);
    if (selectedTags.length>0) list = list.filter(p=>p.tags?.some(t=>selectedTags.includes(t)));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p=>
        p.title?.toLowerCase().includes(q)
        || p.description?.toLowerCase().includes(q)
        || p.tags?.some(t=>t.toLowerCase().includes(q))
        || p.author?.name?.toLowerCase().includes(q)
      );
    }
    setFilteredPrompts([...list].sort(comparator));
  }, [prompts, searchTerm, selectedCategory, selectedTags, comparator, visibility]);

  const handleTagToggle = tag => setSelectedTags(prev=> prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag]);
  const clearAllFilters = ()=>{ setSearchTerm(''); setSelectedCategory('all'); setSelectedTags([]); };
  const getReviewPage = id => reviewPageByPrompt[id]||1;
  const setReviewPage = (id, page)=> setReviewPageByPrompt(prev=>({ ...prev, [id]: page }));

  const Stars = ({ value=0 }) => {
    const v = Math.max(0, Math.min(5, Number(value)));
    const full = Math.floor(v);
    const half = v-full>=0.5;
    const empty = 5-full-(half?1:0);
    return <span className="stars" title={`Rating ${v}/5`}>{'★'.repeat(full)}{half?'☆':''}{'✩'.repeat(empty)}</span>;
  };

  const recommendFor = (prompt, list) => {
    const base = new Set(prompt.tags||[]);
    return list.filter(p=>p._id!==prompt._id)
      .map(p=>{
        const overlap = (p.tags||[]).reduce((a,t)=>a+(base.has(t)?1:0),0);
        const score = overlap*2 + Math.log10((p.views||0)+1) + (p.rating||0)*0.5;
        return {p, score};
      })
      .sort((a,b)=>b.score-a.score)
      .slice(0,6)
      .map(x=>x.p);
  };

  const PromptCard = ({ prompt }) => {
    const reviews = Array.isArray(prompt.reviews)?prompt.reviews:[];
    const page = getReviewPage(prompt._id);
    const pages = Math.max(1, Math.ceil(reviews.length/REVIEWS_PER_PAGE));
    const pageItems = reviews.slice((page-1)*REVIEWS_PER_PAGE, (page)*REVIEWS_PER_PAGE);
    const recs = recommendFor(prompt, filteredPrompts);
    return (
      <div className="prompt-card">
        <div className="prompt-header">
          <h3 className="prompt-title">{prompt.title}</h3>
          <span className="prompt-category-badge">{prompt.category}</span>
          <span className={`visibility-badge ${prompt.visibility}`}>{prompt.visibility==='private'?'私有':'公開'}</span>
        </div>
        <p className="prompt-description">{prompt.description}</p>
        <div className="prompt-meta">
          <div className="prompt-author">
            {prompt.author?.avatar && <img src={prompt.author.avatar} alt={prompt.author?.name} className="author-avatar" />}
            {prompt.author?.name}
          </div>
          <div className="prompt-stats">
            <span title="Views">👁 {prompt.views||0}</span>
            <span className="rating"><Stars value={prompt.rating||0} /> <span className="rating-number">{(prompt.rating||0).toFixed(1)}</span> <span className="rating-count">({prompt.ratingsCount||0})</span></span>
            <span className="price-tag" title="Price">{prompt.price?`$${prompt.price}`:'Free'}</span>
          </div>
        </div>
        {prompt.tags?.length>0 && <div className="prompt-tags">{prompt.tags.map((t,i)=>(<span className="tag" key={i}>{t}</span>))}</div>}
        <button className="view-prompt-button" onClick={()=> window.location.href=`/prompts/${prompt._id}`}>查看詳情</button>
        {reviews.length>0 && (
          <div className="reviews">
            <div className="reviews-header">用戶評論</div>
            <ul className="review-list">
              {pageItems.map((r,i)=>(
                <li key={i} className="review-item">
                  <div className="review-top">
                    <strong>{r.user?.name||'匿名'}</strong>
                    <Stars value={r.rating||0} />
                    <span className="review-date">{r.createdAt? new Date(r.createdAt).toLocaleDateString():''}</span>
                  </div>
                  <div className="review-content">{r.comment||r.text}</div>
                </li>
              ))}
            </ul>
            {pages>1 && (
              <div className="pagination">
                <button disabled={page<=1} onClick={()=>setReviewPage(prompt._id,1)}>«</button>
                <button disabled={page<=1} onClick={()=>setReviewPage(prompt._id,page-1)}>上一頁</button>
                <span className="page-indicator">{page} / {pages}</span>
                <button disabled={page>=pages} onClick={()=>setReviewPage(prompt._id,page+1)}>下一頁</button>
                <button disabled={page>=pages} onClick={()=>setReviewPage(prompt._id,pages)}>»</button>
              </div>
            )}
          </div>
        )}
        {recs.length>0 && (
          <div className="recommendations">
            <div className="section-title">猜你喜歡</div>
            <div className="recommendation-grid">
              {recs.map(rp=> (
                <div key={rp._id} className="recommendation-card" onClick={()=>window.location.href=`/prompts/${rp._id}`}>
                  <div className="rec-title">{rp.title}</div>
                  <div className="rec-meta"><Stars value={rp.rating||0} /> <span className="rec-views">👁 {rp.views||0}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="marketplace-container">
      <header className="marketplace-header">
        Prompt 市集
        <p className="subtitle">探索及購買高質量的 AI Prompt</p>
      </header>
      <div className="marketplace-controls">
        <div className="search-section">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="搜尋 Prompt（關鍵字、標題、描述、標籤）..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="search-input" />
            {searchTerm && <button className="clear-search-btn" onClick={()=>setSearchTerm('')} title="清除搜尋">✕</button>}
          </div>
        </div>
        <div className="filter-section">
          <label className="filter-label"><span className="filter-icon">🔒</span>可見性：</label>
          <select value={visibility} onChange={(e)=>setVisibility(e.target.value)} className="visibility-select" aria-label="visibility">
            <option value="all">全部</option>
            <option value="public">公開</option>
            <option value="private">私有</option>
          </select>
        </div>
        <div className="filter-section">
          <label className="filter-label"><span className="filter-icon">📂</span>分類篩選：</label>
          <div className="category-buttons">
            {categories.map(cat => (
              <button key={cat} className={`category-btn ${selectedCategory===cat?'active':''}`} onClick={()=>setSelectedCategory(cat)}>
                {cat==='all'?'全部':cat}
              </button>
            ))}
          </div>
        </div>
        {allTags.length>0 && (
          <div className="filter-section">
            <label className="filter-label"><span className="filter-icon">🏷️</span>標籤篩選：</label>
            <div className="tag-buttons">
              {allTags.slice(0,15).map(tag => (
                <button key={tag} className={`tag-btn ${selectedTags.includes(tag)?'active':''}`} onClick={()=>handleTagToggle(tag)}>{tag}</button>
              ))}
            </div>
          </div>
        )}
        <div className="sort-section">
          <label className="filter-label"><span className="filter-icon">↕️</span>排序：</label>
          <select value={sortKey} onChange={(e)=>setSortKey(e.target.value)} className="sort-select">
            <option value="trending">趨勢</option>
            <option value="newest">最新</option>
            <option value="popular">最受關注</option>
            <option value="rating">評分</option>
            <option value="price">價格</option>
          </select>
          {sortKey!=='trending' && (
            <select value={sortOrder} onChange={(e)=>setSortOrder(e.target.value)} className="sort-order-select" aria-label="sort order">
              <option value="desc">由高到低</option>
              <option value="asc">由低到高</option>
            </select>
          )}
        </div>
        {(searchTerm || selectedCategory!=='all' || selectedTags.length>0) && (
          <div className="active-filters">
            <span className="filter-label">已套用篩選：</span>
            {searchTerm && <span className="filter-chip">關鍵字: "{searchTerm}" <button onClick={()=>setSearchTerm('')}>✕</button></span>}
            {selectedCategory!=='all' && <span className="filter-chip">分類: {selectedCategory} <button onClick={()=>setSelectedCategory('all')}>✕</button></span>}
            {selectedTags.map(tag => (<span key={tag} className="filter-chip">標籤: {tag} <button onClick={()=>handleTagToggle(tag)}>✕</button></span>))}
            <button className="clear-all-btn" onClick={clearAllFilters}>清除全部篩選</button>
          </div>
        )}
      </div>
      <div className="marketplace-content">
        {isLoading && <div className="loading-state"><div className="spinner" />載入 Prompt 中...</div>}
        {error && <div className="error-state">錯誤：{error} <button onClick={()=>window.location.reload()}>重試</button></div>}
        {!isLoading && !error && filteredPrompts.length===0 && (
          <div className="empty-state"><div className="empty-icon">📭</div>未找到 Prompt<br/>請嘗試調整您的搜尋條件或篩選器<button className="clear-all-btn" onClick={clearAllFilters}>清除所有篩選</button></div>
        )}
        {!isLoading && !error && filteredPrompts.length>0 && (
          <>
            <div className="results-info"><p>顯示 {filteredPrompts.length} / {prompts.length} 個 Prompt</p></div>
            <div className="prompts-grid">
              {filteredPrompts.map(p => (<PromptCard key={p._id} prompt={p} />))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
