# Local LLM Setup Guide

## Quick Start with Ollama

### 1. Install Ollama

**Windows:**
```bash
# Download from: https://ollama.com/download/windows
# Or use winget:
winget install Ollama.Ollama
```

**Verify installation:**
```bash
ollama --version
```

### 2. Pull Models

```bash
# Chat model (for recommendations, chat)
ollama pull llama3.3:8b

# Vision model (for image analysis)
ollama pull llava:1.6

# Alternative: Smaller/faster vision model
ollama pull moondream:latest
```

### 3. Test Models

```bash
# Test chat
ollama run llama3.3:8b "What should I wear to a wedding?"

# Test vision (with image)
ollama run llava:1.6 "Describe this clothing item in detail" --image path/to/image.jpg
```

### 4. Ollama API

Ollama runs a local API server on `http://localhost:11434`

**Test API:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.3:8b",
  "prompt": "What colors work well together?"
}'
```

---

## Integration with Backend

### Create Ollama Service

File: `src/services/ollamaService.js`

```javascript
const axios = require('axios');

const OLLAMA_BASE = process.env.OLLAMA_BASE || 'http://localhost:11434';

async function chatWithOllama(message, context = null) {
  try {
    const response = await axios.post(`${OLLAMA_BASE}/api/chat`, {
      model: 'llama3.3:8b',
      messages: [
        {
          role: 'system',
          content: 'You are a professional fashion stylist AI assistant...'
        },
        {
          role: 'user',
          content: message
        }
      ],
      stream: false
    });
    
    return {
      success: true,
      message: response.data.message.content
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function analyzeImageWithOllama(imageBase64, mimeType) {
  try {
    const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
      model: 'llava:1.6',
      prompt: 'Analyze this clothing item and extract: item type, color, pattern, style, season, occasion, size if visible, brand if visible. Return as JSON.',
      images: [imageBase64],
      stream: false
    });
    
    return {
      success: true,
      tags: JSON.parse(response.data.response)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  chatWithOllama,
  analyzeImageWithOllama
};
```

---

## Model Recommendations for RTX 4070

### Best Performance:
1. **Llama 3.3 8B** - Chat, recommendations
2. **LLaVA 1.6 7B** - Image analysis
3. **Qwen 2.5 7B** - Alternative chat model

### Storage Needed:
- ~10GB for both models
- Fits easily on 1TB SSD

### Performance:
- Chat: 2-4 seconds per response
- Image analysis: 3-6 seconds
- Much better than Gemini free tier limits!

---

## Switching from Gemini to Ollama

1. Install Ollama
2. Pull models
3. Update `src/services/geminiService.js` to use Ollama
4. Or create new `ollamaService.js` and switch gradually
5. Test both side-by-side

---

**Ready to set up?** Let me know and I'll help integrate it! 🚀
