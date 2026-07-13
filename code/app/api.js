const CONFIGURED_BASE_URL = typeof window !== 'undefined' && window.__FASHION_CONFIG__?.apiBaseUrl
  ? String(window.__FASHION_CONFIG__.apiBaseUrl)
  : '';

const DEFAULT_BASE_URL = CONFIGURED_BASE_URL ||
  (typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'http://localhost:3000');

function normalizeBaseUrl(value) {
  if (!value) return DEFAULT_BASE_URL;
  return value.replace(/\/$/, '');
}

function unwrap(payload, preferredKey) {
  if (!payload || typeof payload !== 'object') return payload;
  if (preferredKey && payload[preferredKey] !== undefined) return payload[preferredKey];
  return payload;
}

function readChatPayload(input) {
  if (Array.isArray(input)) {
    const normalized = input.map((message) => ({
      role: message.role,
      content: message.content ?? message.text ?? ''
    }));
    const lastUserMessage = [...normalized].reverse().find((message) => message.role === 'user');
    return {
      message: lastUserMessage?.content || '',
      conversationHistory: lastUserMessage
        ? normalized.slice(0, normalized.lastIndexOf(lastUserMessage))
        : normalized
    };
  }

  if (typeof input === 'string') {
    return { message: input };
  }

  return input;
}

export class FashionApi {
  constructor(baseUrl = null) {
    this.baseUrl = normalizeBaseUrl(baseUrl || localStorage.getItem('fashion-api-base') || DEFAULT_BASE_URL);
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    localStorage.setItem('fashion-api-base', this.baseUrl);
  }

  getSession() {
    try {
      const raw = localStorage.getItem('fashion-session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch {}

    const token = localStorage.getItem('fashion-token');
    return token ? { token } : null;
  }

  getToken() {
    return this.getSession()?.token || null;
  }

  setSession(session) {
    if (!session?.token) {
      localStorage.removeItem('fashion-session');
      localStorage.removeItem('fashion-token');
      return;
    }

    localStorage.setItem('fashion-session', JSON.stringify(session));
    localStorage.setItem('fashion-token', session.token);
  }

  async refreshSession() {
    const refreshToken = this.getSession()?.refreshToken;
    const email = this.getSession()?.user?.email || null;
    if (!refreshToken) {
      throw new Error('Session expired. Sign in again.');
    }

    const payload = await this.request('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken, email },
      skipAuthRefresh: true
    });
    const session = {
      token: payload.token || null,
      idToken: payload.idToken || null,
      refreshToken: payload.refreshToken || refreshToken,
      user: payload.user || null
    };
    this.setSession(session);
    return session;
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(path, { method = 'GET', body, headers = {}, multipart = false, skipAuthRefresh = false } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...this.getAuthHeaders(),
        ...(!multipart ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: body == null ? undefined : multipart ? body : JSON.stringify(body)
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = payload?.error || payload?.message || payload?.errors?.[0]?.msg || `Request failed with status ${response.status}`;
      if (response.status === 401 && !skipAuthRefresh && this.getSession()?.refreshToken) {
        try {
          await this.refreshSession();
          return this.request(path, { method, body, headers, multipart, skipAuthRefresh: true });
        } catch {}
      }
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  health() {
    return this.request('/health');
  }

  async register(data) {
    const payload = await this.request('/api/auth/register', { method: 'POST', body: data });
    return {
      token: payload.token || null,
      idToken: payload.idToken || null,
      refreshToken: payload.refreshToken || null,
      user: payload.user || null,
      message: payload.message || '',
      requiresEmailConfirmation: Boolean(payload.requiresEmailConfirmation)
    };
  }

  async login(data) {
    const payload = await this.request('/api/auth/login', { method: 'POST', body: data });
    return {
      token: payload.token || null,
      idToken: payload.idToken || null,
      refreshToken: payload.refreshToken || null,
      user: payload.user || null
    };
  }

  confirmRegistration(data) {
    return this.request('/api/auth/confirm', { method: 'POST', body: data });
  }

  async me() {
    const payload = await this.request('/api/auth/me');
    return unwrap(payload, 'user');
  }

  async profile() {
    const payload = await this.request('/api/profile');
    return unwrap(payload, 'profile');
  }

  updateProfilePhoto(file) {
    const form = new FormData();
    form.append('photo', file);
    return this.request('/api/profile/photo', { method: 'POST', body: form, multipart: true });
  }

  removeProfilePhoto() {
    return this.request('/api/profile/photo', { method: 'DELETE' });
  }

  async wardrobe(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.search) query.set('search', params.search);
    if (params.filter) query.set('filter', JSON.stringify(params.filter));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const payload = await this.request(`/api/wardrobe${suffix}`);
    return {
      items: payload.items || [],
      pagination: payload.pagination || null,
      note: payload.note || ''
    };
  }

  async wardrobeStats() {
    const payload = await this.request('/api/wardrobe/stats');
    return payload.stats || {};
  }

  async addWardrobeItems(files) {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));
    return this.request('/api/wardrobe', { method: 'POST', body: form, multipart: true });
  }

  async saveAnalyzedItem(data) {
    const payload = await this.request('/api/wardrobe/save-analyzed', { method: 'POST', body: data });
    return unwrap(payload, 'item');
  }

  deleteWardrobeItem(id) {
    return this.request(`/api/wardrobe/${id}`, { method: 'DELETE' });
  }

  async chat(payload) {
    const response = await this.request('/api/ai/chat', { method: 'POST', body: readChatPayload(payload) });
    return response.message || '';
  }

  async analyzeImage(file) {
    const form = new FormData();
    form.append('image', file);
    const payload = await this.request('/api/ai/analyze-image', { method: 'POST', body: form, multipart: true });
    const item = payload.item || payload.tags;
    if (!item || Array.isArray(item) || typeof item !== 'object') {
      throw new Error('The AI did not return a usable clothing analysis. Please try again.');
    }
    return item;
  }

  async recommendations(payload) {
    const response = await this.request('/api/ai/recommendations', { method: 'POST', body: payload });
    if (!Array.isArray(response.outfits) || response.outfits.length === 0) {
      throw new Error('The AI did not return usable outfit recommendations. Please try again.');
    }
    return response.outfits;
  }

  async tryOn(garmentFile, userPhotoFileOrBase64) {
    const form = new FormData();
    form.append('image', garmentFile);
    if (userPhotoFileOrBase64 instanceof File) {
      form.append('userPhoto', userPhotoFileOrBase64);
    } else if (typeof userPhotoFileOrBase64 === 'string' && userPhotoFileOrBase64) {
      form.append('userPhotoBase64', userPhotoFileOrBase64);
    }
    const payload = await this.request('/api/ai/try-on', { method: 'POST', body: form, multipart: true });
    return {
      image: payload.image || payload.previewUrl || '',
      message: payload.message || ''
    };
  }

  async generateImage(prompt) {
    const payload = await this.request('/api/ai/generate-image', {
      method: 'POST',
      body: { prompt }
    });
    return {
      image: payload.image || '',
      model: payload.model || ''
    };
  }
}
