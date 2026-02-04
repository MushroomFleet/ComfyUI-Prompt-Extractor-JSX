/**
 * ComfyPrompt Extractor Component
 * 
 * A React component that extracts the positive text prompt from ComfyUI-generated
 * PNG images by parsing the embedded JSON metadata in a non-destructive way.
 * 
 * ComfyUI stores workflow and prompt data in PNG tEXt chunks. This component
 * parses those chunks, extracts all JSON data, and finds the longest string
 * value which is typically the positive prompt.
 */

const ComfyPromptExtractor = ({ onPromptExtracted, onError }) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [extractedPrompt, setExtractedPrompt] = React.useState(null);
  const [fileName, setFileName] = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(null);
  const [metadata, setMetadata] = React.useState(null);
  const fileInputRef = React.useRef(null);

  /**
   * Parse PNG chunks from an ArrayBuffer
   * PNG structure: 8-byte signature, then chunks
   * Each chunk: 4-byte length + 4-byte type + data + 4-byte CRC
   */
  const parsePngChunks = (buffer) => {
    const view = new DataView(buffer);
    const chunks = [];
    
    // Verify PNG signature
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
      if (view.getUint8(i) !== signature[i]) {
        throw new Error('Not a valid PNG file');
      }
    }
    
    let pos = 8; // Skip signature
    
    while (pos < buffer.byteLength) {
      const length = view.getUint32(pos, false); // Big-endian
      const typeBytes = new Uint8Array(buffer, pos + 4, 4);
      const type = String.fromCharCode(...typeBytes);
      const data = new Uint8Array(buffer, pos + 8, length);
      
      chunks.push({ type, data, length });
      
      pos += 12 + length; // 4 length + 4 type + data + 4 CRC
      
      if (type === 'IEND') break;
    }
    
    return chunks;
  };

  /**
   * Extract text from tEXt and iTXt PNG chunks
   */
  const extractTextChunks = (chunks) => {
    const textData = {};
    
    for (const chunk of chunks) {
      if (chunk.type === 'tEXt') {
        // tEXt format: keyword\0text
        const nullPos = chunk.data.indexOf(0);
        if (nullPos !== -1) {
          const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullPos));
          const text = new TextDecoder('utf-8').decode(chunk.data.slice(nullPos + 1));
          textData[keyword] = text;
        }
      } else if (chunk.type === 'iTXt') {
        // iTXt format: keyword\0compression_flag\0compression_method\0language_tag\0translated_keyword\0text
        const data = chunk.data;
        let pos = 0;
        
        // Find keyword
        const nullPos = data.indexOf(0, pos);
        if (nullPos === -1) continue;
        const keyword = new TextDecoder('latin1').decode(data.slice(pos, nullPos));
        pos = nullPos + 1;
        
        // Skip compression flag, compression method
        const compressionFlag = data[pos];
        pos += 2;
        
        // Skip language tag
        const langEnd = data.indexOf(0, pos);
        if (langEnd === -1) continue;
        pos = langEnd + 1;
        
        // Skip translated keyword
        const transEnd = data.indexOf(0, pos);
        if (transEnd === -1) continue;
        pos = transEnd + 1;
        
        // Get text (may be compressed)
        let text;
        if (compressionFlag === 0) {
          text = new TextDecoder('utf-8').decode(data.slice(pos));
        } else {
          // Compressed - would need pako/zlib for decompression
          // ComfyUI typically uses uncompressed tEXt chunks
          text = new TextDecoder('utf-8').decode(data.slice(pos));
        }
        textData[keyword] = text;
      }
    }
    
    return textData;
  };

  /**
   * Recursively find all strings in a JSON object/array
   */
  const findAllStrings = (obj, strings = []) => {
    if (typeof obj === 'string') {
      strings.push(obj);
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        findAllStrings(item, strings);
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        findAllStrings(value, strings);
      }
    }
    return strings;
  };

  /**
   * Find the longest string in parsed JSON metadata
   * This is typically the positive prompt in ComfyUI exports
   */
  const findLongestString = (textChunks) => {
    let longestString = '';
    const allMetadata = {};
    
    for (const [key, value] of Object.entries(textChunks)) {
      try {
        const parsed = JSON.parse(value);
        allMetadata[key] = parsed;
        
        const strings = findAllStrings(parsed);
        for (const str of strings) {
          if (str.length > longestString.length) {
            longestString = str;
          }
        }
      } catch (e) {
        // Not JSON, check if the raw text is longer
        if (value.length > longestString.length) {
          longestString = value;
        }
        allMetadata[key] = value;
      }
    }
    
    return { longestString, allMetadata };
  };

  /**
   * Process an uploaded file
   */
  const processFile = async (file) => {
    setIsProcessing(true);
    setExtractedPrompt(null);
    setMetadata(null);
    
    try {
      // Store filename (without extension) for later use
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setFileName(nameWithoutExt);
      
      // Create image preview
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Read file as ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Check if PNG
      const view = new DataView(buffer);
      const isPng = view.getUint8(0) === 137 && 
                    view.getUint8(1) === 80 && 
                    view.getUint8(2) === 78 && 
                    view.getUint8(3) === 71;
      
      if (!isPng) {
        throw new Error('File is not a PNG. ComfyUI metadata is only embedded in PNG files. This appears to be a JPEG or other format.');
      }
      
      // Parse PNG chunks
      const chunks = parsePngChunks(buffer);
      
      // Extract text chunks
      const textChunks = extractTextChunks(chunks);
      
      if (Object.keys(textChunks).length === 0) {
        throw new Error('No metadata found in PNG. This image may not have been generated by ComfyUI or the metadata was stripped.');
      }
      
      // Find longest string (the prompt)
      const { longestString, allMetadata } = findLongestString(textChunks);
      
      if (!longestString) {
        throw new Error('No text prompts found in metadata.');
      }
      
      setExtractedPrompt(longestString);
      setMetadata(allMetadata);
      
      if (onPromptExtracted) {
        onPromptExtracted(longestString, nameWithoutExt, allMetadata);
      }
      
    } catch (error) {
      console.error('Error extracting prompt:', error);
      if (onError) {
        onError(error.message);
      }
      setExtractedPrompt(null);
      setMetadata(null);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  /**
   * Handle drag and drop
   */
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  /**
   * Save prompt as text file
   */
  const savePrompt = () => {
    if (!extractedPrompt || !fileName) return;
    
    const blob = new Blob([extractedPrompt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Trigger file input click
   */
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  /**
   * Reset state
   */
  const reset = () => {
    setExtractedPrompt(null);
    setFileName(null);
    setMetadata(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return {
    // State
    isProcessing,
    extractedPrompt,
    fileName,
    imagePreview,
    metadata,
    
    // Refs
    fileInputRef,
    
    // Methods
    processFile,
    handleFileChange,
    handleDrop,
    handleDragOver,
    savePrompt,
    triggerFileInput,
    reset,
  };
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ComfyPromptExtractor;
}
