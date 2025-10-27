import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash';
import './EditorPage.css';

const EditorPage = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [variables, setVariables] = useState([]);
  const [versions, setVersions] = useState([]);
  const [currentPromptId, setCurrentPromptId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [tags, setTags] = useState([]);
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const autoSaveTimeoutRef = useRef(null);

  // Extract variables from content (e.g., {{variableName}})
  const extractVariables = (text) => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...text.matchAll(regex)];
    const uniqueVars = [...new Set(matches.map(match => match[1]))];
    return uniqueVars.map(varName => ({
      name: varName,
      value: variables.find(v => v.name === varName)?.value || ''
    }));
  };

  // Auto-save functionality with debounce
  const savePrompt = useCallback(async (promptData) => {
    setIsSaving(true);
    try {
      const endpoint = currentPromptId 
        ? `/api/prompts/${currentPromptId}` 
        : '/api/prompts';
      const method = currentPromptId ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(promptData)
      });

      if (!response.ok) throw new Error('Failed to save prompt');
      
      const data = await response.json();
      if (!currentPromptId) setCurrentPromptId(data.id);
      setLastSaved(new Date());
      
      // Refresh versions after save
      await fetchVersions(data.id);
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [currentPromptId]);

  // Debounced auto-save
  const debouncedSave = useCallback(
    debounce((promptData) => {
      savePrompt(promptData);
    }, 2000),
    [savePrompt]
  );

  // Trigger auto-save when content changes
  useEffect(() => {
    if (title || content) {
      const promptData = {
        title,
        content,
        tags,
        category,
        isPublic,
        variables: variables.map(v => ({ name: v.name, defaultValue: v.value }))
      };
      debouncedSave(promptData);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [title, content, tags, category, isPublic, variables, debouncedSave]);

  // Update variables when content changes
  useEffect(() => {
    const newVars = extractVariables(content);
    setVariables(prevVars => {
      const mergedVars = newVars.map(newVar => {
        const existingVar = prevVars.find(v => v.name === newVar.name);
        return existingVar || newVar;
      });
      return mergedVars;
    });
  }, [content]);

  // Fetch versions for the current prompt
  const fetchVersions = async (promptId) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}/versions`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch versions');
      const data = await response.json();
      setVersions(data);
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  // Load a specific version
  const loadVersion = async (versionId) => {
    try {
      const response = await fetch(`/api/prompts/${currentPromptId}/versions/${versionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load version');
      const data = await response.json();
      setContent(data.content);
      setTitle(data.title);
      setTags(data.tags || []);
      setCategory(data.category || '');
      setIsPublic(data.isPublic || false);
    } catch (error) {
      console.error('Error loading version:', error);
      alert('Failed to load version.');
    }
  };

  // Insert variable placeholder at cursor position
  const insertVariable = (varName) => {
    const textarea = document.getElementById('content-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + `{{${varName}}}` + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + varName.length + 4, start + varName.length + 4);
    }, 0);
  };

  // Replace variables with values for preview
  const getPreviewContent = () => {
    let previewContent = content;
    variables.forEach(variable => {
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      previewContent = previewContent.replace(regex, variable.value || `{{${variable.name}}}`);
    });
    return previewContent;
  };

  // Handle variable value change
  const handleVariableChange = (varName, value) => {
    setVariables(prevVars => 
      prevVars.map(v => v.name === varName ? { ...v, value } : v)
    );
  };

  // Manual save
  const handleManualSave = () => {
    const promptData = {
      title,
      content,
      tags,
      category,
      isPublic,
      variables: variables.map(v => ({ name: v.name, defaultValue: v.value }))
    };
    savePrompt(promptData);
  };

  // Create new version
  const createVersion = async () => {
    if (!currentPromptId) {
      alert('Please save the prompt first.');
      return;
    }
    
    try {
      const response = await fetch(`/api/prompts/${currentPromptId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, content, tags, category })
      });
      
      if (!response.ok) throw new Error('Failed to create version');
      await fetchVersions(currentPromptId);
      alert('Version created successfully!');
    } catch (error) {
      console.error('Error creating version:', error);
      alert('Failed to create version.');
    }
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <h1>Prompt Editor</h1>
        <div className="editor-actions">
          <span className="save-status">
            {isSaving ? 'Saving...' : lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
          </span>
          <button onClick={handleManualSave} disabled={isSaving} className="btn-primary">
            Save Now
          </button>
          <button onClick={createVersion} disabled={!currentPromptId} className="btn-secondary">
            Create Version
          </button>
          <button onClick={() => setShowVersions(!showVersions)} className="btn-secondary">
            {showVersions ? 'Hide' : 'Show'} Versions
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-main">
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter prompt title..."
              className="input-title"
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Marketing, Development, Writing"
              className="input-category"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated):</label>
            <input
              id="tags"
              type="text"
              value={tags.join(', ')}
              onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              placeholder="e.g., ai, chatgpt, productivity"
              className="input-tags"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Make this prompt public
            </label>
          </div>

          <div className="editor-toolbar">
            <button onClick={() => setShowPreview(!showPreview)} className="btn-toolbar">
              {showPreview ? 'Edit' : 'Preview'}
            </button>
            <button onClick={() => insertVariable('newVariable')} className="btn-toolbar">
              + Insert Variable
            </button>
          </div>

          {!showPreview ? (
            <textarea
              id="content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your prompt here... Use {{variableName}} for variable placeholders."
              className="content-editor"
            />
          ) : (
            <div className="preview-pane">
              <ReactMarkdown>{getPreviewContent()}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className="editor-sidebar">
          <div className="variables-panel">
            <h3>Variables</h3>
            {variables.length === 0 ? (
              <p className="empty-state">No variables detected. Use {{variableName}} in your content.</p>
            ) : (
              <div className="variables-list">
                {variables.map((variable, index) => (
                  <div key={index} className="variable-item">
                    <label>{variable.name}:</label>
                    <input
                      type="text"
                      value={variable.value}
                      onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                      placeholder="Default value"
                      className="variable-input"
                    />
                    <button 
                      onClick={() => insertVariable(variable.name)}
                      className="btn-insert"
                      title="Insert into content"
                    >
                      Insert
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showVersions && (
            <div className="versions-panel">
              <h3>Version History</h3>
              {versions.length === 0 ? (
                <p className="empty-state">No versions yet. Create your first version.</p>
              ) : (
                <div className="versions-list">
                  {versions.map((version) => (
                    <div key={version.id} className="version-item">
                      <div className="version-info">
                        <span className="version-number">v{version.version}</span>
                        <span className="version-date">{new Date(version.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button 
                        onClick={() => loadVersion(version.id)}
                        className="btn-load-version"
                      >
                        Load
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="editor-help">
        <h4>Quick Tips:</h4>
        <ul>
          <li>Use <code>{{variableName}}</code> to create variable placeholders</li>
          <li>Content auto-saves every 2 seconds</li>
          <li>Supports Markdown formatting in preview mode</li>
          <li>Create versions to track major changes</li>
          <li>Set default values for variables in the sidebar</li>
        </ul>
      </div>
    </div>
  );
};

export default EditorPage;
