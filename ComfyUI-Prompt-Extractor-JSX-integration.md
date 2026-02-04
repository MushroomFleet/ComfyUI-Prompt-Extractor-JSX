# ComfyUI Prompt Extractor JSX Integration Guide

This guide covers how to integrate the ComfyUI Prompt Extractor component into your React projects.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Basic Integration](#basic-integration)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Customization](#customization)
7. [Error Handling](#error-handling)
8. [TypeScript Support](#typescript-support)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

The component requires React 16.8+ (for hooks support). No additional dependencies are needed as it uses native browser APIs for PNG parsing.

```json
{
  "peerDependencies": {
    "react": ">=16.8.0"
  }
}
```

---

## Installation Methods

### Method 1: Direct File Copy

Copy `comfyprompt-extractor.jsx` into your project's components directory:

```
src/
  components/
    comfyprompt-extractor.jsx
```

Import in your component:

```jsx
import { useComfyPromptExtractor } from './components/comfyprompt-extractor';
```

### Method 2: Inline Integration

For simple projects or CDN-based setups, copy the hook directly into your code. See `demo.html` for a complete inline example using Babel standalone.

### Method 3: As a Custom Hook Module

Create a dedicated hooks directory:

```
src/
  hooks/
    useComfyPromptExtractor.js
```

---

## Basic Integration

### Step 1: Import the Hook

```jsx
import React from 'react';
import { useComfyPromptExtractor } from './comfyprompt-extractor';
```

### Step 2: Initialize in Your Component

```jsx
function PromptExtractor() {
  const extractor = useComfyPromptExtractor({
    onPromptExtracted: (prompt, filename, metadata) => {
      console.log('Extracted prompt:', prompt);
      console.log('Source file:', filename);
    },
    onError: (errorMessage) => {
      console.error('Extraction failed:', errorMessage);
    }
  });

  return (
    <div>
      <input
        ref={extractor.fileInputRef}
        type="file"
        accept="image/png"
        onChange={extractor.handleFileChange}
        style={{ display: 'none' }}
      />
      <button onClick={extractor.triggerFileInput}>
        Upload PNG
      </button>
      
      {extractor.extractedPrompt && (
        <div>
          <p>{extractor.extractedPrompt}</p>
          <button onClick={extractor.savePrompt}>
            Download as .txt
          </button>
        </div>
      )}
    </div>
  );
}
```

### Step 3: Add Drag-and-Drop Support (Optional)

```jsx
function DropZone() {
  const extractor = useComfyPromptExtractor({ /* callbacks */ });

  return (
    <div
      onDrop={extractor.handleDrop}
      onDragOver={extractor.handleDragOver}
      style={{
        border: '2px dashed #ccc',
        padding: '40px',
        textAlign: 'center'
      }}
    >
      Drop ComfyUI PNG here
    </div>
  );
}
```

---

## API Reference

### Hook Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `onPromptExtracted` | `function` | Callback fired when extraction succeeds. Receives `(prompt, filename, metadata)` |
| `onError` | `function` | Callback fired on extraction failure. Receives `(errorMessage)` |

### Returned State

| Property | Type | Description |
|----------|------|-------------|
| `isProcessing` | `boolean` | True while file is being parsed |
| `extractedPrompt` | `string \| null` | The extracted prompt text |
| `fileName` | `string \| null` | Source filename without extension |
| `imagePreview` | `string \| null` | Object URL for image preview |
| `metadata` | `object \| null` | Full parsed metadata object |

### Returned Refs

| Ref | Type | Description |
|-----|------|-------------|
| `fileInputRef` | `React.RefObject` | Ref to attach to hidden file input |

### Returned Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `processFile` | `(file: File)` | Manually process a File object |
| `handleFileChange` | `(event)` | Handler for input onChange |
| `handleDrop` | `(event)` | Handler for drop events |
| `handleDragOver` | `(event)` | Handler for dragover events |
| `savePrompt` | `()` | Downloads prompt as .txt file |
| `triggerFileInput` | `()` | Programmatically opens file picker |
| `reset` | `()` | Clears all state |

---

## Usage Examples

### Example 1: Minimal Upload Button

```jsx
function MinimalExtractor() {
  const { fileInputRef, handleFileChange, extractedPrompt, triggerFileInput } = 
    useComfyPromptExtractor({});

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
        hidden
      />
      <button onClick={triggerFileInput}>Upload</button>
      {extractedPrompt && <pre>{extractedPrompt}</pre>}
    </>
  );
}
```

### Example 2: With Loading State

```jsx
function ExtractorWithLoading() {
  const { isProcessing, extractedPrompt, handleFileChange, fileInputRef } = 
    useComfyPromptExtractor({});

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
      />
      {isProcessing && <div className="spinner">Processing...</div>}
      {extractedPrompt && <textarea value={extractedPrompt} readOnly />}
    </div>
  );
}
```

### Example 3: Gallery with Multiple Extractions

```jsx
function GalleryExtractor() {
  const [prompts, setPrompts] = React.useState([]);
  
  const extractor = useComfyPromptExtractor({
    onPromptExtracted: (prompt, filename, metadata) => {
      setPrompts(prev => [...prev, { prompt, filename, timestamp: Date.now() }]);
      extractor.reset(); // Ready for next upload
    }
  });

  return (
    <div>
      <input
        ref={extractor.fileInputRef}
        type="file"
        accept="image/png"
        onChange={extractor.handleFileChange}
        multiple
      />
      <ul>
        {prompts.map(item => (
          <li key={item.timestamp}>
            <strong>{item.filename}:</strong> {item.prompt.slice(0, 100)}...
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Example 4: Integration with Form Submission

```jsx
function FormWithPrompt() {
  const [formData, setFormData] = React.useState({ title: '', prompt: '' });
  
  const extractor = useComfyPromptExtractor({
    onPromptExtracted: (prompt) => {
      setFormData(prev => ({ ...prev, prompt }));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit formData to your API
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.title}
        onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
        placeholder="Title"
      />
      
      <div
        onDrop={extractor.handleDrop}
        onDragOver={extractor.handleDragOver}
        onClick={extractor.triggerFileInput}
      >
        Drop image or click to extract prompt
      </div>
      
      <input
        ref={extractor.fileInputRef}
        type="file"
        accept="image/png"
        onChange={extractor.handleFileChange}
        hidden
      />
      
      <textarea
        value={formData.prompt}
        onChange={e => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
        placeholder="Prompt will appear here..."
      />
      
      <button type="submit">Save</button>
    </form>
  );
}
```

---

## Customization

### Custom String Finding Logic

If you need different extraction logic (e.g., find specific keywords instead of longest string), modify the `findLongestString` function:

```jsx
// Find strings containing "positive" in their key path
const findPositivePrompt = (textChunks) => {
  let result = '';
  
  const search = (obj, path = '') => {
    if (typeof obj === 'string' && path.toLowerCase().includes('positive')) {
      if (obj.length > result.length) result = obj;
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        search(value, `${path}.${key}`);
      }
    }
  };
  
  for (const [key, value] of Object.entries(textChunks)) {
    try {
      search(JSON.parse(value), key);
    } catch {}
  }
  
  return result;
};
```

### Styling the Preview

The `imagePreview` state contains an object URL that can be used directly in `<img>` tags:

```jsx
{extractor.imagePreview && (
  <img 
    src={extractor.imagePreview} 
    alt="Preview"
    style={{ maxWidth: 200, borderRadius: 8 }}
  />
)}
```

---

## Error Handling

The component provides descriptive error messages for common issues:

| Error | Cause | Solution |
|-------|-------|----------|
| "Not a valid PNG file" | File doesn't have PNG signature | Ensure file is actual PNG, not renamed JPEG |
| "File is not a PNG" | JPEG or other format detected | Convert to PNG with metadata preservation |
| "No metadata found in PNG" | PNG lacks tEXt/iTXt chunks | Image may have been re-saved or converted |
| "No text prompts found" | Metadata exists but contains no strings | Unusual workflow structure |

### Implementing Error Display

```jsx
function ExtractorWithErrors() {
  const [error, setError] = React.useState(null);
  
  const extractor = useComfyPromptExtractor({
    onError: setError,
    onPromptExtracted: () => setError(null)
  });

  return (
    <div>
      {/* ... upload UI ... */}
      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
```

---

## TypeScript Support

Add these type definitions for TypeScript projects:

```typescript
interface ComfyMetadata {
  workflow?: Record<string, any>;
  prompt?: Record<string, any>;
  [key: string]: any;
}

interface UseComfyPromptExtractorParams {
  onPromptExtracted?: (
    prompt: string,
    filename: string,
    metadata: ComfyMetadata
  ) => void;
  onError?: (message: string) => void;
}

interface UseComfyPromptExtractorReturn {
  isProcessing: boolean;
  extractedPrompt: string | null;
  fileName: string | null;
  imagePreview: string | null;
  metadata: ComfyMetadata | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  processFile: (file: File) => Promise<void>;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  savePrompt: () => void;
  triggerFileInput: () => void;
  reset: () => void;
}

declare function useComfyPromptExtractor(
  params: UseComfyPromptExtractorParams
): UseComfyPromptExtractorReturn;
```

---

## Troubleshooting

### Image Shows but No Prompt Extracted

The PNG file may have been processed by another application that stripped metadata. Common causes:
- Uploading to social media (Twitter, Discord, etc.)
- Opening and re-saving in image editors
- Converting from other formats
- Screenshot tools

**Solution:** Use the original PNG directly from ComfyUI's output folder.

### CORS Errors When Loading Remote Images

The component is designed for local file uploads. For remote URLs, you'll need server-side extraction or a CORS proxy.

### Memory Usage with Large Files

The component loads the entire file into memory. For very large PNGs (100MB+), consider:
- Streaming the header only (first ~100KB typically contains metadata)
- Server-side extraction
- Web Worker processing

### Browser Compatibility

Tested and working in:
- Chrome 80+
- Firefox 75+
- Safari 13.1+
- Edge 80+

Requires support for:
- `File.arrayBuffer()`
- `DataView`
- `TextDecoder`

---

## Next Steps

- Review `demo.html` for a complete working example
- Check the main README for project overview
- Open issues on GitHub for bugs or feature requests
