const DEFAULT_BASE_URL = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://localhost:3000';

function normalizeBaseUrl(value) {
  if (!value) return DEFAULT_BASE_URL;
  return value.replace(/\/$/, '');
}

export class FashionApi {
  constructor(baseUrl = null) {
    this.baseUrl = normalizeBaseUrl(baseUrl || localStorage.getItem('fashion-api-base') || DEFAULT_BASE_URL);
  }

  setBaseUrl(baseUrl) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    localStorage.setItem('fashion-api-base', this.baseUrl);
  }

  getToken() {
    return localStorage.getItem('fashion-token');
  }

  setToken(token) {
    if (!token) {
      localStorage.removeItem('fashion-token');
      return;
    }
    localStorage.setItem('fashion-token', token);
  }

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async request(path, { method = 'GET', body, headers = {}, multipart = false } = {}) {
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
      const message = payload?.error || payload?.message || `Request failed with status ${response.status}`;
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

  register(data) {
    return this.request('/api/auth/register', { method: 'POST', body: data });
  }

  login(data) {
    return this.request('/api/auth/login', { method: 'POST', body: data });
  }

  me() {
    return this.request('/api/auth/me');
  }

  profile() {
    return this.request('/api/profile');
  }

  updateProfilePhoto(file) {
    const form = new FormData();
    form.append('photo', file);
    return this.request('/api/profile/photo', { method: 'POST', body: form, multipart: true });
  }

  removeProfilePhoto() {
    return this.request('/api/profile/photo', { method: 'DELETE' });
  }

  wardrobe(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.search) query.set('search', params.search);
    if (params.filter) query.set('filter', JSON.stringify(params.filter));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/wardrobe${suffix}`);
  }

  wardrobeStats() {
    return this.request('/api/wardrobe/stats');
  }

  addWardrobeItems(files) {
    const form = new FormData();
    Array.from(files).forEach((file) => form.append('images', file));
    return this.request('/api/wardrobe', { method: 'POST', body: form, multipart: true });
  }

  chat(payload) {
    return this.request('/api/ai/chat', { method: 'POST', body: payload });
  }

  analyzeImage(file) {
    const form = new FormData();
    form.append('image', file);
    return this.request('/api/ai/analyze-image', { method: 'POST', body: form, multipart: true });
  }

  recommendations(payload) {
    return this.request('/api/ai/recommendations', { method: 'POST', body: payload });
  }

  tryOn(garmentFile, userPhotoFileOrBase64) {
    const form = new FormData();
    form.append('image', garmentFile);
    if (userPhotoFileOrBase64 instanceof File) {
      form.append('userPhoto', userPhotoFileOrBase64);
    } else if (typeof userPhotoFileOrBase64 === 'string' && userPhotoFileOrBase64) {
      form.append('userPhotoBase64', userPhotoFileOrBase64);
    }
    return this.request('/api/ai/try-on', { method: 'POST', body: form, multipart: true });
  }
}