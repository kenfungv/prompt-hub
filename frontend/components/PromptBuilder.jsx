import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './PromptBuilder.css';

// 區塊類型定義
const BLOCK_TYPES = {
  TEXT: 'text',
  VARIABLE: 'variable',
  INSTRUCTION: 'instruction',
  EXAMPLE: 'example',
  CONDITION: 'condition'
};

// 拖拉式區塊組件
const DraggableBlock = ({ block, index, moveBlock, removeBlock, updateBlock }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'block',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [, drop] = useDrop({
    accept: 'block',
    hover: (draggedItem) => {
      if (draggedItem.index !== index) {
        moveBlock(draggedItem.index, index);
        draggedItem.index = index;
      }
    }
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`prompt-block ${block.type} ${isDragging ? 'dragging' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="block-header">
        <span className="block-type-label">{block.type.toUpperCase()}</span>
        <button 
          className="remove-btn"
          onClick={() => removeBlock(index)}
          aria-label="Remove block"
        >
          ✕
        </button>
      </div>
      <textarea
        className="block-content"
        value={block.content}
        onChange={(e) => updateBlock(index, e.target.value)}
        placeholder={`Enter ${block.type} content...`}
        rows={3}
      />
    </div>
  );
};

// 區塊模板選擇器
const BlockPalette = ({ addBlock }) => {
  const blockTemplates = [
    { type: BLOCK_TYPES.TEXT, label: '文本', icon: '📝' },
    { type: BLOCK_TYPES.VARIABLE, label: '變量', icon: '🔤' },
    { type: BLOCK_TYPES.INSTRUCTION, label: '指令', icon: '⚡' },
    { type: BLOCK_TYPES.EXAMPLE, label: '範例', icon: '💡' },
    { type: BLOCK_TYPES.CONDITION, label: '條件', icon: '🔀' }
  ];

  return (
    <div className="block-palette">
      <h3>區塊模板</h3>
      <div className="template-grid">
        {blockTemplates.map((template) => (
          <button
            key={template.type}
            className="template-btn"
            onClick={() => addBlock(template.type)}
          >
            <span className="template-icon">{template.icon}</span>
            <span className="template-label">{template.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// 主要 Prompt Builder 組件
const PromptBuilder = () => {
  const [blocks, setBlocks] = useState([]);
  const [promptName, setPromptName] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  // 新增區塊
  const addBlock = useCallback((type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: ''
    };
    setBlocks((prev) => [...prev, newBlock]);
  }, []);

  // 移動區塊
  const moveBlock = useCallback((fromIndex, toIndex) => {
    setBlocks((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  // 移除區塊
  const removeBlock = useCallback((index) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 更新區塊內容
  const updateBlock = useCallback((index, content) => {
    setBlocks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], content };
      return updated;
    });
  }, []);

  // 生成最終 Prompt
  const generatePrompt = useCallback(() => {
    const prompt = blocks
      .filter((block) => block.content.trim())
      .map((block) => {
        switch (block.type) {
          case BLOCK_TYPES.VARIABLE:
            return `[${block.content}]`;
          case BLOCK_TYPES.INSTRUCTION:
            return `## ${block.content}`;
          case BLOCK_TYPES.EXAMPLE:
            return `Example: ${block.content}`;
          case BLOCK_TYPES.CONDITION:
            return `IF ${block.content}`;
          default:
            return block.content;
        }
      })
      .join('\n\n');
    setGeneratedPrompt(prompt);
  }, [blocks]);

  // 儲存 Prompt
  const savePrompt = async () => {
    if (!promptName.trim()) {
      alert('請輸入 Prompt 名稱');
      return;
    }

    const promptData = {
      name: promptName,
      blocks: blocks,
      generatedPrompt: generatedPrompt,
      createdAt: new Date().toISOString()
    };

    try {
      // TODO: 整合後端 API
      console.log('Saving prompt:', promptData);
      alert('Prompt 已儲存！');
    } catch (error) {
      console.error('Save error:', error);
      alert('儲存失敗，請稍後再試');
    }
  };

  // 清空畫布
  const clearCanvas = () => {
    if (blocks.length > 0 && confirm('確定要清空所有區塊嗎？')) {
      setBlocks([]);
      setGeneratedPrompt('');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="prompt-builder-container">
        <header className="builder-header">
          <h1>🎨 Drag & Drop Prompt Builder</h1>
          <input
            type="text"
            className="prompt-name-input"
            placeholder="輸入 Prompt 名稱..."
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
          />
        </header>

        <div className="builder-layout">
          {/* 左側：區塊模板選擇器 */}
          <aside className="sidebar">
            <BlockPalette addBlock={addBlock} />
            <div className="actions">
              <button className="btn btn-primary" onClick={generatePrompt}>
                🔄 生成 Prompt
              </button>
              <button className="btn btn-secondary" onClick={clearCanvas}>
                🗑️ 清空畫布
              </button>
            </div>
          </aside>

          {/* 中間：拖拉區域 */}
          <main className="canvas-area">
            <div className="canvas-header">
              <h2>組合區域</h2>
              <span className="block-count">{blocks.length} 個區塊</span>
            </div>
            <div className="drop-zone">
              {blocks.length === 0 ? (
                <div className="empty-state">
                  <p>👈 從左側選擇區塊開始建立你的 Prompt</p>
                </div>
              ) : (
                blocks.map((block, index) => (
                  <DraggableBlock
                    key={block.id}
                    block={block}
                    index={index}
                    moveBlock={moveBlock}
                    removeBlock={removeBlock}
                    updateBlock={updateBlock}
                  />
                ))
              )}
            </div>
          </main>

          {/* 右側：預覽與輸出 */}
          <aside className="preview-panel">
            <h3>預覽輸出</h3>
            <div className="preview-content">
              {generatedPrompt ? (
                <pre>{generatedPrompt}</pre>
              ) : (
                <p className="preview-placeholder">
                  點擊「生成 Prompt」查看輸出
                </p>
              )}
            </div>
            <div className="preview-actions">
              <button 
                className="btn btn-success"
                onClick={savePrompt}
                disabled={!generatedPrompt}
              >
                💾 儲存 Prompt
              </button>
              <button 
                className="btn btn-outline"
                onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                disabled={!generatedPrompt}
              >
                📋 複製到剪貼簿
              </button>
            </div>
          </aside>
        </div>
      </div>
    </DndProvider>
  );
};

export default PromptBuilder;
