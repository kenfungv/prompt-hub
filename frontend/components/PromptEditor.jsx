import React, { useState, useEffect } from 'react';

/**
 * PromptEditor Component
 * A Markdown editor with support for variable placeholders and dynamic parameters
 */
const PromptEditor = ({ initialContent = '', onChange, onParametersChange }) => {
  const [content, setContent] = useState(initialContent);
  const [parameters, setParameters] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [parameterValues, setParameterValues] = useState({});

  // Extract parameters from content (format: {{variable_name}})
  useEffect(() => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    const uniqueParams = [...new Set(matches.map(m => m[1]))];
    
    setParameters(uniqueParams);
    
    // Initialize parameter values for new parameters
    const newParamValues = { ...parameterValues };
    uniqueParams.forEach(param => {
      if (!(param in newParamValues)) {
        newParamValues[param] = '';
      }
    });
    setParameterValues(newParamValues);
    
    if (onParametersChange) {
      onParametersChange(uniqueParams);
    }
  }, [content]);

  // Handle content change
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  // Handle parameter value change
  const handleParameterChange = (param, value) => {
    setParameterValues(prev => ({
      ...prev,
      [param]: value
    }));
  };

  // Insert parameter placeholder at cursor
  const insertPlaceholder = (paramName) => {
    const textarea = document.getElementById('prompt-editor-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholder = `{{${paramName}}}`;
    
    const newContent = content.substring(0, start) + placeholder + content.substring(end);
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  // Render preview with parameters replaced
  const renderPreview = () => {
    let preview = content;
    parameters.forEach(param => {
      const value = parameterValues[param] || `{{${param}}}`;
      preview = preview.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), value);
    });
    return preview;
  };

  // Convert markdown to HTML (basic implementation)
  const markdownToHtml = (text) => {
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="prompt-editor">
      <style>{`
        .prompt-editor {
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          background: #fff;
          padding: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
        }
        .editor-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e1e4e8;
        }
        .editor-toolbar h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        .mode-toggle {
          display: flex;
          gap: 8px;
        }
        .mode-button {
          padding: 6px 12px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }
        .mode-button.active {
          background: #0969da;
          color: #fff;
          border-color: #0969da;
        }
        .mode-button:hover {
          background: #f6f8fa;
        }
        .mode-button.active:hover {
          background: #0860ca;
        }
        .editor-content {
          margin-bottom: 16px;
        }
        .editor-textarea {
          width: 100%;
          min-height: 200px;
          padding: 12px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
        }
        .editor-textarea:focus {
          outline: none;
          border-color: #0969da;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
        }
        .preview-content {
          min-height: 200px;
          padding: 12px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          background: #f6f8fa;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .parameters-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e1e4e8;
        }
        .parameters-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #24292f;
        }
        .parameter-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }
        .parameter-label {
          min-width: 120px;
          font-size: 14px;
          font-weight: 500;
          color: #57606a;
        }
        .parameter-input {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          font-size: 14px;
        }
        .parameter-input:focus {
          outline: none;
          border-color: #0969da;
          box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.1);
        }
        .insert-button {
          padding: 4px 8px;
          border: 1px solid #e1e4e8;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 12px;
          color: #0969da;
        }
        .insert-button:hover {
          background: #f6f8fa;
        }
        .no-parameters {
          font-size: 14px;
          color: #57606a;
          font-style: italic;
        }
        .helper-text {
          margin-top: 8px;
          font-size: 12px;
          color: #57606a;
        }
      `}</style>

      <div className="editor-toolbar">
        <h3>Prompt Editor</h3>
        <div className="mode-toggle">
          <button
            className={`mode-button ${!previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(false)}
          >
            Edit
          </button>
          <button
            className={`mode-button ${previewMode ? 'active' : ''}`}
            onClick={() => setPreviewMode(true)}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="editor-content">
        {!previewMode ? (
          <>
            <textarea
              id="prompt-editor-textarea"
              className="editor-textarea"
              value={content}
              onChange={handleContentChange}
              placeholder="Enter your prompt template here...\n\nUse {{variable_name}} for dynamic parameters.\nExample: Hello {{name}}, welcome to {{location}}!"
            />
            <div className="helper-text">
              💡 Use double curly braces to create variables: {{`{{variable_name}}`}}
            </div>
          </>
        ) : (
          <div className="preview-content">
            {renderPreview() || 'Nothing to preview...'}
          </div>
        )}
      </div>

      {parameters.length > 0 && (
        <div className="parameters-section">
          <h4>📝 Dynamic Parameters ({parameters.length})</h4>
          {parameters.map(param => (
            <div key={param} className="parameter-item">
              <span className="parameter-label">{{`{{${param}}}`}}</span>
              <input
                type="text"
                className="parameter-input"
                value={parameterValues[param] || ''}
                onChange={(e) => handleParameterChange(param, e.target.value)}
                placeholder={`Enter value for ${param}`}
              />
              <button
                className="insert-button"
                onClick={() => insertPlaceholder(param)}
              >
                Insert
              </button>
            </div>
          ))}
        </div>
      )}
      
      {parameters.length === 0 && (
        <div className="parameters-section">
          <div className="no-parameters">
            No parameters detected. Add variables using {{`{{variable_name}}`}} syntax.
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;
