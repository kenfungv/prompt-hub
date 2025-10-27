# EditorPage Component Documentation

## Overview

The `EditorPage` component is a comprehensive Markdown-based prompt editor designed for creating, editing, and managing AI prompts with advanced features including variable placeholders, auto-save functionality, and version control.

## Features

### 🎯 Core Functionality

1. **Markdown Editor**
   - Full Markdown support with real-time preview
   - Rich text editing capabilities
   - Syntax highlighting for code blocks

2. **Variable Placeholders**
   - Automatic detection of `{{variableName}}` syntax
   - Dynamic variable management sidebar
   - Insert variables at cursor position
   - Set default values for variables

3. **Auto-Save**
   - Debounced auto-save every 2 seconds
   - Save status indicator ("Saving...", "Last saved: [time]")
   - Manual save option available
   - Prevents data loss

4. **Version Control**
   - Create snapshots of your prompts
   - Load previous versions
   - Version history with timestamps
   - Easy version comparison

5. **API Integration**
   - RESTful API integration for CRUD operations
   - Authentication with Bearer tokens
   - Error handling and user feedback

## Installation

### Prerequisites

Make sure the following dependencies are installed in your `package.json`:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "lodash": "^4.17.21"
  }
}
```

Install dependencies:

```bash
cd frontend
npm install
```

### Import the Component

```jsx
import EditorPage from './pages/EditorPage';
import './pages/EditorPage.css';
```

## Usage

### Basic Usage

```jsx
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import EditorPage from './pages/EditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:promptId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Variable Syntax

To create variable placeholders in your prompt content, use the double curly brace syntax:

```markdown
Hello {{userName}}, welcome to {{platformName}}!

Your task is to {{taskDescription}}.
```

These variables will automatically appear in the sidebar where you can:
- Set default values
- Insert them into your content
- Preview how they render

## API Endpoints

The EditorPage component expects the following API endpoints to be available:

### 1. Create/Update Prompt

**POST** `/api/prompts` (Create new)
```json
{
  "title": "Prompt Title",
  "content": "Prompt content with {{variables}}",
  "tags": ["ai", "chatgpt"],
  "category": "Marketing",
  "isPublic": false,
  "variables": [
    { "name": "userName", "defaultValue": "User" }
  ]
}
```

**PUT** `/api/prompts/:id` (Update existing)
```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["ai", "updated"],
  "category": "Development",
  "isPublic": true,
  "variables": [
    { "name": "projectName", "defaultValue": "MyProject" }
  ]
}
```

### 2. Get Versions

**GET** `/api/prompts/:id/versions`

Response:
```json
[
  {
    "id": "version-uuid",
    "version": 1,
    "createdAt": "2024-01-15T10:30:00Z",
    "title": "Version Title",
    "content": "Version content"
  }
]
```

### 3. Load Specific Version

**GET** `/api/prompts/:id/versions/:versionId`

Response:
```json
{
  "id": "version-uuid",
  "title": "Prompt Title",
  "content": "Prompt content",
  "tags": ["tag1", "tag2"],
  "category": "Category",
  "isPublic": false
}
```

### 4. Create New Version

**POST** `/api/prompts/:id/versions`
```json
{
  "title": "Current Title",
  "content": "Current content",
  "tags": ["current", "tags"],
  "category": "Current Category"
}
```

## Component State

The component manages the following state variables:

| State Variable | Type | Description |
|---------------|------|-------------|
| `content` | string | Main prompt content |
| `title` | string | Prompt title |
| `variables` | array | Detected variables with default values |
| `versions` | array | Version history |
| `currentPromptId` | string/null | ID of current prompt |
| `isSaving` | boolean | Save operation status |
| `lastSaved` | Date/null | Last save timestamp |
| `showPreview` | boolean | Toggle preview mode |
| `tags` | array | Prompt tags |
| `category` | string | Prompt category |
| `isPublic` | boolean | Public/private status |
| `showVersions` | boolean | Toggle version panel |

## Key Functions

### `extractVariables(text)`
Extracts variable placeholders from text using regex pattern `{{variableName}}`.

### `savePrompt(promptData)`
Saves prompt to backend (POST for new, PUT for existing).

### `debouncedSave(promptData)`
Debounced version of savePrompt (2 second delay).

### `fetchVersions(promptId)`
Retrieves version history for a prompt.

