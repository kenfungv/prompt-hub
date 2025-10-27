import React from 'react';
import PromptBuilder from '../components/PromptBuilder';
import './PromptBuilderPage.css';

/**
 * PromptBuilderPage - 拖拉式 Prompt Builder 頁面
 * 
 * 這個頁面提供了一個完整的界面，包裝了 PromptBuilder 組件
 * 使用者可以在這裡通過拖放區塊來構建結構化的 AI prompts
 */
const PromptBuilderPage = () => {
  return (
    <div className="prompt-builder-page">
      {/* 頁面標題和導航 */}
      <header className="page-header">
        <div className="header-content">
          <div className="title-section">
            <h1 className="page-title">
              🎨 Prompt Builder
            </h1>
            <p className="page-subtitle">
              使用拖放式界面構建強大的 AI Prompts
            </p>
          </div>
          
          {/* 導航連結 */}
          <nav className="page-nav">
            <a href="/" className="nav-link">
              🏠 首頁
            </a>
            <a href="/my-prompts" className="nav-link">
              📁 我的 Prompts
            </a>
            <a href="/marketplace" className="nav-link">
              🏪 市場
            </a>
          </nav>
        </div>
      </header>

      {/* 主要內容區域 */}
      <main className="page-content">
        <PromptBuilder />
      </main>

      {/* 頁面頁腳 */}
      <footer className="page-footer">
        <div className="footer-content">
          <div className="help-section">
            <h3>💡 快速指南</h3>
            <ul>
              <li>從左側模板選擇區塊類型</li>
              <li>拖放區塊到中間畫布區域</li>
              <li>編輯區塊內容並調整順序</li>
              <li>點擊「生成 Prompt」查看結果</li>
              <li>保存或複製你的 Prompt</li>
            </ul>
          </div>
          
          <div className="features-section">
            <h3>✨ 功能特性</h3>
            <ul>
              <li>✅ 5 種區塊類型：文本、變量、指令、範例、條件</li>
              <li>✅ 拖放排序和即時預覽</li>
              <li>✅ 響應式設計，支持多種設備</li>
              <li>✅ 區塊配置保存與管理</li>
              <li>✅ 一鍵複製到剪貼簿</li>
            </ul>
          </div>
          
          <div className="docs-section">
            <h3>📚 相關資源</h3>
            <ul>
              <li>
                <a href="https://github.com/kenfungv/prompt-hub/blob/feature/prompt-builder/docs/PROMPT_BUILDER.md" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="doc-link">
                  📖 設計文檔
                </a>
              </li>
              <li>
                <a href="https://github.com/kenfungv/prompt-hub" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="doc-link">
                  💙 GitHub 倉庫
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>
            &copy; 2025 Prompt Hub | 由 <strong>Prompt Hub Team</strong> 維護
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PromptBuilderPage;
