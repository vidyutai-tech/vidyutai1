# 429 (Too Many Requests) Error Fix

## Why You're Getting 429 After Upgrading to Render Pro

### The Problem

**Before (502 Bad Gateway):**
- AI service was down or not responding
- Service couldn't handle requests at all

**After (429 Too Many Requests):**
- ✅ AI service is now working
- ❌ But Render is rate limiting your requests
- This happens because:
  1. **Frontend makes multiple rapid requests** (page load, retries, etc.)
  2. **Backend forwards all requests** to AI service
  3. **Render rate limits** requests between services or from external sources
  4. **No request throttling** in the code

## Root Causes

### 1. Multiple Concurrent Requests
The frontend might be making multiple requests when:
- Page loads
- User navigates between pages
- Components re-render
- Auto-refresh triggers

### 2. No Request Debouncing/Throttling
- Every click = new request
- No caching of responses
- No request queuing

### 3. Render Rate Limits
Even on Pro plan, Render may have:
- Rate limits between services (backend → AI service)
- Rate limits from external sources (Netlify → Render)
- Resource limits (CPU/memory) causing throttling

## Solutions

### Solution 1: Add Request Caching (Quick Fix)

Add caching to the backend to avoid duplicate requests:

**File: `backend/routes/predictions.js`**

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

// GET solar degradation dashboard
router.get('/solar-degradation/dashboard', async (req, res) => {
  // Check cache first
  const cacheKey = 'solar-degradation-dashboard';
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/v1/predictions/solar-degradation/dashboard`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Cache the response
    cache.set(cacheKey, response.data);
    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching solar degradation dashboard:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to fetch Solar Degradation dashboard',
      message: error.message
    });
  }
});
```

**Install cache package:**
```bash
cd backend
npm install node-cache
```

### Solution 2: Add Request Throttling (Better Fix)

Limit how many requests can be made per minute:

**File: `backend/server.js`**

```javascript
const rateLimit = require('express-rate-limit');

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to prediction routes
app.use('/api/v1/predictions', limiter);
```

**Install rate limit package:**
```bash
cd backend
npm install express-rate-limit
```

### Solution 3: Add Request Queuing (Best Fix)

Queue requests to avoid overwhelming the AI service:

**File: `backend/utils/requestQueue.js`** (new file)

```javascript
class RequestQueue {
  constructor(maxConcurrent = 2) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { requestFn, resolve, reject } = this.queue.shift();

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

module.exports = new RequestQueue(2); // Max 2 concurrent requests
```

**Use in routes:**
```javascript
const requestQueue = require('../utils/requestQueue');

router.get('/solar-degradation/dashboard', async (req, res) => {
  try {
    const data = await requestQueue.add(async () => {
      const response = await axios.get(`${AI_SERVICE_URL}/api/v1/predictions/solar-degradation/dashboard`, {
        timeout: 10000
      });
      return response.data;
    });
    return res.json(data);
  } catch (error) {
    // Handle error
  }
});
```

### Solution 4: Frontend Request Debouncing

Prevent multiple rapid requests from frontend:

**File: `frontend/utils/api.ts`** (or similar)

```typescript
import { debounce } from 'lodash';

// Debounce prediction requests
const debouncedFetch = debounce(async (url: string, options?: RequestInit) => {
  return fetch(url, options);
}, 500); // Wait 500ms before making request

export const fetchPrediction = async (endpoint: string) => {
  return debouncedFetch(`${API_BASE_URL}${endpoint}`);
};
```

## Immediate Fix (Do This First)

### Step 1: Check Render Logs

1. Go to Render dashboard → `vidyutai-ai-service` → **Logs**
2. Look for:
   - Rate limit errors
   - Memory/CPU warnings
   - Request count spikes

### Step 2: Add Simple Caching

1. Install cache package:
   ```bash
   cd backend
   npm install node-cache
   ```

2. Add caching to prediction routes (see Solution 1 above)

3. Redeploy backend

### Step 3: Reduce Frontend Requests

Check if frontend is making duplicate requests:
- Open browser DevTools → Network tab
- Filter by "solar-degradation" or "forecast"
- See if multiple requests are fired on page load

If yes, add request deduplication in frontend.

## Render-Specific Solutions

### Option 1: Increase Service Resources

If on Render Pro:
1. Go to service settings
2. Increase memory/CPU allocation
3. This may reduce rate limiting

### Option 2: Use Render Internal URLs

If both services are on Render, use internal URLs:
- Instead of: `https://vidyutai-ai-service.onrender.com`
- Use: Internal service discovery (if available)

### Option 3: Add Retry Logic with Backoff

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, options);
      return response.data;
    } catch (error) {
      if (error.response?.status === 429) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing

After implementing fixes:

1. **Test with single request:**
   ```bash
   curl https://vidyutai-backend.onrender.com/api/v1/predictions/solar-degradation/dashboard
   ```

2. **Test with multiple rapid requests:**
   ```bash
   for i in {1..10}; do
     curl https://vidyutai-backend.onrender.com/api/v1/predictions/solar-degradation/dashboard &
   done
   ```

3. **Check if 429 errors are reduced**

## Recommended Implementation Order

1. ✅ **Add caching** (Solution 1) - Quick win, reduces requests by 80%
2. ✅ **Add rate limiting** (Solution 2) - Prevents abuse
3. ✅ **Add request queuing** (Solution 3) - Best for production
4. ✅ **Frontend debouncing** (Solution 4) - Prevents duplicate requests

## Why This Happens on Render Pro

Render Pro doesn't remove rate limits - it just gives you:
- More resources (CPU/memory)
- Better performance
- But still has rate limits for:
  - Service-to-service communication
  - External requests
  - Resource protection

The 429 error means your service is **working**, but you're hitting limits. The solutions above will help you stay within limits while maintaining good performance.