### `loadVersion(versionId)`
Loads a specific version into the editor.

### `insertVariable(varName)`
Inserts a variable placeholder at the cursor position.

### `getPreviewContent()`
Returns content with variables replaced by their default values.

### `handleVariableChange(varName, value)`
Updates the default value for a variable.

### `createVersion()`
Creates a new version snapshot of the current prompt.

## Styling

The component comes with comprehensive CSS styling in `EditorPage.css`. Key style classes:

- `.editor-page` - Main container
- `.editor-header` - Header with actions
- `.editor-container` - Main editor layout
- `.editor-main` - Content editing area
- `.editor-sidebar` - Variables and versions panel
- `.content-editor` - Textarea for content
- `.preview-pane` - Markdown preview area
- `.variables-panel` - Variable management
- `.versions-panel` - Version history

## Authentication

The component expects a JWT token to be stored in `localStorage`:

```javascript
localStorage.setItem('token', 'your-jwt-token');
```

The token is automatically included in API requests:

```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

## Error Handling

The component includes error handling for:
- Failed save operations
- Network errors
- Invalid API responses
- Version loading failures

Errors are displayed to users via `alert()` dialogs (can be customized with toast notifications).

## Customization

### Change Auto-Save Interval

Modify the debounce delay in the `debouncedSave` function:

```javascript
const debouncedSave = useCallback(
  debounce((promptData) => {
    savePrompt(promptData);
  }, 5000), // Change from 2000 to 5000 for 5 seconds
  [savePrompt]
);
```

### Custom Variable Syntax

Modify the regex pattern in `extractVariables`:

```javascript
// Change from {{variable}} to ${variable}
const regex = /\$\{(\w+)\}/g;
```

### Add Custom Toolbar Buttons

Extend the editor toolbar:

```jsx
<div className="editor-toolbar">
  <button onClick={() => setShowPreview(!showPreview)} className="btn-toolbar">
    {showPreview ? 'Edit' : 'Preview'}
  </button>
  <button onClick={() => insertVariable('newVariable')} className="btn-toolbar">
    + Insert Variable
  </button>
  {/* Add your custom buttons here */}
  <button onClick={handleBoldText} className="btn-toolbar">
    Bold
  </button>
</div>
```

## Best Practices

1. **Always provide meaningful variable names**
   - ✅ Good: `{{userName}}`, `{{emailAddress}}`
   - ❌ Bad: `{{x}}`, `{{var1}}`

2. **Set default values for all variables**
   - Helps with preview functionality
   - Makes prompts more reusable

3. **Create versions before major changes**
   - Easy rollback if needed
   - Track evolution of your prompts

4. **Use descriptive titles and categories**
   - Easier to find and organize prompts
   - Better for team collaboration

5. **Tag your prompts appropriately**
   - Improves searchability
   - Helps with filtering and organization

## Troubleshooting

### Auto-save not working
- Check browser console for errors
- Verify API endpoint is accessible
- Ensure authentication token is valid
- Check debounce timing

### Variables not detected
- Ensure you're using correct syntax: `{{variableName}}`
- Variable names must be alphanumeric (\w+ regex pattern)
- No spaces allowed in variable names

### Version loading failed
- Verify prompt ID exists
- Check API endpoint response format
- Ensure version ID is valid

### Styling issues
- Ensure `EditorPage.css` is imported
- Check for CSS conflicts with global styles
- Verify responsive breakpoints for mobile devices

## Performance Optimization

1. **Debouncing** - Auto-save uses lodash debounce to prevent excessive API calls
2. **Memoization** - Consider using `useMemo` for expensive computations
3. **Lazy Loading** - Load versions only when panel is opened
4. **Virtual Scrolling** - For large version histories (future enhancement)

## Future Enhancements

- [ ] Real-time collaboration (WebSocket integration)
- [ ] Syntax highlighting for code blocks
- [ ] Export to PDF/Markdown files
- [ ] Template library integration
- [ ] AI-powered suggestions
- [ ] Diff view for version comparison
- [ ] Comments and annotations
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop variable insertion
- [ ] Custom theme support

## Contributing

To contribute to the EditorPage component:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Submit a pull request

## License

This component is part of the Prompt Hub project. See the main project LICENSE file for details.

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Contact the development team
- Check the main project documentation

---

**Last Updated:** October 2024  
**Version:** 1.0.0  
**Author:** Prompt Hub Development Team
